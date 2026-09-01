from datetime import date, datetime, timezone
from typing import List, Optional
import uuid

from app.schemas.composite import (
    BidMetadata,
    CompositeVerificationRequest,
    CompositeVerificationResponse,
    EntitySource,
    EvidenceItem,
    ExtractedEntitiesSummary,
    ExtractedEntityItem,
    StatutoryVerificationsBundle,
)
from app.schemas.statutory import (
    GSTINValidationRequest,
    GSTINValidationResponse,
    MOCK_REGISTRY_DISCLAIMER,
    OEMValidationRequest,
    OEMValidationResponse,
    PANValidationRequest,
    PANValidationResponse,
    UdyamValidationRequest,
    UdyamValidationResponse,
)
from app.services.compliance.cross_consistency import (
    CrossConsistencyEngine,
    cross_consistency_engine,
)
from app.services.compliance.extractor import (
    DocumentEntityExtractor,
    document_entity_extractor,
)
from app.services.compliance.scoring_engine import (
    ComplianceScoringEngine,
    compliance_scoring_engine,
)
from app.services.compliance.statutory_service import (
    StatutoryValidationService,
    statutory_service,
)


class CompositeVerificationService:
    """
    Orchestrates end-to-end composite compliance intelligence:
    1. Extracts candidate entities from document evidence (Task 2).
    2. Reconciles user-supplied inputs with extracted candidates.
    3. Runs individual statutory validation & lookup (Task 3A).
    4. Evaluates multi-entity relational consistency (Rules R-01 to R-07).
    5. Computes explainable risk scores and findings.
    6. Assembles traceable audit trail with source citations.
    """

    def __init__(
        self,
        extractor: Optional[DocumentEntityExtractor] = None,
        statutory_svc: Optional[StatutoryValidationService] = None,
        consistency_eng: Optional[CrossConsistencyEngine] = None,
        scoring_eng: Optional[ComplianceScoringEngine] = None,
    ):
        self.extractor = extractor or document_entity_extractor
        self.statutory_service = statutory_svc or statutory_service
        self.consistency_engine = consistency_eng or cross_consistency_engine
        self.scoring_engine = scoring_eng or compliance_scoring_engine

    async def verify_composite(
        self, request: CompositeVerificationRequest
    ) -> CompositeVerificationResponse:
        """Execute full composite compliance intelligence workflow."""
        verification_id = f"ver_{uuid.uuid4().hex[:12]}"

        # Step 1: Extract entities from documents if provided
        extracted_summary = ExtractedEntitiesSummary()
        all_candidate_entities: List[ExtractedEntityItem] = []

        if request.documents:
            extracted_summary = self.extractor.extract_from_documents(request.documents)
            for cand_list in [
                extracted_summary.gstin_candidates,
                extracted_summary.pan_candidates,
                extracted_summary.udyam_candidates,
                extracted_summary.legal_name_candidates,
                extracted_summary.oem_name_candidates,
                extracted_summary.maf_number_candidates,
                extracted_summary.tender_ref_candidates,
                extracted_summary.date_candidates,
            ]:
                all_candidate_entities.extend(cand_list)

        # Step 2: Dynamically resolve Bid Metadata if not provided or partially provided
        resolved_metadata = request.bid_metadata or BidMetadata()
        if not resolved_metadata.expected_bidder_name and extracted_summary.legal_name_candidates:
            best_legal = max(extracted_summary.legal_name_candidates, key=lambda x: x.confidence)
            resolved_metadata.expected_bidder_name = best_legal.value

        if not resolved_metadata.tender_ref_number and extracted_summary.tender_ref_candidates:
            best_tender = max(extracted_summary.tender_ref_candidates, key=lambda x: x.confidence)
            resolved_metadata.tender_ref_number = best_tender.value

        # Step 3: Resolve Statutory Requests (Explicit user inputs take precedence; fallback to extracted)
        gstin_req = request.explicit_gstin
        if not gstin_req and extracted_summary.gstin_candidates:
            best_gstin = max(extracted_summary.gstin_candidates, key=lambda x: x.confidence).value
            gstin_req = GSTINValidationRequest(
                gstin=best_gstin,
                expected_legal_name=resolved_metadata.expected_bidder_name,
                expected_state_code=resolved_metadata.tender_state_code,
            )

        pan_req = request.explicit_pan
        if not pan_req and extracted_summary.pan_candidates:
            best_pan = max(extracted_summary.pan_candidates, key=lambda x: x.confidence).value
            pan_req = PANValidationRequest(
                pan=best_pan,
                expected_legal_name=resolved_metadata.expected_bidder_name,
            )

        udyam_req = request.explicit_udyam
        if not udyam_req and extracted_summary.udyam_candidates:
            best_udyam = max(extracted_summary.udyam_candidates, key=lambda x: x.confidence).value
            udyam_req = UdyamValidationRequest(
                udyam_registration_number=best_udyam,
                expected_enterprise_name=resolved_metadata.expected_bidder_name,
            )

        oem_req = request.explicit_oem
        if not oem_req and extracted_summary.oem_name_candidates:
            oem_name = extracted_summary.oem_name_candidates[0].value
            partner_name = (
                resolved_metadata.expected_bidder_name
                if resolved_metadata.expected_bidder_name
                else (extracted_summary.legal_name_candidates[0].value if extracted_summary.legal_name_candidates else "Unknown Partner")
            )
            maf_num = (
                extracted_summary.maf_number_candidates[0].value
                if extracted_summary.maf_number_candidates
                else None
            )
            tender_num = (
                resolved_metadata.tender_ref_number
                if resolved_metadata.tender_ref_number
                else (extracted_summary.tender_ref_candidates[0].value if extracted_summary.tender_ref_candidates else None)
            )

            v_from = None
            v_until = None
            if len(extracted_summary.date_candidates) >= 2:
                v_from = extracted_summary.date_candidates[0].value
                v_until = extracted_summary.date_candidates[1].value

            oem_req = OEMValidationRequest(
                oem_name=oem_name,
                authorized_partner_name=partner_name,
                maf_number=maf_num,
                tender_ref_number=tender_num,
                valid_from=v_from,
                valid_until=v_until,
            )

        # Step 4: Run Individual Statutory Verifications (Task 3A)
        gstin_resp: Optional[GSTINValidationResponse] = None
        pan_resp: Optional[PANValidationResponse] = None
        udyam_resp: Optional[UdyamValidationResponse] = None
        oem_resp: Optional[OEMValidationResponse] = None

        if gstin_req:
            gstin_resp = await self.statutory_service.validate_gstin(gstin_req)
        if pan_req:
            pan_resp = await self.statutory_service.validate_pan(pan_req)
        elif gstin_resp and gstin_resp.deterministic.extracted_pan:
            # Fallback to validating the PAN extracted from the validated GSTIN
            pan_resp = await self.statutory_service.validate_pan(
                PANValidationRequest(
                    pan=gstin_resp.deterministic.extracted_pan,
                    expected_legal_name=resolved_metadata.expected_bidder_name,
                )
            )

        if udyam_req:
            udyam_resp = await self.statutory_service.validate_udyam(udyam_req)
        if oem_req:
            oem_resp = await self.statutory_service.validate_oem(oem_req)

        statutory_bundle = StatutoryVerificationsBundle(
            gstin=gstin_resp,
            pan=pan_resp,
            udyam=udyam_resp,
            oem=oem_resp,
        )

        # Step 5: Run Cross-Entity Consistency Checks (Rules R-01 through R-07)
        consistency_results = self.consistency_engine.evaluate_all(
            gstin_resp=gstin_resp,
            pan_resp=pan_resp,
            udyam_resp=udyam_resp,
            oem_resp=oem_resp,
            bid_metadata=resolved_metadata,
            candidate_entities=all_candidate_entities,
        )

        # Step 6: Run Explainable Scoring Engine
        (
            overall_score,
            risk_level,
            risk_guidance,
            composite_status,
            score_breakdown,
            findings,
        ) = self.scoring_engine.calculate_score(
            gstin_resp=gstin_resp,
            pan_resp=pan_resp,
            udyam_resp=udyam_resp,
            oem_resp=oem_resp,
            consistency_results=consistency_results,
            policy=request.scoring_policy,
        )

        # Step 7: Assemble Complete Evidence Audit Trail & Enrich Findings
        audit_trail: List[EvidenceItem] = []
        for check in consistency_results:
            audit_trail.extend(check.evidence)

        # Also add document extracted entities as traceability items in audit trail
        for item in all_candidate_entities:
            audit_trail.append(
                EvidenceItem(
                    evidence_id=f"ev_ext_{uuid.uuid4().hex[:6]}",
                    rule_id="DOC_EXTRACTION",
                    field_name=item.entity_type.value,
                    extracted_value=item.value,
                    document_id=item.document_id,
                    filename=item.filename,
                    page_number=item.page_number,
                    context_snippet=item.context_snippet,
                    source_type=EntitySource.DOCUMENT_EXTRACTED,
                    finding_description=f"Extracted {item.entity_type.value} '{item.value}' from page {item.page_number} (Confidence: {item.confidence:.0%}).",
                )
            )

        # Enrich any findings and score contributions without linked evidence with matching audit trail items
        for f in findings:
            if not f.linked_evidence:
                matching_ev = [
                    ev for ev in audit_trail
                    if ev.rule_id == f.rule_id
                    or (f.rule_id.startswith("STAT-GST") and ev.field_name.upper() == "GSTIN")
                    or (f.rule_id.startswith("STAT-PAN") and ev.field_name.upper() == "PAN")
                    or (f.rule_id.startswith("STAT-UDYAM") and ev.field_name.upper() == "UDYAM")
                    or (f.rule_id.startswith("STAT-OEM") and ev.field_name.upper() in ["OEM_NAME", "MAF_NUMBER"])
                ]
                if matching_ev:
                    f.linked_evidence = matching_ev[:2]

        for sc in score_breakdown:
            if not sc.linked_evidence:
                matching_ev = [
                    ev for ev in audit_trail
                    if ev.rule_id == sc.rule_id
                    or (sc.rule_id.startswith("STAT-GST") and ev.field_name.upper() == "GSTIN")
                    or (sc.rule_id.startswith("STAT-PAN") and ev.field_name.upper() == "PAN")
                    or (sc.rule_id.startswith("STAT-UDYAM") and ev.field_name.upper() == "UDYAM")
                    or (sc.rule_id.startswith("STAT-OEM") and ev.field_name.upper() in ["OEM_NAME", "MAF_NUMBER"])
                ]
                if matching_ev:
                    sc.linked_evidence = matching_ev[:2]

        return CompositeVerificationResponse(
            verification_id=verification_id,
            timestamp=datetime.now(timezone.utc),
            overall_score=overall_score,
            risk_level=risk_level,
            risk_level_guidance=risk_guidance,
            overall_status=composite_status,
            extracted_entities=extracted_summary,
            statutory_verifications=statutory_bundle,
            consistency_checks=consistency_results,
            score_breakdown=score_breakdown,
            findings=findings,
            evidence_audit_trail=audit_trail,
            is_live_government_source=False,
            disclaimer=MOCK_REGISTRY_DISCLAIMER,
        )


# Global singleton instance
composite_verification_service = CompositeVerificationService()
