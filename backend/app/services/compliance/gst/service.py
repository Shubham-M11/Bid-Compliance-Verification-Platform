from typing import Optional
from app.schemas.statutory import (
    GSTINRegistryResult,
    GSTINValidationRequest,
    GSTINValidationResponse,
    MOCK_REGISTRY_DISCLAIMER,
    ValidationStatus,
    VerificationSource,
)
from app.services.compliance.gst.health import TaxpayerHealthEvaluator, taxpayer_health_evaluator
from app.services.compliance.gst.normalizer import GSTINNormalizer, gstin_normalizer
from app.services.compliance.gst.validator import GSTINStructuralValidator, gstin_structural_validator
from app.services.compliance.providers import BaseGSTNProvider, get_gstn_provider


class GSTModuleService:
    """
    Dedicated domain service orchestrating the complete GST verification lifecycle:
    1. Auditable input normalization & OCR noise cleaning.
    2. Deterministic 5-part structural parsing & Luhn Mod-36 checksum calculation.
    3. Provider lookup with strict zero-fabrication guardrail.
    4. Taxpayer standing & return filing health evaluation.
    5. Aggregated response construction.
    """

    def __init__(
        self,
        normalizer: Optional[GSTINNormalizer] = None,
        validator: Optional[GSTINStructuralValidator] = None,
        health_evaluator: Optional[TaxpayerHealthEvaluator] = None,
        provider: Optional[BaseGSTNProvider] = None,
    ):
        self.normalizer = normalizer or gstin_normalizer
        self.validator = validator or gstin_structural_validator
        self.health_evaluator = health_evaluator or taxpayer_health_evaluator
        self._provider = provider or get_gstn_provider()

    async def validate_gstin(self, req: GSTINValidationRequest) -> GSTINValidationResponse:
        """
        Execute full GSTIN validation and registry verification workflow.
        """
        # Step 1: Auditable Normalization
        sanitized_gstin, norm_details = self.normalizer.normalize(req.gstin)

        # Step 2: Deterministic Structural Validation (5-Part Segment Breakdown & Luhn Mod-36)
        deterministic_result = self.validator.validate_structure(
            sanitized_gstin=sanitized_gstin,
            expected_state_code=req.expected_state_code,
            normalization_details=norm_details,
        )

        # Step 3: Provider Lookup (Only if format is structurally valid)
        registry_found = False
        registry_record = None
        status_message = "Skipped registry lookup due to invalid format."
        source = VerificationSource.MOCK_REGISTRY

        if deterministic_result.is_format_valid:
            registry_found, registry_record, status_message, source = (
                await self._provider.lookup_gstin(sanitized_gstin)
            )

        registry_result = GSTINRegistryResult(
            registry_found=registry_found,
            source=source,
            record=registry_record,
            status_message=status_message,
        )

        # Step 4: Taxpayer Health & Name Match Assessment
        name_match_status, _ = self.health_evaluator.evaluate_taxpayer_record(
            record=registry_record,
            expected_legal_name=req.expected_legal_name,
        )

        # Step 5: Overall Status Resolution
        if not deterministic_result.is_format_valid:
            overall_status = ValidationStatus.INVALID_FORMAT
        elif not deterministic_result.is_state_code_valid:
            overall_status = ValidationStatus.INVALID_STATE_CODE
        elif not deterministic_result.is_checksum_valid:
            overall_status = ValidationStatus.INVALID_CHECKSUM
        elif not registry_found:
            overall_status = ValidationStatus.RECORD_NOT_FOUND
        else:
            overall_status = ValidationStatus.VALID

        return GSTINValidationResponse(
            gstin=sanitized_gstin,
            deterministic=deterministic_result,
            registry=registry_result,
            name_match_status=name_match_status,
            overall_status=overall_status,
            is_live_government_source=False,
            disclaimer=MOCK_REGISTRY_DISCLAIMER,
        )


# Global singleton instance
gst_module_service = GSTModuleService()
