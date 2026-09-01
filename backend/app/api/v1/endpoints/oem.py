from typing import List, Optional
from datetime import date
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.schemas.statutory import (
    OEMDeterministicResult,
    OEMManufacturerItem,
    OEMValidationRequest,
    OEMValidationResponse,
)
from app.services.compliance.mock_database import MOCK_OEM_DB
from app.services.compliance.oem.normalizer import oem_normalizer
from app.services.compliance.oem.service import oem_module_service
from app.services.compliance.oem.validator import oem_structural_validator

router = APIRouter()


class OEMStructureAnalysisRequest(BaseModel):
    """Request payload for deterministic OEM MAF structural analysis only."""
    oem_name: str = Field(..., description="Original Equipment Manufacturer legal name")
    authorized_partner_name: str = Field(..., description="Authorized Bidder / Reseller legal name")
    maf_number: Optional[str] = Field(default=None, description="MAF certificate reference number")
    tender_ref_number: Optional[str] = Field(default=None, description="Tender / Bid reference number")
    valid_from: Optional[date] = Field(default=None, description="Authorization start date")
    valid_until: Optional[date] = Field(default=None, description="Authorization expiration date")
    bid_submission_date: Optional[date] = Field(default=None, description="Bid submission date")
    scope_of_authorization: Optional[str] = Field(default=None, description="Scope of authorization")
    signatory_name: Optional[str] = Field(default=None, description="Authorised Signatory name")
    signatory_designation: Optional[str] = Field(default=None, description="Authorised Signatory title")


@router.post(
    "/verify",
    response_model=OEMValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate OEM MAF and query partner database",
    description=(
        "Performs complete OEM Authorization vertical slice verification: delimiter normalization, "
        "deterministic 6-part metadata decomposition, temporal validity window analysis, "
        "partner standing evaluation, and sandbox registry lookup."
    ),
)
async def verify_oem(
    request: OEMValidationRequest,
) -> OEMValidationResponse:
    """Execute complete OEM MAF verification lifecycle."""
    try:
        return await oem_module_service.validate_oem(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing OEM validation: {str(e)}",
        )


@router.post(
    "/analyze-structure",
    response_model=OEMDeterministicResult,
    status_code=status.HTTP_200_OK,
    summary="Analyze OEM MAF 6-part metadata structure",
    description=(
        "Performs purely deterministic structural parsing and temporal analysis of MAF metadata without querying partner registries."
    ),
)
async def analyze_structure(
    request: OEMStructureAnalysisRequest,
) -> OEMDeterministicResult:
    """Analyze MAF structure and temporal validity deterministically."""
    try:
        norm_maf, norm_details = oem_normalizer.normalize_maf_number(request.maf_number)
        norm_req = OEMValidationRequest(
            oem_name=request.oem_name.strip(),
            authorized_partner_name=request.authorized_partner_name.strip(),
            maf_number=norm_maf,
            tender_ref_number=request.tender_ref_number.strip() if request.tender_ref_number else None,
            valid_from=request.valid_from,
            valid_until=request.valid_until,
            bid_submission_date=request.bid_submission_date,
            scope_of_authorization=request.scope_of_authorization,
            signatory_name=request.signatory_name,
            signatory_designation=request.signatory_designation,
        )
        return oem_structural_validator.validate_maf_structure(
            req=norm_req,
            normalization_details=norm_details,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing OEM MAF structure: {str(e)}",
        )


@router.get(
    "/manufacturers",
    response_model=List[OEMManufacturerItem],
    status_code=status.HTTP_200_OK,
    summary="List recognized OEMs and authorization programs",
    description="Returns the reference directory of recognized Original Equipment Manufacturers in the sandbox database.",
)
async def get_manufacturers() -> List[OEMManufacturerItem]:
    """Retrieve recognized OEM programs."""
    oem_groups = {}
    for rec in MOCK_OEM_DB:
        name = rec.oem_name
        if name not in oem_groups:
            oem_groups[name] = {
                "oem_name": name,
                "program_name": "Authorized Reseller / Partner Program",
                "product_lines": set(),
                "partner_count": 0,
            }
        oem_groups[name]["product_lines"].update(rec.product_categories)
        if rec.is_partner_in_oem_database and "active" in rec.authorization_status.lower():
            oem_groups[name]["partner_count"] += 1

    return [
        OEMManufacturerItem(
            oem_name=info["oem_name"],
            program_name=info["program_name"],
            supported_product_lines=sorted(list(info["product_lines"])),
            active_partners_count=info["partner_count"],
        )
        for info in sorted(oem_groups.values(), key=lambda x: x["oem_name"])
    ]
