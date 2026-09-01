from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.schemas.statutory import (
    UdyamDeterministicResult,
    UdyamValidationRequest,
    UdyamValidationResponse,
)
from app.services.compliance.udyam.normalizer import udyam_normalizer
from app.services.compliance.udyam.service import udyam_module_service
from app.services.compliance.udyam.validator import UDYAM_STATE_CODE_MAP, udyam_structural_validator

router = APIRouter()


class UdyamStructureAnalysisRequest(BaseModel):
    """Request payload for deterministic Udyam structural analysis only."""
    udyam_registration_number: str = Field(
        ..., description="Raw or standardized Udyam Registration Number"
    )


class UdyamStateCodeItem(BaseModel):
    """Mapping item for 2-letter Udyam State/UT code."""
    state_code: str
    state_name: str


@router.post(
    "/verify",
    response_model=UdyamValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate Udyam MSME and retrieve policy advisories",
    description=(
        "Performs complete Udyam vertical slice verification: controlled delimiter normalization, "
        "deterministic 4-part segment analysis, state/district component parsing, "
        "enterprise tier classification, major activity evaluation, and tender-dependent procurement benefit advisories."
    ),
)
async def verify_udyam(
    request: UdyamValidationRequest,
) -> UdyamValidationResponse:
    """Execute complete Udyam verification lifecycle."""
    try:
        return await udyam_module_service.validate_udyam(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing Udyam validation: {str(e)}",
        )


@router.post(
    "/analyze-structure",
    response_model=UdyamDeterministicResult,
    status_code=status.HTTP_200_OK,
    summary="Analyze Udyam 4-part segment breakdown",
    description=(
        "Performs purely deterministic structural parsing of an Udyam registration number without any registry lookup. "
        "Returns the segment breakdown across Prefix ('UDYAM'), 2-letter State Code, 2-digit District Code, and 7-digit Serial Number."
    ),
)
async def analyze_structure(
    request: UdyamStructureAnalysisRequest,
) -> UdyamDeterministicResult:
    """Analyze Udyam 4-part structure deterministically."""
    try:
        sanitized, norm_details = udyam_normalizer.normalize(request.udyam_registration_number)
        return udyam_structural_validator.validate_structure(
            sanitized_udyam=sanitized,
            normalization_details=norm_details,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing Udyam structure: {str(e)}",
        )


@router.get(
    "/state-codes",
    response_model=List[UdyamStateCodeItem],
    status_code=status.HTTP_200_OK,
    summary="List all official 2-letter Udyam State/UT codes",
    description="Returns the reference directory of official 2-letter Indian State and Union Territory codes used in Udyam registration numbers.",
)
async def get_state_codes() -> List[UdyamStateCodeItem]:
    """Retrieve official 2-letter Udyam State and Union Territory codes."""
    return [
        UdyamStateCodeItem(state_code=code, state_name=name)
        for code, name in sorted(UDYAM_STATE_CODE_MAP.items(), key=lambda x: x[0])
    ]
