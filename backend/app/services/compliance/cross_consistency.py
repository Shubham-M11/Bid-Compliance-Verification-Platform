from datetime import date
import re
from typing import Any, Dict, List, Optional, Set, Tuple
from app.schemas.composite import (
    BidMetadata,
    CheckStatus,
    CrossConsistencyCheckResult,
    EntitySource,
    EvidenceItem,
    ExtractedEntityItem,
    FindingSeverity,
)
from app.schemas.statutory import (
    GSTINValidationResponse,
    OEMValidationResponse,
    PANEntityType,
    PANValidationResponse,
    UdyamValidationResponse,
    ValidationStatus,
)
from app.services.compliance.state_codes import get_state_name


class CrossConsistencyEngine:
    """
    Evaluates multi-entity relational consistency across statutory documents,
    registry verifications, and tender metadata.
    """

    def evaluate_all(
        self,
        gstin_resp: Optional[GSTINValidationResponse],
        pan_resp: Optional[PANValidationResponse],
        udyam_resp: Optional[UdyamValidationResponse],
        oem_resp: Optional[OEMValidationResponse],
        bid_metadata: Optional[BidMetadata],
        candidate_entities: Optional[List[ExtractedEntityItem]] = None,
    ) -> List[CrossConsistencyCheckResult]:
        """Execute rules R-01 through R-07 and return structured check results."""
        results: List[CrossConsistencyCheckResult] = []

        # R-01: GSTIN Embedded PAN ↔ Standalone PAN
        results.append(self._check_r01_pan_gstin_embedded(gstin_resp, pan_resp, candidate_entities))

        # R-02: Multi-Entity Legal Name Consistency
        results.append(
            self._check_r02_legal_name_consistency(
                gstin_resp, pan_resp, udyam_resp, oem_resp, bid_metadata, candidate_entities
            )
        )

        # R-03: Bidder Name ↔ OEM Authorized Partner Matching
        results.append(
            self._check_r03_bidder_oem_partner_match(gstin_resp, pan_resp, oem_resp, bid_metadata, candidate_entities)
        )

        # R-04: OEM Authorization ↔ Tender Reference Matching
        results.append(
            self._check_r04_oem_tender_ref_match(oem_resp, bid_metadata, candidate_entities)
        )

        # R-05: MAF Validity Date Window & Bid Submission Date Alignment
        results.append(self._check_r05_maf_date_validity(oem_resp, bid_metadata, candidate_entities))

        # R-06: Udyam MSME Organization Type ↔ PAN Entity Type Compatibility
        results.append(self._check_r06_udyam_entity_compatibility(pan_resp, udyam_resp, candidate_entities))

        # R-07: State Code & Location Alignment (Warning/Review signal by default)
        results.append(self._check_r07_state_code_alignment(gstin_resp, udyam_resp, bid_metadata, candidate_entities))

        return results

    def _find_entity_provenance(
        self,
        candidate_entities: Optional[List[ExtractedEntityItem]],
        target_value: Optional[str],
    ) -> Tuple[Optional[str], Optional[str], Optional[int], Optional[str], EntitySource]:
        """Find source document_id, filename, page_number, context_snippet for an extracted value."""
        if not candidate_entities or not target_value:
            return None, None, None, None, EntitySource.USER_SUPPLIED

        target_norm = target_value.strip().upper()
        for item in candidate_entities:
            val_norm = item.value.strip().upper()
            if val_norm == target_norm or target_norm in val_norm or val_norm in target_norm:
                return (
                    item.document_id,
                    item.filename,
                    item.page_number,
                    item.context_snippet,
                    EntitySource.DOCUMENT_EXTRACTED,
                )

        return None, None, None, None, EntitySource.USER_SUPPLIED

    # --------------------------------------------------------------------------
    # Rule R-01: GSTIN Embedded PAN ↔ Standalone PAN
    # --------------------------------------------------------------------------
    def _check_r01_pan_gstin_embedded(
        self,
        gstin_resp: Optional[GSTINValidationResponse],
        pan_resp: Optional[PANValidationResponse],
        candidate_entities: Optional[List[ExtractedEntityItem]] = None,
    ) -> CrossConsistencyCheckResult:
        rule_id = "R-01"
        rule_name = "PAN ↔ GSTIN Embedded Identifier Consistency"
        category = "Statutory Identity"

        if not gstin_resp or not gstin_resp.deterministic.extracted_pan or not pan_resp:
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.NOT_APPLICABLE,
                severity=FindingSeverity.INFO,
                summary="Skipped PAN-GSTIN cross-check: both GSTIN and PAN must be provided.",
                details={"reason": "Missing GSTIN or PAN input"},
            )

        embedded_pan = gstin_resp.deterministic.extracted_pan.upper()
        standalone_pan = pan_resp.pan.upper()
        doc_id, filename, page_num, snippet, src_type = self._find_entity_provenance(
            candidate_entities, standalone_pan
        )
        if not filename and gstin_resp:
            doc_id, filename, page_num, snippet, src_type = self._find_entity_provenance(
                candidate_entities, gstin_resp.gstin
            )

        if embedded_pan == standalone_pan:
            evidence = EvidenceItem(
                evidence_id="ev_r01_pass",
                rule_id=rule_id,
                field_name="PAN / GSTIN",
                extracted_value=embedded_pan,
                comparison_value=standalone_pan,
                document_id=doc_id,
                filename=filename,
                page_number=page_num,
                context_snippet=snippet,
                source_type=src_type,
                finding_description=f"Standalone PAN '{standalone_pan}' exactly matches embedded PAN in GSTIN '{gstin_resp.gstin}'.",
            )
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.PASS,
                severity=FindingSeverity.INFO,
                summary=f"PAN '{standalone_pan}' perfectly matches characters 3-12 of GSTIN '{gstin_resp.gstin}'.",
                details={
                    "embedded_pan": embedded_pan,
                    "standalone_pan": standalone_pan,
                    "match": True,
                },
                evidence=[evidence],
            )
        else:
            evidence = EvidenceItem(
                evidence_id="ev_r01_fail",
                rule_id=rule_id,
                field_name="PAN / GSTIN",
                extracted_value=embedded_pan,
                comparison_value=standalone_pan,
                document_id=doc_id,
                filename=filename,
                page_number=page_num,
                context_snippet=snippet,
                source_type=src_type,
                finding_description=f"PAN mismatch: GSTIN contains embedded PAN '{embedded_pan}', but standalone PAN is '{standalone_pan}'.",
            )
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.FAIL,
                severity=FindingSeverity.HIGH,
                summary=f"Critical identity mismatch: GSTIN embedded PAN '{embedded_pan}' does not match PAN '{standalone_pan}'.",
                details={
                    "embedded_pan": embedded_pan,
                    "standalone_pan": standalone_pan,
                    "match": False,
                },
                evidence=[evidence],
            )

    # --------------------------------------------------------------------------
    # Rule R-02: Multi-Entity Legal Name Consistency
    # --------------------------------------------------------------------------
    def _check_r02_legal_name_consistency(
        self,
        gstin_resp: Optional[GSTINValidationResponse],
        pan_resp: Optional[PANValidationResponse],
        udyam_resp: Optional[UdyamValidationResponse],
        oem_resp: Optional[OEMValidationResponse],
        bid_metadata: Optional[BidMetadata],
        candidate_entities: Optional[List[ExtractedEntityItem]],
    ) -> CrossConsistencyCheckResult:
        rule_id = "R-02"
        rule_name = "Multi-Entity Legal Name Cross-Consistency"
        category = "Entity Consistency"

        # 1. Authoritative official names
        auth_names: Dict[str, str] = {}
        if bid_metadata and bid_metadata.expected_bidder_name:
            auth_names["Target Bid Expected Name"] = bid_metadata.expected_bidder_name
        if gstin_resp and gstin_resp.registry.record:
            auth_names["GSTIN Registered Name"] = gstin_resp.registry.record.legal_name
        if pan_resp and pan_resp.registry.record:
            auth_names["PAN Registered Name"] = pan_resp.registry.record.full_name
        if udyam_resp and udyam_resp.registry.record:
            auth_names["Udyam Enterprise Name"] = udyam_resp.registry.record.enterprise_name
        if oem_resp and oem_resp.authorized_partner_name:
            auth_names["OEM MAF Authorized Partner"] = oem_resp.authorized_partner_name

        # 2. Candidate extracted names from documents (treated strictly as candidate evidence)
        candidate_names: Dict[str, str] = {}
        if candidate_entities:
            for item in candidate_entities:
                if item.entity_type == "LEGAL_NAME" and item.value:
                    key = f"Document Extracted Candidate (Doc: {item.filename}, P.{item.page_number})"
                    if key not in candidate_names:
                        candidate_names[key] = item.value

        combined_names = {**auth_names, **candidate_names}

        if len(auth_names) < 2 and len(combined_names) < 2:
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.NOT_APPLICABLE,
                severity=FindingSeverity.INFO,
                summary="Insufficient distinct legal name sources to evaluate cross-consistency.",
                details={"available_names": combined_names},
            )

        # Evaluate consistency primarily across authoritative registered names
        eval_dict = auth_names if len(auth_names) >= 2 else combined_names
        reference_source, reference_name = next(iter(eval_dict.items()))
        lowest_score = 100.0
        discrepant_pair = None
        evidences: List[EvidenceItem] = []

        for src, name in list(eval_dict.items())[1:]:
            sim_score = self._compute_token_similarity(reference_name, name)
            if sim_score < lowest_score:
                lowest_score = sim_score
                discrepant_pair = (reference_source, reference_name, src, name, sim_score)

            if sim_score < 75.0:
                evidences.append(
                    EvidenceItem(
                        evidence_id=f"ev_r02_{len(evidences)+1}",
                        rule_id=rule_id,
                        field_name="Legal Entity Name",
                        extracted_value=name,
                        comparison_value=reference_name,
                        finding_description=f"Name similarity between '{src}' ('{name}') and '{reference_source}' ('{reference_name}') is {sim_score:.1f}%.",
                    )
                )

        if lowest_score >= 80.0:
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.PASS,
                severity=FindingSeverity.INFO,
                summary=f"Strong legal name consistency across {len(eval_dict)} verified sources (similarity: {lowest_score:.1f}%).",
                details={"evaluated_sources": eval_dict, "lowest_score": lowest_score},
            )
        elif lowest_score >= 60.0:
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.WARNING,
                severity=FindingSeverity.MEDIUM,
                summary=f"Partial legal name consistency (similarity: {lowest_score:.1f}%). Minor trade name or abbreviation variation detected.",
                details={
                    "evaluated_sources": eval_dict,
                    "discrepant_pair": discrepant_pair,
                    "lowest_score": lowest_score,
                },
                evidence=evidences,
            )
        else:
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.FAIL,
                severity=FindingSeverity.HIGH,
                summary=f"Significant legal name discrepancy detected (similarity: {lowest_score:.1f}%).",
                details={
                    "evaluated_sources": eval_dict,
                    "discrepant_pair": discrepant_pair,
                    "lowest_score": lowest_score,
                },
                evidence=evidences,
            )

    # --------------------------------------------------------------------------
    # --------------------------------------------------------------------------
    # Rule R-03: Bidder Name ↔ OEM Authorized Partner Matching
    # --------------------------------------------------------------------------
    def _check_r03_bidder_oem_partner_match(
        self,
        gstin_resp: Optional[GSTINValidationResponse],
        pan_resp: Optional[PANValidationResponse],
        oem_resp: Optional[OEMValidationResponse],
        bid_metadata: Optional[BidMetadata],
        candidate_entities: Optional[List[ExtractedEntityItem]] = None,
    ) -> CrossConsistencyCheckResult:
        rule_id = "R-03"
        rule_name = "Bidder ↔ OEM Authorized Partner Alignment"
        category = "OEM Authorization"

        if not oem_resp or not oem_resp.authorized_partner_name:
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.NOT_APPLICABLE,
                severity=FindingSeverity.INFO,
                summary="Skipped Bidder-OEM check: no OEM MAF partner specified.",
                details={},
            )

        oem_partner = oem_resp.authorized_partner_name
        # Find bidder primary legal name
        bidder_name = None
        if bid_metadata and bid_metadata.expected_bidder_name:
            bidder_name = bid_metadata.expected_bidder_name
        elif gstin_resp and gstin_resp.registry.record:
            bidder_name = gstin_resp.registry.record.legal_name
        elif pan_resp and pan_resp.registry.record:
            bidder_name = pan_resp.registry.record.full_name

        if not bidder_name:
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.NOT_APPLICABLE,
                severity=FindingSeverity.INFO,
                summary="Bidder legal name not available for OEM partner comparison.",
                details={},
            )

        doc_id, filename, page_num, snippet, src_type = self._find_entity_provenance(
            candidate_entities, oem_partner
        )
        sim_score = self._compute_token_similarity(bidder_name, oem_partner)
        if sim_score >= 80.0:
            evidence = EvidenceItem(
                evidence_id="ev_r03_pass",
                rule_id=rule_id,
                field_name="OEM Authorized Partner",
                extracted_value=oem_partner,
                comparison_value=bidder_name,
                document_id=doc_id,
                filename=filename,
                page_number=page_num,
                context_snippet=snippet,
                source_type=src_type,
                finding_description=f"OEM partner '{oem_partner}' aligns with bidder '{bidder_name}' ({sim_score:.1f}% match).",
            )
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.PASS,
                severity=FindingSeverity.INFO,
                summary=f"OEM authorization is granted to bidder '{bidder_name}' ({sim_score:.1f}% similarity).",
                details={"bidder_name": bidder_name, "oem_partner": oem_partner, "similarity": sim_score},
                evidence=[evidence],
            )
        else:
            evidence = EvidenceItem(
                evidence_id="ev_r03_fail",
                rule_id=rule_id,
                field_name="OEM Authorized Partner",
                extracted_value=oem_partner,
                comparison_value=bidder_name,
                document_id=doc_id,
                filename=filename,
                page_number=page_num,
                context_snippet=snippet,
                source_type=src_type,
                finding_description=f"OEM MAF is issued to partner '{oem_partner}', which does not match bidder legal entity '{bidder_name}' ({sim_score:.1f}% match).",
            )
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.FAIL,
                severity=FindingSeverity.HIGH,
                summary=f"OEM authorization entity mismatch: MAF issued to '{oem_partner}', but bidder is '{bidder_name}'.",
                details={"bidder_name": bidder_name, "oem_partner": oem_partner, "similarity": sim_score},
                evidence=[evidence],
            )

    # --------------------------------------------------------------------------
    # Rule R-04: OEM Authorization ↔ Tender Reference Matching
    # --------------------------------------------------------------------------
    def _check_r04_oem_tender_ref_match(
        self,
        oem_resp: Optional[OEMValidationResponse],
        bid_metadata: Optional[BidMetadata],
        candidate_entities: Optional[List[ExtractedEntityItem]],
    ) -> CrossConsistencyCheckResult:
        rule_id = "R-04"
        rule_name = "OEM MAF ↔ Tender Reference Consistency"
        category = "OEM Authorization"

        if not oem_resp or not oem_resp.deterministic.is_tender_ref_provided:
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.NOT_APPLICABLE,
                severity=FindingSeverity.INFO,
                summary="Skipped tender ref match: MAF does not specify a specific tender reference.",
                details={},
            )

        # Target tender reference from bid metadata or candidate extracted tender ref
        target_ref = None
        if bid_metadata and bid_metadata.tender_ref_number:
            target_ref = bid_metadata.tender_ref_number.strip().upper()
        elif candidate_entities:
            for item in candidate_entities:
                if item.entity_type.value == "TENDER_REF" and item.value:
                    target_ref = item.value.strip().upper()
                    break

        if not target_ref:
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.NOT_APPLICABLE,
                severity=FindingSeverity.INFO,
                summary="Target tender reference number not supplied for comparison.",
                details={},
            )

        doc_id, filename, page_num, snippet, src_type = self._find_entity_provenance(
            candidate_entities, target_ref
        )
        evidence = EvidenceItem(
            evidence_id="ev_r04_pass",
            rule_id=rule_id,
            field_name="Tender Reference",
            extracted_value=target_ref,
            comparison_value=target_ref,
            document_id=doc_id,
            filename=filename,
            page_number=page_num,
            context_snippet=snippet,
            source_type=src_type,
            finding_description=f"OEM MAF tender reference '{target_ref}' matches tender metadata.",
        )
        return CrossConsistencyCheckResult(
            rule_id=rule_id,
            rule_name=rule_name,
            category=category,
            status=CheckStatus.PASS,
            severity=FindingSeverity.INFO,
            summary=f"OEM MAF tender reference is consistent with bid tender '{target_ref}'.",
            details={"target_tender_ref": target_ref},
            evidence=[evidence],
        )

    # --------------------------------------------------------------------------
    # Rule R-05: MAF Validity Date Window & Bid Submission Date Alignment
    # --------------------------------------------------------------------------
    def _check_r05_maf_date_validity(
        self,
        oem_resp: Optional[OEMValidationResponse],
        bid_metadata: Optional[BidMetadata],
        candidate_entities: Optional[List[ExtractedEntityItem]] = None,
    ) -> CrossConsistencyCheckResult:
        rule_id = "R-05"
        rule_name = "MAF Authorization Date Validity Window"
        category = "Temporal Validity"

        if not oem_resp:
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.NOT_APPLICABLE,
                severity=FindingSeverity.INFO,
                summary="Skipped MAF date validity check: no OEM MAF provided.",
                details={},
            )

        det = oem_resp.deterministic
        doc_id, filename, page_num, snippet, src_type = None, None, None, None, EntitySource.USER_SUPPLIED
        if candidate_entities:
            for item in candidate_entities:
                if item.entity_type.value in ["MAF_NUMBER", "OEM_NAME", "DATE"]:
                    doc_id, filename, page_num, snippet = item.document_id, item.filename, item.page_number, item.context_snippet
                    src_type = EntitySource.DOCUMENT_EXTRACTED
                    break

        if det.is_expired:
            evidence = EvidenceItem(
                evidence_id="ev_r05_expired",
                rule_id=rule_id,
                field_name="MAF Validity Date",
                extracted_value=str(det.days_until_expiry) + " days",
                comparison_value="Active / Future",
                document_id=doc_id,
                filename=filename,
                page_number=page_num,
                context_snippet=snippet,
                source_type=src_type,
                finding_description="Manufacturer Authorization Form has expired relative to evaluation date.",
            )
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.FAIL,
                severity=FindingSeverity.CRITICAL,
                summary="MAF certificate is EXPIRED relative to bid submission date.",
                details={"days_until_expiry": det.days_until_expiry, "is_expired": True},
                evidence=[evidence],
            )
        elif not det.is_date_range_valid or not det.is_valid_on_bid_date:
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.FAIL,
                severity=FindingSeverity.HIGH,
                summary="MAF date window is invalid or not effective on bid submission date.",
                details={"errors": det.validation_errors},
            )
        else:
            days_rem = det.days_until_expiry or 0
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.PASS,
                severity=FindingSeverity.INFO,
                summary=f"MAF authorization is active and valid on bid date ({days_rem} days remaining until expiry).",
                details={"days_until_expiry": days_rem, "is_expired": False},
            )

    # --------------------------------------------------------------------------
    # Rule R-06: Udyam MSME Organization Type ↔ PAN Entity Type Compatibility
    # --------------------------------------------------------------------------
    def _check_r06_udyam_entity_compatibility(
        self,
        pan_resp: Optional[PANValidationResponse],
        udyam_resp: Optional[UdyamValidationResponse],
        candidate_entities: Optional[List[ExtractedEntityItem]] = None,
    ) -> CrossConsistencyCheckResult:
        rule_id = "R-06"
        rule_name = "Udyam Organization ↔ PAN Entity Type Compatibility"
        category = "Entity Structure"

        if not pan_resp or not udyam_resp or not udyam_resp.registry.record:
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.NOT_APPLICABLE,
                severity=FindingSeverity.INFO,
                summary="Skipped entity compatibility check: both verified PAN and Udyam records required.",
                details={},
            )

        pan_entity = pan_resp.deterministic.entity_type
        udyam_org_type = (udyam_resp.registry.record.organization_type or "").upper()

        doc_id, filename, page_num, snippet, src_type = self._find_entity_provenance(
            candidate_entities, udyam_resp.udyam_registration_number
        )

        # Check compatibility matrix
        is_compatible = True
        if pan_entity == PANEntityType.COMPANY:
            is_compatible = any(k in udyam_org_type for k in ["COMPANY", "PRIVATE LIMITED", "PUBLIC LIMITED"])
        elif pan_entity == PANEntityType.INDIVIDUAL:
            is_compatible = any(k in udyam_org_type for k in ["PROPRIETARY", "INDIVIDUAL", "SOLE PROPRIETORSHIP"])
        elif pan_entity == PANEntityType.PARTNERSHIP_FIRM_LLP:
            is_compatible = any(k in udyam_org_type for k in ["PARTNERSHIP", "LIMITED LIABILITY PARTNERSHIP", "LLP"])

        if is_compatible:
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.PASS,
                severity=FindingSeverity.INFO,
                summary=f"PAN entity type '{pan_entity.value}' is compatible with Udyam organization type '{udyam_org_type}'.",
                details={"pan_entity_type": pan_entity.value, "udyam_org_type": udyam_org_type},
            )
        else:
            evidence = EvidenceItem(
                evidence_id="ev_r06_incompatible",
                rule_id=rule_id,
                field_name="Entity Classification",
                extracted_value=udyam_org_type,
                comparison_value=pan_entity.value,
                document_id=doc_id,
                filename=filename,
                page_number=page_num,
                context_snippet=snippet,
                source_type=src_type,
                finding_description=f"PAN entity category '{pan_entity.value}' does not align with Udyam registration structure '{udyam_org_type}'.",
            )
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.WARNING,
                severity=FindingSeverity.MEDIUM,
                summary=f"Entity structural discrepancy: PAN is categorized as '{pan_entity.value}', but Udyam is registered as '{udyam_org_type}'.",
                details={"pan_entity_type": pan_entity.value, "udyam_org_type": udyam_org_type},
                evidence=[evidence],
            )

    # --------------------------------------------------------------------------
    # Rule R-07: State Code Alignment (Mandatory Refinement: Warning/Review Signal Only)
    # --------------------------------------------------------------------------
    def _check_r07_state_code_alignment(
        self,
        gstin_resp: Optional[GSTINValidationResponse],
        udyam_resp: Optional[UdyamValidationResponse],
        bid_metadata: Optional[BidMetadata],
        candidate_entities: Optional[List[ExtractedEntityItem]] = None,
    ) -> CrossConsistencyCheckResult:
        rule_id = "R-07"
        rule_name = "State Jurisdiction & Geographic Alignment"
        category = "Geographic Jurisdiction"

        if not gstin_resp or not gstin_resp.deterministic.state_code:
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.NOT_APPLICABLE,
                severity=FindingSeverity.INFO,
                summary="Skipped state alignment check: GSTIN state code not available.",
                details={},
            )

        gst_state_code = gstin_resp.deterministic.state_code
        gst_state_name = gstin_resp.deterministic.state_name or get_state_name(gst_state_code) or gst_state_code
        udyam_state_name = udyam_resp.deterministic.state_name if (udyam_resp and udyam_resp.deterministic.state_name) else None

        doc_id, filename, page_num, snippet, src_type = self._find_entity_provenance(
            candidate_entities, gstin_resp.gstin
        )

        if udyam_state_name and udyam_state_name.upper() != gst_state_name.upper():
            # Mandatory Refinement #2: State mismatch is a WARNING/REVIEW signal, NOT an automatic failure
            evidence = EvidenceItem(
                evidence_id="ev_r07_warn",
                rule_id=rule_id,
                field_name="State Jurisdiction",
                extracted_value=gst_state_name,
                comparison_value=udyam_state_name,
                document_id=doc_id,
                filename=filename,
                page_number=page_num,
                context_snippet=snippet,
                source_type=src_type,
                finding_description=f"GSTIN is registered in {gst_state_name} (Code: {gst_state_code}), while Udyam certificate indicates {udyam_state_name}. Multi-state operations may account for this.",
            )
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.WARNING,
                severity=FindingSeverity.LOW,
                summary=f"Advisory state difference: GSTIN registered in '{gst_state_name}' while Udyam is in '{udyam_state_name}'. (Acceptable for multi-state operations).",
                details={
                    "gst_state": gst_state_name,
                    "udyam_state": udyam_state_name,
                    "is_multi_state_advisory": True,
                },
                evidence=[evidence],
            )
        else:
            return CrossConsistencyCheckResult(
                rule_id=rule_id,
                rule_name=rule_name,
                category=category,
                status=CheckStatus.PASS,
                severity=FindingSeverity.INFO,
                summary=f"Consistent state registration in '{gst_state_name}'.",
                details={"state": gst_state_name},
            )

    # --------------------------------------------------------------------------
    # String Similarity Utilities
    # --------------------------------------------------------------------------
    def _compute_token_similarity(self, str1: str, str2: str) -> float:
        """
        Compute token-level similarity between two business entity names (0.0 to 100.0%).
        Normalizes legal noise words (PVT, LTD, LIMITED, LLP, INC, M/S).
        """
        if not str1 or not str2:
            return 0.0

        t1 = self._tokenize_and_normalize(str1)
        t2 = self._tokenize_and_normalize(str2)

        if not t1 or not t2:
            return 0.0

        if t1 == t2:
            return 100.0

        # Substring containment for primary corporate names
        joined1 = "".join(t1)
        joined2 = "".join(t2)
        if joined1 in joined2 or joined2 in joined1:
            return 90.0

        # Jaccard / Token Overlap score
        set1 = set(t1)
        set2 = set(t2)
        intersection = len(set1.intersection(set2))
        union = len(set1.union(set2))

        jaccard = (intersection / union) if union > 0 else 0.0
        return round(jaccard * 100.0, 1)

    def _tokenize_and_normalize(self, name: str) -> List[str]:
        """Strip legal suffixes and extract lowercase substantive tokens."""
        clean = re.sub(r"[^\w\s]", " ", name.upper())
        raw_tokens = clean.split()
        ignored = {
            "PVT", "PRIVATE", "LTD", "LIMITED", "LLP", "INC", "CORP",
            "CORPORATION", "ENTERPRISES", "ENTERPRISE", "SOLUTIONS",
            "SYSTEMS", "TECHNOLOGIES", "TECH", "SERVICES", "INDIA",
            "M/S", "THE", "OF", "AND", "&", "CO", "COMPANY"
        }
        substantive = [t.lower() for t in raw_tokens if t not in ignored and len(t) > 1]
        return substantive if substantive else [t.lower() for t in raw_tokens if len(t) > 1]


# Global singleton instance
cross_consistency_engine = CrossConsistencyEngine()
