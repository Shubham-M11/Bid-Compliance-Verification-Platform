from typing import List
from fastapi import APIRouter, HTTPException, status
from app.schemas.statutory import (
    GSTINValidationRequest,
    GSTINValidationResponse,
    OEMValidationRequest,
    OEMValidationResponse,
    PANValidationRequest,
    PANValidationResponse,
    PresetComplianceScenario,
    UdyamValidationRequest,
    UdyamValidationResponse,
)
from app.services.compliance.statutory_service import (
    StatutoryValidationService,
    statutory_service,
)

router = APIRouter()


@router.post(
    "/gstin/verify",
    response_model=GSTINValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate GSTIN and query registry",
    description=(
        "Performs deterministic validation (15-character syntax regex, state code, PAN extraction, "
        "and Luhn Mod-36 checksum calculation) and performs simulated mock registry lookup with zero fabricated identity data."
    ),
)
async def verify_gstin(
    request: GSTINValidationRequest,
) -> GSTINValidationResponse:
    """Validate GSTIN format, calculate Luhn Mod-36 checksum, and query registry provider."""
    try:
        return await statutory_service.validate_gstin(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error during GSTIN validation: {str(e)}",
        )


@router.post(
    "/pan/verify",
    response_model=PANValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate PAN and evaluate entity type",
    description=(
        "Performs deterministic 10-character PAN validation, decodes the 4th character entity type, "
        "and evaluates the 5th character against any supplied expected name without executing a checksum."
    ),
)
async def verify_pan(
    request: PANValidationRequest,
) -> PANValidationResponse:
    """Validate PAN format, decode entity type, and query registry provider."""
    try:
        return await statutory_service.validate_pan(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error during PAN validation: {str(e)}",
        )


@router.post(
    "/udyam/verify",
    response_model=UdyamValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate Udyam MSME and retrieve policy advisories",
    description=(
        "Validates Udyam Registration syntax (UDYAM-XX-00-0000000), checks state codes, and retrieves "
        "enterprise tier, NIC codes, and policy/tender-dependent procurement benefit advisories."
    ),
)
async def verify_udyam(
    request: UdyamValidationRequest,
) -> UdyamValidationResponse:
    """Validate Udyam MSME number and retrieve tender-dependent advisory benefits."""
    try:
        return await statutory_service.validate_udyam(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error during Udyam validation: {str(e)}",
        )


@router.post(
    "/oem/verify",
    response_model=OEMValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate OEM Manufacturer Authorization Form (MAF)",
    description=(
        "Evaluates submitted MAF metadata including validity dates, authorized partner, tender reference, "
        "and active authorization status against partner databases."
    ),
)
async def verify_oem(
    request: OEMValidationRequest,
) -> OEMValidationResponse:
    """Validate OEM MAF metadata and partner standing."""
    try:
        return await statutory_service.validate_oem(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error during OEM validation: {str(e)}",
        )


@router.get(
    "/presets",
    response_model=List[PresetComplianceScenario],
    status_code=status.HTTP_200_OK,
    summary="Get curated compliance demonstration presets",
    description="Returns pre-built scenario presets for automated verification testing and UI evaluation.",
)
async def get_compliance_presets() -> List[PresetComplianceScenario]:
    """Retrieve pre-built scenario presets."""
    return statutory_service.get_presets()
