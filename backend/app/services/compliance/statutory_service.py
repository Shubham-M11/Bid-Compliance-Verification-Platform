from datetime import date
import re
from typing import List, Optional
from app.schemas.statutory import (
    GSTINDeterministicResult,
    GSTINRegistryResult,
    GSTINValidationRequest,
    GSTINValidationResponse,
    MOCK_REGISTRY_DISCLAIMER,
    OEMDeterministicResult,
    OEMRegistryResult,
    OEMValidationRequest,
    OEMValidationResponse,
    PANDeterministicResult,
    PANEntityType,
    PANRegistryResult,
    PANValidationRequest,
    PANValidationResponse,
    PresetComplianceScenario,
    UdyamDeterministicResult,
    UdyamRegistryResult,
    UdyamValidationRequest,
    UdyamValidationResponse,
    ValidationStatus,
    VerificationSource,
)
from app.services.compliance.gst.service import GSTModuleService, gst_module_service
from app.services.compliance.pan.service import PANModuleService, pan_module_service
from app.services.compliance.udyam.service import UdyamModuleService, udyam_module_service
from app.services.compliance.oem.service import OEMModuleService, oem_module_service
from app.services.compliance.luhn_mod36 import verify_gstin_checksum
from app.services.compliance.pan_decoder import (
    check_pan_name_consistency,
    decode_pan_entity_type,
    is_valid_pan_format,
)
from app.services.compliance.presets import PRESET_SCENARIOS
from app.services.compliance.providers import (
    BaseGSTNProvider,
    BaseOEMProvider,
    BasePANProvider,
    BaseUdyamProvider,
    get_gstn_provider,
    get_oem_provider,
    get_pan_provider,
    get_udyam_provider,
)
from app.services.compliance.state_codes import get_state_name, is_valid_state_code

# Strict 15-character GSTIN regex: 2 digits state code + 10 char PAN + 1 entity num + 1 'Z' + 1 checksum char
GSTIN_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")

# Strict Udyam Registration format: UDYAM-XX-00-0000000
UDYAM_REGEX = re.compile(r"^UDYAM-([A-Z]{2})-([0-9]{2})-([0-9]{7})$")

# 2-letter state code mapping for Udyam
UDYAM_STATE_CODE_MAP = {
    "AN": "Andaman and Nicobar Islands",
    "AP": "Andhra Pradesh",
    "AR": "Arunachal Pradesh",
    "AS": "Assam",
    "BR": "Bihar",
    "CH": "Chandigarh",
    "CG": "Chhattisgarh",
    "DD": "Daman and Diu",
    "DL": "Delhi",
    "DN": "Dadra and Nagar Haveli",
    "GA": "Goa",
    "GJ": "Gujarat",
    "HR": "Haryana",
    "HP": "Himachal Pradesh",
    "JK": "Jammu and Kashmir",
    "JH": "Jharkhand",
    "KA": "Karnataka",
    "KR": "Karnataka",
    "KL": "Kerala",
    "LA": "Ladakh",
    "LD": "Lakshadweep",
    "MP": "Madhya Pradesh",
    "MH": "Maharashtra",
    "MN": "Manipur",
    "ML": "Meghalaya",
    "MZ": "Mizoram",
    "NL": "Nagaland",
    "OD": "Odisha",
    "PB": "Punjab",
    "PY": "Puducherry",
    "RJ": "Rajasthan",
    "SK": "Sikkim",
    "TN": "Tamil Nadu",
    "TS": "Telangana",
    "TR": "Tripura",
    "UP": "Uttar Pradesh",
    "UK": "Uttarakhand",
    "WB": "West Bengal",
}


class StatutoryValidationService:
    """
    Core orchestration service for statutory compliance verification.
    Cleanly separates deterministic algorithmic validation from registry lookups.
    """

    def __init__(
        self,
        gstn_provider: Optional[BaseGSTNProvider] = None,
        pan_provider: Optional[BasePANProvider] = None,
        udyam_provider: Optional[BaseUdyamProvider] = None,
        oem_provider: Optional[BaseOEMProvider] = None,
        gst_service: Optional[GSTModuleService] = None,
        pan_service: Optional[PANModuleService] = None,
        udyam_service: Optional[UdyamModuleService] = None,
        oem_service: Optional[OEMModuleService] = None,
    ):
        self._gstn_provider = gstn_provider or get_gstn_provider()
        self._pan_provider = pan_provider or get_pan_provider()
        self._udyam_provider = udyam_provider or get_udyam_provider()
        self._oem_provider = oem_provider or get_oem_provider()
        self._gst_service = gst_service or (
            GSTModuleService(provider=self._gstn_provider) if gstn_provider else gst_module_service
        )
        self._pan_service = pan_service or (
            PANModuleService(provider=self._pan_provider) if pan_provider else pan_module_service
        )
        self._udyam_service = udyam_service or (
            UdyamModuleService(provider=self._udyam_provider) if udyam_provider else udyam_module_service
        )
        self._oem_service = oem_service or (
            OEMModuleService(provider=self._oem_provider) if oem_provider else oem_module_service
        )

    # --------------------------------------------------------------------------
    # GSTIN Validation (Delegated to dedicated GSTModuleService)
    # --------------------------------------------------------------------------
    async def validate_gstin(self, req: GSTINValidationRequest) -> GSTINValidationResponse:
        """Validate GSTIN via dedicated GST domain service."""
        return await self._gst_service.validate_gstin(req)

    # --------------------------------------------------------------------------
    # PAN Validation (Delegated to dedicated PANModuleService)
    # --------------------------------------------------------------------------
    async def validate_pan(self, req: PANValidationRequest) -> PANValidationResponse:
        """Validate PAN via dedicated PAN domain service."""
        return await self._pan_service.validate_pan(req)

    # --------------------------------------------------------------------------
    # Udyam Validation (Delegated to dedicated UdyamModuleService)
    # --------------------------------------------------------------------------
    async def validate_udyam(self, req: UdyamValidationRequest) -> UdyamValidationResponse:
        """Validate Udyam via dedicated Udyam domain service."""
        return await self._udyam_service.validate_udyam(req)

    # --------------------------------------------------------------------------
    # OEM Authorization Validation (Delegated to dedicated OEMModuleService)
    # --------------------------------------------------------------------------
    async def validate_oem(self, req: OEMValidationRequest) -> OEMValidationResponse:
        """Validate OEM MAF via dedicated OEM domain service."""
        return await self._oem_service.validate_oem(req)

    # --------------------------------------------------------------------------
    # Presets
    # --------------------------------------------------------------------------
    def get_presets(self) -> List[PresetComplianceScenario]:
        """Retrieve curated scenario presets for demonstration and UI testing."""
        return PRESET_SCENARIOS


# Global statutory validation service singleton
statutory_service = StatutoryValidationService()
