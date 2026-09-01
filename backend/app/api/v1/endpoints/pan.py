from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.schemas.statutory import (
    PANDeterministicResult,
    PANValidationRequest,
    PANValidationResponse,
)
from app.services.compliance.pan.normalizer import pan_normalizer
from app.services.compliance.pan.service import pan_module_service
from app.services.compliance.pan.validator import PAN_ENTITY_TYPE_MAP, pan_structural_validator

router = APIRouter()


class PANStructureAnalysisRequest(BaseModel):
    """Request payload for deterministic PAN structural analysis only."""
    pan: str = Field(..., description="Raw or sanitized 10-character PAN string")
    expected_legal_name: Optional[str] = Field(
        default=None, description="Optional individual/entity name to evaluate 5th character consistency"
    )


class PANEntityTypeItem(BaseModel):
    """Mapping item for Indian PAN 4th-character entity classification."""
    code: str
    enum_key: str
    description: str


@router.post(
    "/verify",
    response_model=PANValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate PAN and query registry",
    description=(
        "Performs complete PAN vertical slice verification: controlled delimiter/case normalization, "
        "deterministic 5-part character breakdown, 4th-character entity classification, "
        "5th-character name consistency evaluation, operational standing assessment, and sandbox registry lookup."
    ),
)
async def verify_pan(
    request: PANValidationRequest,
) -> PANValidationResponse:
    """Execute complete PAN verification lifecycle."""
    try:
        return await pan_module_service.validate_pan(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing PAN validation: {str(e)}",
        )


@router.post(
    "/analyze-structure",
    response_model=PANDeterministicResult,
    status_code=status.HTTP_200_OK,
    summary="Analyze PAN 5-part character breakdown",
    description=(
        "Performs purely deterministic structural parsing and entity classification of a PAN without any registry lookup. "
        "Returns the character-level breakdown across Series Prefix, Entity Code, Name Initial, Sequential Number, and Final Character Suffix."
    ),
)
async def analyze_structure(
    request: PANStructureAnalysisRequest,
) -> PANDeterministicResult:
    """Analyze PAN 5-part structure deterministically."""
    try:
        sanitized, norm_details = pan_normalizer.normalize(request.pan)
        return pan_structural_validator.validate_structure(
            sanitized_pan=sanitized,
            expected_legal_name=request.expected_legal_name,
            normalization_details=norm_details,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing PAN structure: {str(e)}",
        )


@router.get(
    "/entity-types",
    response_model=List[PANEntityTypeItem],
    status_code=status.HTTP_200_OK,
    summary="List all official Indian PAN 4th-character entity classifications",
    description="Returns the reference directory of statutory entity type codes defined by the Indian Income Tax Department.",
)
async def get_entity_types() -> List[PANEntityTypeItem]:
    """Retrieve statutory PAN entity classifications."""
    return [
        PANEntityTypeItem(code=code, enum_key=enum_key, description=desc)
        for code, (enum_key, desc) in sorted(PAN_ENTITY_TYPE_MAP.items(), key=lambda x: x[0])
    ]
