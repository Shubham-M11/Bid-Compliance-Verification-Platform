from datetime import date
from typing import List, Optional
from app.schemas.statutory import (
    MAFStructureBreakdown,
    OEMDeterministicResult,
    OEMNormalizationDetails,
    OEMValidationRequest,
    OEM_METADATA_DISCLAIMER,
)


class OEMStructuralValidator:
    """
    Evaluates metadata structure, temporal validity windows, and partner alignment
    for Manufacturer Authorization Forms (MAF).
    
    IMPORTANT:
    Does NOT invent or compute false checksum algorithms.
    Validation evaluates documented temporal validity, partner naming, tender linkage, and signatory fields.
    """

    def validate_maf_structure(
        self,
        req: OEMValidationRequest,
        normalization_details: Optional[OEMNormalizationDetails] = None,
    ) -> OEMDeterministicResult:
        """
        Execute deterministic structural parsing, temporal date analysis, and field integrity evaluation.

        Returns:
            OEMDeterministicResult with structured 6-part decomposition and validation errors.
        """
        errors: List[str] = []

        is_oem_provided = bool(req.oem_name and req.oem_name.strip())
        is_partner_provided = bool(req.authorized_partner_name and req.authorized_partner_name.strip())
        is_maf_provided = bool(req.maf_number and req.maf_number.strip())
        is_tender_provided = bool(req.tender_ref_number and req.tender_ref_number.strip())

        if not is_oem_provided:
            errors.append("Manufacturer / OEM name is required.")
        if not is_partner_provided:
            errors.append("Authorized Partner / Bidder name is required.")

        # Temporal Validity Evaluation
        eval_date = req.bid_submission_date or date.today()
        is_date_range_valid = True
        is_expired = False
        is_valid_on_bid_date = True
        days_until_expiry: Optional[int] = None
        temporal_standing = "NOT_SPECIFIED"

        if req.valid_from and req.valid_until:
            if req.valid_until < req.valid_from:
                is_date_range_valid = False
                errors.append(
                    f"Invalid date window: valid_until ({req.valid_until}) cannot precede valid_from ({req.valid_from})."
                )

        if req.valid_until:
            days_until_expiry = (req.valid_until - eval_date).days
            if eval_date > req.valid_until:
                is_expired = True
                is_valid_on_bid_date = False
                temporal_standing = "EXPIRED"
                errors.append(f"MAF authorization expired on {req.valid_until} (evaluation date: {eval_date}).")
            else:
                temporal_standing = "ACTIVE"

        if req.valid_from and eval_date < req.valid_from:
            is_valid_on_bid_date = False
            temporal_standing = "NOT_YET_EFFECTIVE"
            errors.append(f"MAF authorization is not yet effective (valid from {req.valid_from}).")

        # Build 6-part structured MAF breakdown
        breakdown = MAFStructureBreakdown(
            maf_reference=req.maf_number,
            manufacturer_name=req.oem_name,
            authorized_partner_name=req.authorized_partner_name,
            tender_reference=req.tender_ref_number,
            valid_from=str(req.valid_from) if req.valid_from else None,
            valid_until=str(req.valid_until) if req.valid_until else None,
            scope_of_authorization=req.scope_of_authorization,
            signatory_name=req.signatory_name,
            signatory_designation=req.signatory_designation,
            temporal_standing=temporal_standing,
        )

        return OEMDeterministicResult(
            is_oem_name_provided=is_oem_provided,
            is_partner_name_provided=is_partner_provided,
            is_maf_number_provided=is_maf_provided,
            is_tender_ref_provided=is_tender_provided,
            is_date_range_valid=is_date_range_valid,
            is_expired=is_expired,
            is_valid_on_bid_date=is_valid_on_bid_date,
            days_until_expiry=days_until_expiry,
            validation_errors=errors,
            metadata_notice=OEM_METADATA_DISCLAIMER,
            structure_breakdown=breakdown,
            normalization=normalization_details,
        )


# Singleton instance
oem_structural_validator = OEMStructuralValidator()
