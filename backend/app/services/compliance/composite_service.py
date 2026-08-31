from datetime import date, datetime, timezone
from typing import List, Optional
import uuid

from app.schemas.composite import (
    BidMetadata,
    CompositeVerificationRequest,
    CompositeVerificationResponse,
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

        # Step 2: Resolve Statutory Requests (Explicit user inputs take precedence; fallback to extracted)
        gstin_req = request.explicit_gstin
        if not gstin_req and extracted_summary.gstin_candidates:
            best_gstin = extracted_summary.gstin_candidates[0].value
            gstin_req = GSTINValidationRequest(gstin=best_gstin)

        pan_req = request.explicit_pan
        if not pan_req and extracted_summary.pan_candidates:
            best_pan = extracted_summary.pan_candidates[0].value
            pan_req = PANValidationRequest(pan=best_pan)

        udyam_req = request.explicit_udyam
        if not udyam_req and extracted_summary.udyam_candidates:
            best_udyam = extracted_summary.udyam_candidates[0].value
            udyam_req = UdyamValidationRequest(udyam_registration_number=best_udyam)

        oem_req = request.explicit_oem
        if not oem_req and extracted_summary.oem_name_candidates:
            oem_name = extracted_summary.oem_name_candidates[0].value
            partner_name = (
                request.bid_metadata.expected_bidder_name
                if request.bid_metadata and request.bid_metadata.expected_bidder_name
                else (extracted_summary.legal_name_candidates[0].value if extracted_summary.legal_name_candidates else "Unknown Partner")
            )
            maf_num = (
                extracted_summary.maf_number_candidates[0].value
                if extracted_summary.maf_number_candidates
                else None
            )
            oem_req = OEMValidationRequest(
                oem_name=oem_name,
                authorized_partner_name=partner_name,
                maf_number=maf_num,
            )

        # Step 3: Run Individual Statutory Verifications (Task 3A)
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
                PANValidationRequest(pan=gstin_resp.deterministic.extracted_pan)
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

        # Step 4: Run Cross-Entity Consistency Checks (Rules R-01 through R-07)
        consistency_results = self.consistency_engine.evaluate_all(
            gstin_resp=gstin_resp,
            pan_resp=pan_resp,
            udyam_resp=udyam_resp,
            oem_resp=oem_resp,
            bid_metadata=request.bid_metadata,
            candidate_entities=all_candidate_entities,
        )

        # Step 5: Run Explainable Scoring Engine
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

        # Step 6: Assemble Complete Evidence Audit Trail
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
                    finding_description=f"Extracted {item.entity_type.value} '{item.value}' from page {item.page_number} (Confidence: {item.confidence:.0%}).",
                )
            )

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
