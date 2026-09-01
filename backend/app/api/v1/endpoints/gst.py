from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.schemas.statutory import (
    GSTINDeterministicResult,
    GSTINValidationRequest,
    GSTINValidationResponse,
)
from app.services.compliance.gst.service import gst_module_service
from app.services.compliance.gst.validator import gstin_structural_validator
from app.services.compliance.gst.normalizer import gstin_normalizer
from app.services.compliance.state_codes import INDIAN_STATE_CODES

router = APIRouter()


class GSTStructureAnalysisRequest(BaseModel):
    """Request payload for deterministic structural analysis only."""
    gstin: str = Field(..., description="Raw or sanitized 15-character GSTIN string")
    expected_state_code: Optional[str] = Field(
        default=None, description="Optional 2-digit state code to verify against GSTIN prefix"
    )


class GSTStateCodeItem(BaseModel):
    """Mapping item for official Indian State/UT code."""
    state_code: str
    state_name: str


@router.post(
    "/verify",
    response_model=GSTINValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate GSTIN and query registry",
    description=(
        "Performs complete GST vertical slice verification: controlled OCR normalization, "
        "deterministic 5-part segment analysis, Luhn Mod-36 checksum verification, "
        "taxpayer standing evaluation, and simulated mock registry lookup."
    ),
)
async def verify_gstin(
    request: GSTINValidationRequest,
) -> GSTINValidationResponse:
    """Execute complete GST verification lifecycle."""
    try:
        return await gst_module_service.validate_gstin(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing GSTIN validation: {str(e)}",
        )


@router.post(
    "/analyze-structure",
    response_model=GSTINDeterministicResult,
    status_code=status.HTTP_200_OK,
    summary="Analyze GSTIN 5-part character breakdown",
    description=(
        "Performs purely deterministic structural parsing and validation of a GSTIN without any registry lookup. "
        "Returns the character-level breakdown across State Code, Embedded PAN, Entity Serial, Constant, and Luhn Mod-36 checksum."
    ),
)
async def analyze_structure(
    request: GSTStructureAnalysisRequest,
) -> GSTINDeterministicResult:
    """Analyze GSTIN 5-part structure deterministically."""
    try:
        sanitized, norm_details = gstin_normalizer.normalize(request.gstin)
        return gstin_structural_validator.validate_structure(
            sanitized_gstin=sanitized,
            expected_state_code=request.expected_state_code,
            normalization_details=norm_details,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing GSTIN structure: {str(e)}",
        )


@router.get(
    "/state-codes",
    response_model=List[GSTStateCodeItem],
    status_code=status.HTTP_200_OK,
    summary="List all official GST Indian State/UT codes",
    description="Returns the reference directory of official 2-digit Indian State and Union Territory codes per GST council standards.",
)
async def get_state_codes() -> List[GSTStateCodeItem]:
    """Retrieve official Indian State and Union Territory codes."""
    return [
        GSTStateCodeItem(state_code=code, state_name=name)
        for code, name in sorted(INDIAN_STATE_CODES.items(), key=lambda x: x[0])
    ]
