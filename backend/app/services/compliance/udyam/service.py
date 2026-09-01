from typing import Optional
from app.schemas.statutory import (
    MOCK_REGISTRY_DISCLAIMER,
    UdyamRegistryResult,
    UdyamValidationRequest,
    UdyamValidationResponse,
    ValidationStatus,
    VerificationSource,
)
from app.services.compliance.providers import BaseUdyamProvider, get_udyam_provider
from app.services.compliance.udyam.health import UdyamHealthEvaluator, udyam_health_evaluator
from app.services.compliance.udyam.normalizer import UdyamNormalizer, udyam_normalizer
from app.services.compliance.udyam.validator import UdyamStructuralValidator, udyam_structural_validator


class UdyamModuleService:
    """
    Dedicated domain service orchestrating the complete Udyam (MSME) verification lifecycle:
    1. Auditable input normalization & delimiter noise cleaning.
    2. Deterministic 4-part structural parsing (prefix, state, district, serial).
    3. Provider lookup with strict zero-fabrication guardrail.
    4. Enterprise tier, major activity, and policy-dependent advisory evaluation.
    5. Aggregated response construction.
    """

    def __init__(
        self,
        normalizer: Optional[UdyamNormalizer] = None,
        validator: Optional[UdyamStructuralValidator] = None,
        health_evaluator: Optional[UdyamHealthEvaluator] = None,
        provider: Optional[BaseUdyamProvider] = None,
    ):
        self.normalizer = normalizer or udyam_normalizer
        self.validator = validator or udyam_structural_validator
        self.health_evaluator = health_evaluator or udyam_health_evaluator
        self._provider = provider or get_udyam_provider()

    async def validate_udyam(self, req: UdyamValidationRequest) -> UdyamValidationResponse:
        """
        Execute full Udyam validation and registry verification workflow.
        """
        # Step 1: Auditable Normalization
        sanitized_udyam, norm_details = self.normalizer.normalize(req.udyam_registration_number)

        # Step 2: Deterministic Structural Validation (4-Part Segment Breakdown)
        deterministic_result = self.validator.validate_structure(
            sanitized_udyam=sanitized_udyam,
            normalization_details=norm_details,
        )

        # Step 3: Provider Lookup (Only if format is structurally valid)
        registry_found = False
        registry_record = None
        status_message = "Skipped registry lookup due to invalid format."
        source = VerificationSource.MOCK_REGISTRY

        if deterministic_result.is_format_valid:
            registry_found, registry_record, status_message, source = (
                await self._provider.lookup_udyam(sanitized_udyam)
            )

        registry_result = UdyamRegistryResult(
            registry_found=registry_found,
            source=source,
            record=registry_record,
            status_message=status_message,
        )

        # Step 4: Enterprise Health & Policy Advisories
        _, _ = self.health_evaluator.evaluate_udyam_record(
            record=registry_record,
            expected_enterprise_name=req.expected_enterprise_name,
        )

        # Step 5: Overall Status Resolution
        if not deterministic_result.is_format_valid:
            overall_status = ValidationStatus.INVALID_FORMAT
        elif not registry_found:
            overall_status = ValidationStatus.RECORD_NOT_FOUND
        else:
            overall_status = ValidationStatus.VALID

        return UdyamValidationResponse(
            udyam_registration_number=sanitized_udyam,
            deterministic=deterministic_result,
            registry=registry_result,
            overall_status=overall_status,
            is_live_government_source=False,
            disclaimer=MOCK_REGISTRY_DISCLAIMER,
        )


# Global singleton instance
udyam_module_service = UdyamModuleService()
