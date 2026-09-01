from typing import Optional
from app.schemas.statutory import (
    OEMRegistryResult,
    OEMValidationRequest,
    OEMValidationResponse,
    OEM_METADATA_DISCLAIMER,
    ValidationStatus,
    VerificationSource,
)
from app.services.compliance.oem.health import OEMHealthEvaluator, oem_health_evaluator
from app.services.compliance.oem.normalizer import OEMNormalizer, oem_normalizer
from app.services.compliance.oem.validator import OEMStructuralValidator, oem_structural_validator
from app.services.compliance.providers import BaseOEMProvider, get_oem_provider


class OEMModuleService:
    """
    Dedicated domain service orchestrating the complete OEM MAF verification lifecycle:
    1. Auditable normalization of MAF certificate numbers & entity names.
    2. Deterministic 6-part structural parsing and temporal date window analysis.
    3. Provider lookup with strict zero-fabrication guardrail.
    4. Partner standing & authorization scope evaluation from sandbox records.
    5. Aggregated response construction.
    """

    def __init__(
        self,
        normalizer: Optional[OEMNormalizer] = None,
        validator: Optional[OEMStructuralValidator] = None,
        health_evaluator: Optional[OEMHealthEvaluator] = None,
        provider: Optional[BaseOEMProvider] = None,
    ):
        self.normalizer = normalizer or oem_normalizer
        self.validator = validator or oem_structural_validator
        self.health_evaluator = health_evaluator or oem_health_evaluator
        self._provider = provider or get_oem_provider()

    async def validate_oem(self, req: OEMValidationRequest) -> OEMValidationResponse:
        """
        Execute full OEM MAF validation and registry verification workflow.
        """
        # Step 1: Auditable Normalization
        norm_maf, norm_details = self.normalizer.normalize_maf_number(req.maf_number)
        norm_oem_name = req.oem_name.strip() if req.oem_name else ""
        norm_partner_name = req.authorized_partner_name.strip() if req.authorized_partner_name else ""

        normalized_req = OEMValidationRequest(
            oem_name=norm_oem_name,
            authorized_partner_name=norm_partner_name,
            maf_number=norm_maf,
            tender_ref_number=req.tender_ref_number.strip() if req.tender_ref_number else None,
            valid_from=req.valid_from,
            valid_until=req.valid_until,
            bid_submission_date=req.bid_submission_date,
            scope_of_authorization=req.scope_of_authorization,
            signatory_name=req.signatory_name,
            signatory_designation=req.signatory_designation,
        )

        # Step 2: Deterministic Structural Validation (6-Part Breakdown & Temporal Window)
        deterministic_result = self.validator.validate_maf_structure(
            req=normalized_req,
            normalization_details=norm_details,
        )

        # Step 3: Provider Lookup (Strict Zero-Fabrication Guardrail)
        registry_found = False
        registry_record = None
        status_message = "Skipped registry lookup due to missing required entity names."
        source = VerificationSource.MOCK_REGISTRY

        if deterministic_result.is_oem_name_provided and deterministic_result.is_partner_name_provided:
            registry_found, registry_record, status_message, source = (
                await self._provider.lookup_oem(
                    norm_oem_name,
                    norm_partner_name,
                    norm_maf,
                )
            )

        registry_result = OEMRegistryResult(
            registry_found=registry_found,
            source=source,
            record=registry_record,
            status_message=status_message,
        )

        # Step 4: Health & Standing Evaluation
        _, _ = self.health_evaluator.evaluate_oem_record(
            record=registry_record,
            requested_partner=norm_partner_name,
        )

        # Step 5: Overall Status Resolution
        if deterministic_result.is_expired:
            overall_status = ValidationStatus.EXPIRED
        elif (
            not deterministic_result.is_date_range_valid
            or not deterministic_result.is_valid_on_bid_date
            or not deterministic_result.is_oem_name_provided
            or not deterministic_result.is_partner_name_provided
        ):
            overall_status = ValidationStatus.INVALID_FORMAT
        elif not registry_found:
            overall_status = ValidationStatus.RECORD_NOT_FOUND
        else:
            overall_status = ValidationStatus.VALID

        return OEMValidationResponse(
            oem_name=norm_oem_name,
            authorized_partner_name=norm_partner_name,
            maf_number=norm_maf,
            deterministic=deterministic_result,
            registry=registry_result,
            overall_status=overall_status,
            is_live_government_source=False,
            disclaimer=OEM_METADATA_DISCLAIMER,
        )


# Global singleton instance
oem_module_service = OEMModuleService()
