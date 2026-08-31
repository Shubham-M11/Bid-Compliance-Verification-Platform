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
    ):
        self._gstn_provider = gstn_provider or get_gstn_provider()
        self._pan_provider = pan_provider or get_pan_provider()
        self._udyam_provider = udyam_provider or get_udyam_provider()
        self._oem_provider = oem_provider or get_oem_provider()

    # --------------------------------------------------------------------------
    # GSTIN Validation
    # --------------------------------------------------------------------------
    async def validate_gstin(self, req: GSTINValidationRequest) -> GSTINValidationResponse:
        sanitized = req.gstin.strip().upper()
        errors: List[str] = []

        # 1. Deterministic Structural Validation
        is_format_valid = bool(GSTIN_REGEX.match(sanitized))
        state_code: Optional[str] = None
        state_name: Optional[str] = None
        is_state_code_valid = False
        extracted_pan: Optional[str] = None
        entity_type = PANEntityType.UNKNOWN
        entity_number: Optional[str] = None
        z_char: Optional[str] = None
        checksum_char: Optional[str] = None
        calc_checksum: Optional[str] = None
        is_checksum_valid = False

        if not is_format_valid:
            errors.append(f"GSTIN '{sanitized}' does not match standard 15-character syntax (format: 22AAAAA0000A1Z5).")
            if len(sanitized) >= 2:
                state_code = sanitized[:2]
                state_name = get_state_name(state_code)
                is_state_code_valid = is_valid_state_code(state_code)
        else:
            state_code = sanitized[:2]
            state_name = get_state_name(state_code)
            is_state_code_valid = is_valid_state_code(state_code)
            if not is_state_code_valid:
                errors.append(f"State code '{state_code}' is not a recognized Indian State/UT code.")

            # Validate expected state code if supplied
            if req.expected_state_code and req.expected_state_code.strip():
                expected_sc = req.expected_state_code.strip()
                if state_code != expected_sc:
                    errors.append(
                        f"State code mismatch: GSTIN state code is '{state_code}' ({state_name}), but expected state code was '{expected_sc}'."
                    )

            extracted_pan = sanitized[2:12]
            entity_type_key, _ = decode_pan_entity_type(extracted_pan)
            entity_type = PANEntityType(entity_type_key)
            entity_number = sanitized[12]
            z_char = sanitized[13]
            checksum_char = sanitized[14]

            # 2. Algorithmic Checksum Validation (Luhn Mod-36)
            is_checksum_valid, calc_checksum, _ = verify_gstin_checksum(sanitized)
            if not is_checksum_valid:
                errors.append(
                    f"GSTIN checksum verification failed: 15th character is '{checksum_char}', but Luhn Mod-36 calculated checksum is '{calc_checksum}'."
                )

        deterministic_result = GSTINDeterministicResult(
            is_format_valid=is_format_valid,
            state_code=state_code,
            state_name=state_name,
            is_state_code_valid=is_state_code_valid,
            extracted_pan=extracted_pan,
            entity_type=entity_type,
            entity_number=entity_number,
            z_character=z_char,
            checksum_char=checksum_char,
            calculated_checksum=calc_checksum,
            is_checksum_valid=is_checksum_valid,
            validation_errors=errors,
        )

        # 3. Provider Lookup (Separated from deterministic validation)
        registry_found = False
        registry_record = None
        status_message = "Skipped registry lookup due to invalid format."
        source = VerificationSource.MOCK_REGISTRY

        if is_format_valid:
            registry_found, registry_record, status_message, source = (
                await self._gstn_provider.lookup_gstin(sanitized)
            )

        registry_result = GSTINRegistryResult(
            registry_found=registry_found,
            source=source,
            record=registry_record,
            status_message=status_message,
        )

        # 4. Optional Legal Name Match Assessment
        name_match_status = None
        if req.expected_legal_name and req.expected_legal_name.strip():
            if registry_record:
                clean_exp = req.expected_legal_name.strip().upper()
                clean_reg = registry_record.legal_name.upper()
                clean_trade = (registry_record.trade_name or "").upper()
                if clean_exp in clean_reg or clean_reg in clean_exp or clean_exp in clean_trade:
                    name_match_status = "MATCH"
                else:
                    name_match_status = "MISMATCH"
            else:
                name_match_status = "NOT_CHECKED"

        # 5. Overall Status Resolution
        if not is_format_valid:
            overall_status = ValidationStatus.INVALID_FORMAT
        elif not is_state_code_valid:
            overall_status = ValidationStatus.INVALID_STATE_CODE
        elif not is_checksum_valid:
            overall_status = ValidationStatus.INVALID_CHECKSUM
        elif not registry_found:
            overall_status = ValidationStatus.RECORD_NOT_FOUND
        else:
            overall_status = ValidationStatus.VALID

        return GSTINValidationResponse(
            gstin=sanitized,
            deterministic=deterministic_result,
            registry=registry_result,
            name_match_status=name_match_status,
            overall_status=overall_status,
            is_live_government_source=False,
            disclaimer=MOCK_REGISTRY_DISCLAIMER,
        )

    # --------------------------------------------------------------------------
    # PAN Validation
    # --------------------------------------------------------------------------
    async def validate_pan(self, req: PANValidationRequest) -> PANValidationResponse:
        sanitized = req.pan.strip().upper()
        errors: List[str] = []

        # 1. Deterministic Structural Validation (No PAN checksum per Indian ITD spec)
        is_format_valid = is_valid_pan_format(sanitized)
        entity_type_code = None
        entity_type = PANEntityType.UNKNOWN
        entity_type_label = None
        fifth_char = None
        name_signal = None
        name_note = None

        if not is_format_valid:
            errors.append(f"PAN '{sanitized}' does not match standard 10-character syntax (format: ABCDE1234F).")
        else:
            entity_type_code = sanitized[3]
            entity_type_key, entity_type_label = decode_pan_entity_type(sanitized)
            entity_type = PANEntityType(entity_type_key)
            fifth_char = sanitized[4]

            # 5th-character name-consistency signal (only evaluated when expected name supplied)
            name_signal, name_note = check_pan_name_consistency(sanitized, req.expected_legal_name)

        deterministic_result = PANDeterministicResult(
            is_format_valid=is_format_valid,
            entity_type_code=entity_type_code,
            entity_type=entity_type,
            entity_type_label=entity_type_label,
            fifth_character=fifth_char,
            name_consistency_signal=name_signal,
            name_consistency_note=name_note,
            validation_errors=errors,
        )

        # 2. Provider Lookup
        registry_found = False
        registry_record = None
        status_message = "Skipped registry lookup due to invalid format."
        source = VerificationSource.MOCK_REGISTRY

        if is_format_valid:
            registry_found, registry_record, status_message, source = (
                await self._pan_provider.lookup_pan(sanitized)
            )

        registry_result = PANRegistryResult(
            registry_found=registry_found,
            source=source,
            record=registry_record,
            status_message=status_message,
        )

        # 3. Overall Status Resolution
        if not is_format_valid:
            overall_status = ValidationStatus.INVALID_FORMAT
        elif not registry_found:
            overall_status = ValidationStatus.RECORD_NOT_FOUND
        else:
            overall_status = ValidationStatus.VALID

        return PANValidationResponse(
            pan=sanitized,
            deterministic=deterministic_result,
            registry=registry_result,
            overall_status=overall_status,
            is_live_government_source=False,
            disclaimer=MOCK_REGISTRY_DISCLAIMER,
        )

    # --------------------------------------------------------------------------
    # Udyam Validation
    # --------------------------------------------------------------------------
    async def validate_udyam(self, req: UdyamValidationRequest) -> UdyamValidationResponse:
        sanitized = req.udyam_registration_number.strip().upper()
        errors: List[str] = []

        # 1. Deterministic Format Validation
        match = UDYAM_REGEX.match(sanitized)
        is_format_valid = bool(match)
        state_code = None
        state_name = None
        district_code = None
        sequential_id = None

        if not is_format_valid:
            errors.append(
                f"Udyam registration number '{sanitized}' does not match standard pattern (format: UDYAM-XX-00-0000000)."
            )
        else:
            state_code = match.group(1)
            district_code = match.group(2)
            sequential_id = match.group(3)
            state_name = UDYAM_STATE_CODE_MAP.get(state_code, "Other / UT")

        deterministic_result = UdyamDeterministicResult(
            is_format_valid=is_format_valid,
            state_code=state_code,
            state_name=state_name,
            district_code=district_code,
            sequential_id=sequential_id,
            validation_errors=errors,
        )

        # 2. Provider Lookup
        registry_found = False
        registry_record = None
        status_message = "Skipped registry lookup due to invalid format."
        source = VerificationSource.MOCK_REGISTRY

        if is_format_valid:
            registry_found, registry_record, status_message, source = (
                await self._udyam_provider.lookup_udyam(sanitized)
            )

        registry_result = UdyamRegistryResult(
            registry_found=registry_found,
            source=source,
            record=registry_record,
            status_message=status_message,
        )

        # 3. Overall Status Resolution
        if not is_format_valid:
            overall_status = ValidationStatus.INVALID_FORMAT
        elif not registry_found:
            overall_status = ValidationStatus.RECORD_NOT_FOUND
        else:
            overall_status = ValidationStatus.VALID

        return UdyamValidationResponse(
            udyam_registration_number=sanitized,
            deterministic=deterministic_result,
            registry=registry_result,
            overall_status=overall_status,
            is_live_government_source=False,
            disclaimer=MOCK_REGISTRY_DISCLAIMER,
        )

    # --------------------------------------------------------------------------
    # OEM Authorization Validation
    # --------------------------------------------------------------------------
    async def validate_oem(self, req: OEMValidationRequest) -> OEMValidationResponse:
        errors: List[str] = []
        is_oem_provided = bool(req.oem_name and req.oem_name.strip())
        is_partner_provided = bool(req.authorized_partner_name and req.authorized_partner_name.strip())
        is_maf_provided = bool(req.maf_number and req.maf_number.strip())
        is_tender_provided = bool(req.tender_ref_number and req.tender_ref_number.strip())

        if not is_oem_provided:
            errors.append("OEM name is required.")
        if not is_partner_provided:
            errors.append("Authorized partner / bidder name is required.")

        # Date validity checks
        eval_date = req.bid_submission_date or date.today()
        is_date_range_valid = True
        is_expired = False
        is_valid_on_bid_date = True
        days_until_expiry: Optional[int] = None

        if req.valid_from and req.valid_until:
            if req.valid_until < req.valid_from:
                is_date_range_valid = False
                errors.append(f"Invalid date window: valid_until ({req.valid_until}) cannot precede valid_from ({req.valid_from}).")

        if req.valid_until:
            days_until_expiry = (req.valid_until - eval_date).days
            if eval_date > req.valid_until:
                is_expired = True
                is_valid_on_bid_date = False
                errors.append(f"MAF authorization expired on {req.valid_until} (evaluation date: {eval_date}).")

        if req.valid_from and eval_date < req.valid_from:
            is_valid_on_bid_date = False
            errors.append(f"MAF authorization is not yet effective (valid from {req.valid_from}).")

        deterministic_result = OEMDeterministicResult(
            is_oem_name_provided=is_oem_provided,
            is_partner_name_provided=is_partner_provided,
            is_maf_number_provided=is_maf_provided,
            is_tender_ref_provided=is_tender_provided,
            is_date_range_valid=is_date_range_valid,
            is_expired=is_expired,
            is_valid_on_bid_date=is_valid_on_bid_date,
            days_until_expiry=days_until_expiry,
            validation_errors=errors,
        )

        # Provider lookup
        registry_found, registry_record, status_message, source = (
            await self._oem_provider.lookup_oem(
                req.oem_name, req.authorized_partner_name, req.maf_number
            )
        )

        registry_result = OEMRegistryResult(
            registry_found=registry_found,
            source=source,
            record=registry_record,
            status_message=status_message,
        )

        # Overall Status
        if is_expired:
            overall_status = ValidationStatus.EXPIRED
        elif not is_date_range_valid or not is_valid_on_bid_date or not is_oem_provided or not is_partner_provided:
            overall_status = ValidationStatus.INVALID_FORMAT
        elif not registry_found:
            overall_status = ValidationStatus.RECORD_NOT_FOUND
        else:
            overall_status = ValidationStatus.VALID

        return OEMValidationResponse(
            oem_name=req.oem_name,
            authorized_partner_name=req.authorized_partner_name,
            maf_number=req.maf_number,
            deterministic=deterministic_result,
            registry=registry_result,
            overall_status=overall_status,
            is_live_government_source=False,
        )

    # --------------------------------------------------------------------------
    # Presets
    # --------------------------------------------------------------------------
    def get_presets(self) -> List[PresetComplianceScenario]:
        """Retrieve curated scenario presets for demonstration and UI testing."""
        return PRESET_SCENARIOS


# Global statutory validation service singleton
statutory_service = StatutoryValidationService()
