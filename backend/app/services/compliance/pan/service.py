from typing import Optional
from app.schemas.statutory import (
    MOCK_REGISTRY_DISCLAIMER,
    PANRegistryResult,
    PANValidationRequest,
    PANValidationResponse,
    ValidationStatus,
    VerificationSource,
)
from app.services.compliance.pan.health import PANHealthEvaluator, pan_health_evaluator
from app.services.compliance.pan.normalizer import PANNormalizer, pan_normalizer
from app.services.compliance.pan.validator import PANStructuralValidator, pan_structural_validator
from app.services.compliance.providers import BasePANProvider, get_pan_provider


class PANModuleService:
    """
    Dedicated domain service orchestrating the complete PAN verification lifecycle:
    1. Auditable input normalization & delimiter noise cleaning.
    2. Deterministic 5-part structural parsing, 4th char entity classification, 5th char name signal.
    3. Provider lookup with strict zero-fabrication guardrail.
    4. Taxpayer standing & health evaluation from sandbox records.
    5. Aggregated response construction.
    """

    def __init__(
        self,
        normalizer: Optional[PANNormalizer] = None,
        validator: Optional[PANStructuralValidator] = None,
        health_evaluator: Optional[PANHealthEvaluator] = None,
        provider: Optional[BasePANProvider] = None,
    ):
        self.normalizer = normalizer or pan_normalizer
        self.validator = validator or pan_structural_validator
        self.health_evaluator = health_evaluator or pan_health_evaluator
        self._provider = provider or get_pan_provider()

    async def validate_pan(self, req: PANValidationRequest) -> PANValidationResponse:
        """
        Execute full PAN validation and registry verification workflow.
        """
        # Step 1: Auditable Normalization
        sanitized_pan, norm_details = self.normalizer.normalize(req.pan)

        # Step 2: Deterministic Structural Validation (5-Part Character Breakdown & Entity Decode)
        deterministic_result = self.validator.validate_structure(
            sanitized_pan=sanitized_pan,
            expected_legal_name=req.expected_legal_name,
            normalization_details=norm_details,
        )

        # Step 3: Provider Lookup (Only if format is structurally valid)
        registry_found = False
        registry_record = None
        status_message = "Skipped registry lookup due to invalid format."
        source = VerificationSource.MOCK_REGISTRY

        if deterministic_result.is_format_valid:
            registry_found, registry_record, status_message, source = (
                await self._provider.lookup_pan(sanitized_pan)
            )

        registry_result = PANRegistryResult(
            registry_found=registry_found,
            source=source,
            record=registry_record,
            status_message=status_message,
        )

        # Step 4: Taxpayer Health Evaluation
        _, _ = self.health_evaluator.evaluate_pan_record(
            record=registry_record,
            expected_legal_name=req.expected_legal_name,
        )

        # Step 5: Overall Status Resolution
        if not deterministic_result.is_format_valid:
            overall_status = ValidationStatus.INVALID_FORMAT
        elif not registry_found:
            overall_status = ValidationStatus.RECORD_NOT_FOUND
        else:
            overall_status = ValidationStatus.VALID

        return PANValidationResponse(
            pan=sanitized_pan,
            deterministic=deterministic_result,
            registry=registry_result,
            overall_status=overall_status,
            is_live_government_source=False,
            disclaimer=MOCK_REGISTRY_DISCLAIMER,
        )


# Global singleton instance
pan_module_service = PANModuleService()
