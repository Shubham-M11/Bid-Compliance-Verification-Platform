from datetime import date, datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ==========================================
# Common Enums and Disclaimers
# ==========================================

class VerificationSource(str, Enum):
    """Source mode used for registry lookup."""
    DETERMINISTIC_ONLY = "deterministic_only"
    MOCK_REGISTRY = "mock_registry"
    SANDBOX = "sandbox"
    LIVE_EXTERNAL = "live_external"


class ValidationStatus(str, Enum):
    """Normalized validation/verification outcome state."""
    VALID = "VALID"
    INVALID_FORMAT = "INVALID_FORMAT"
    INVALID_CHECKSUM = "INVALID_CHECKSUM"
    INVALID_STATE_CODE = "INVALID_STATE_CODE"
    EXPIRED = "EXPIRED"
    RECORD_NOT_FOUND = "RECORD_NOT_FOUND"
    MISMATCH = "MISMATCH"
    UNVERIFIED = "UNVERIFIED"


class TaxpayerStatus(str, Enum):
    """GSTN Taxpayer status classification."""
    ACTIVE = "ACTIVE"
    CANCELLED = "CANCELLED"
    SUSPENDED = "SUSPENDED"
    INACTIVE = "INACTIVE"
    UNKNOWN = "UNKNOWN"


class PANEntityType(str, Enum):
    """Entity classification decoded from PAN 4th character."""
    COMPANY = "COMPANY"
    INDIVIDUAL = "INDIVIDUAL"
    HUF = "HUF"
    PARTNERSHIP_FIRM_LLP = "PARTNERSHIP_FIRM_LLP"
    AOP = "AOP"
    TRUST = "TRUST"
    BOI = "BOI"
    LOCAL_AUTHORITY = "LOCAL_AUTHORITY"
    ARTIFICIAL_JURIDICAL_PERSON = "ARTIFICIAL_JURIDICAL_PERSON"
    GOVERNMENT = "GOVERNMENT"
    UNKNOWN = "UNKNOWN"


class EnterpriseType(str, Enum):
    """MSME classification tier."""
    MICRO = "MICRO"
    SMALL = "SMALL"
    MEDIUM = "MEDIUM"
    UNKNOWN = "UNKNOWN"


class EnterpriseMajorActivity(str, Enum):
    """MSME operational activity type."""
    MANUFACTURING = "MANUFACTURING"
    SERVICES = "SERVICES"
    TRADING = "TRADING"
    UNKNOWN = "UNKNOWN"


# Authoritative transparency disclaimer constants
MOCK_REGISTRY_DISCLAIMER = (
    "Deterministic structural validation performed locally. Registry lookup conducted "
    "against a simulated/mock sandbox registry. This is NOT a certified live government lookup."
)

POLICY_ADVISORY_DISCLAIMER = (
    "MSME procurement benefits (EMD exemption, prior experience/turnover relaxation, "
    "and purchase preference) are advisory and subject to specific tender terms, buyer discretion, "
    "and PPP-MII / GFR Rule 173(i) guidelines."
)

OEM_METADATA_DISCLAIMER = (
    "OEM validation evaluates submitted MAF metadata including validity dates, authorized partner, "
    "tender reference, and format. Signatory and email domain represent submitted claims requiring "
    "document evidence verification."
)


# ==========================================
# GSTIN Schemas
# ==========================================

class GSTINSegmentItem(BaseModel):
    """Segment breakdown for a component of the 15-character GSTIN."""
    segment_name: str = Field(..., description="Component name: State Code, Embedded PAN, Entity Serial, Default Constant, Checksum")
    characters: str = Field(..., description="Character value in this segment")
    position_range: str = Field(..., description="1-indexed position span, e.g., '1-2', '3-12', '13', '14', '15'")
    is_valid: bool = Field(..., description="Whether this segment adheres to the statutory format specification")
    description: str = Field(..., description="Human-readable explanation of the segment's meaning and statutory rule")


class GSTINStructureBreakdown(BaseModel):
    """Detailed character-by-character breakdown of the 15-character GSTIN across all 5 segments."""
    state_segment: GSTINSegmentItem = Field(..., description="Characters 1-2: 2-digit Indian State/UT census code")
    pan_segment: GSTINSegmentItem = Field(..., description="Characters 3-12: 10-character Income Tax PAN")
    entity_segment: GSTINSegmentItem = Field(..., description="Character 13: Entity counter / registration count within state (1-9, A-Z)")
    constant_segment: GSTINSegmentItem = Field(..., description="Character 14: Default constant 'Z'")
    checksum_segment: GSTINSegmentItem = Field(..., description="Character 15: Luhn Mod-36 calculated checksum character")


class GSTINNormalizationDetails(BaseModel):
    """Auditable provenance of any input normalization or OCR correction applied."""
    raw_input: str = Field(..., description="Original un-normalized string received")
    normalized_value: str = Field(..., description="Sanitized 15-character uppercase string")
    is_normalized: bool = Field(default=False, description="True if any delimiter cleaning, whitespace removal, or OCR correction was applied")
    normalization_notes: List[str] = Field(default_factory=list, description="Audit log of specific normalizations performed")


class GSTINValidationRequest(BaseModel):
    """Request payload for GSTIN validation."""
    gstin: str = Field(..., description="15-character Goods and Services Tax Identification Number")
    expected_legal_name: Optional[str] = Field(
        default=None, description="Optional legal or trade name to evaluate consistency"
    )
    expected_state_code: Optional[str] = Field(
        default=None, description="Optional 2-digit state code to verify against GSTIN prefix"
    )


class GSTINDeterministicResult(BaseModel):
    """Deterministic structural and algorithmic validation breakdown for GSTIN."""
    is_format_valid: bool = Field(..., description="True if GSTIN matches standard 15-char regex")
    state_code: Optional[str] = Field(default=None, description="Extracted 2-digit state code")
    state_name: Optional[str] = Field(default=None, description="Standard Indian State/UT name")
    is_state_code_valid: bool = Field(default=False, description="True if state code is recognized")
    extracted_pan: Optional[str] = Field(default=None, description="Extracted 10-char PAN (chars 3-12)")
    entity_type: PANEntityType = Field(
        default=PANEntityType.UNKNOWN, description="Decoded entity type from embedded PAN"
    )
    entity_number: Optional[str] = Field(default=None, description="13th character entity counter (1-9, A-Z)")
    z_character: Optional[str] = Field(default=None, description="14th character (standard default 'Z')")
    checksum_char: Optional[str] = Field(default=None, description="15th character actual checksum")
    calculated_checksum: Optional[str] = Field(default=None, description="Expected Luhn Mod-36 checksum char")
    is_checksum_valid: bool = Field(default=False, description="True if actual checksum matches Mod-36 calculation")
    validation_errors: List[str] = Field(default_factory=list, description="List of structural error descriptions")
    structure_breakdown: Optional[GSTINStructureBreakdown] = Field(
        default=None, description="Detailed 5-part character breakdown"
    )
    normalization: Optional[GSTINNormalizationDetails] = Field(
        default=None, description="Auditable normalization provenance details"
    )


class GSTINRegistryRecord(BaseModel):
    """Curated or retrieved registry record for GSTIN."""
    legal_name: str = Field(..., description="Registered legal business name")
    trade_name: Optional[str] = Field(default=None, description="Trade name / DBA")
    status: TaxpayerStatus = Field(default=TaxpayerStatus.ACTIVE, description="Taxpayer registration status")
    taxpayer_type: str = Field(default="Regular", description="Taxpayer type (e.g. Regular, Composition, SEZ)")
    registration_date: Optional[str] = Field(default=None, description="Date of GST registration (YYYY-MM-DD)")
    principal_place_of_business: Optional[str] = Field(default=None, description="Registered business address")
    state: Optional[str] = Field(default=None, description="Registered state")
    is_filing_up_to_date: bool = Field(default=True, description="True if GST return filings are compliant")
    last_updated: Optional[str] = Field(default=None, description="Timestamp of last registry record update")
    is_composition_dealer: bool = Field(
        default=False, description="True if registered under Section 10 Composition Scheme"
    )
    composition_advisory_note: Optional[str] = Field(
        default=None, description="Factual advisory regarding composition dealer limitations"
    )
    filing_status_summary: Optional[str] = Field(
        default=None, description="Factual summary of GSTR-1 / GSTR-3B return compliance history"
    )


class GSTINRegistryResult(BaseModel):
    """Registry lookup result, explicitly separated from deterministic validation."""
    registry_found: bool = Field(..., description="True only if record exists in the lookup source")
    source: VerificationSource = Field(default=VerificationSource.MOCK_REGISTRY, description="Lookup provider source")
    record: Optional[GSTINRegistryRecord] = Field(default=None, description="Registry record if found, else null")
    status_message: str = Field(..., description="Explanation of registry search outcome")


class GSTINValidationResponse(BaseModel):
    """Complete response for GSTIN validation endpoint."""
    gstin: str = Field(..., description="Original input GSTIN")
    deterministic: GSTINDeterministicResult = Field(..., description="Deterministic validation results")
    registry: GSTINRegistryResult = Field(..., description="Registry provider lookup results")
    name_match_status: Optional[str] = Field(
        default=None, description="MATCH, MISMATCH, or NOT_CHECKED if expected name was provided"
    )
    overall_status: ValidationStatus = Field(..., description="Aggregated validation status")
    is_live_government_source: bool = Field(
        default=False, description="Always False for mock/sandbox provider; True only for live GSTN API"
    )
    disclaimer: str = Field(default=MOCK_REGISTRY_DISCLAIMER, description="Legal transparency disclaimer")


# ==========================================
# PAN Schemas
# ==========================================

class PANSegmentItem(BaseModel):
    """Character segment in a 10-character Permanent Account Number."""
    segment_name: str = Field(..., description="Name of the character segment")
    characters: str = Field(..., description="Character value in the segment")
    position_range: str = Field(..., description="1-indexed character position (e.g. '1-3', '4', '10')")
    is_valid: bool = Field(..., description="Whether this segment conforms to statutory syntax rules")
    description: str = Field(..., description="Factual description of this segment's decoded meaning")


class PANStructureBreakdown(BaseModel):
    """5-part structural breakdown of a 10-character Indian PAN."""
    series_segment: PANSegmentItem = Field(..., description="Characters 1-3: Alphabetic series prefix (AAA-ZZZ)")
    entity_segment: PANSegmentItem = Field(..., description="Character 4: Statutory entity classification code")
    name_initial_segment: PANSegmentItem = Field(..., description="Character 5: Surname initial or entity name initial")
    sequential_segment: PANSegmentItem = Field(..., description="Characters 6-9: Sequential numeric digits (0001-9999)")
    suffix_segment: PANSegmentItem = Field(..., description="Character 10: Final character / identifier suffix (alphabetic)")


class PANNormalizationDetails(BaseModel):
    """Auditable normalization provenance for PAN inputs."""
    raw_input: str = Field(..., description="Original raw candidate string as extracted or input")
    normalized_value: str = Field(..., description="Sanitized uppercase 10-character PAN value")
    is_normalized: bool = Field(..., description="True if any cleaning or normalization was applied")
    normalization_notes: List[str] = Field(
        default_factory=list, description="Itemized audit trail of applied normalization transformations"
    )


class PANValidationRequest(BaseModel):
    """Request payload for PAN validation."""
    pan: str = Field(..., description="10-character Permanent Account Number")
    expected_legal_name: Optional[str] = Field(
        default=None, description="Optional individual/entity name to evaluate 5th character consistency"
    )


class PANDeterministicResult(BaseModel):
    """Deterministic structural and entity decoding breakdown for PAN."""
    is_format_valid: bool = Field(..., description="True if PAN matches 10-char alphanumeric regex")
    entity_type_code: Optional[str] = Field(default=None, description="4th character entity code (e.g. 'C', 'P')")
    entity_type: PANEntityType = Field(default=PANEntityType.UNKNOWN, description="Decoded entity classification")
    entity_type_label: Optional[str] = Field(default=None, description="Human-readable entity classification")
    fifth_character: Optional[str] = Field(default=None, description="5th character of PAN")
    name_consistency_signal: Optional[str] = Field(
        default=None, description="MATCH, MISMATCH, or NOT_CHECKED against expected legal name"
    )
    name_consistency_note: Optional[str] = Field(
        default=None, description="Explanatory note regarding 5th-character initial check"
    )
    validation_errors: List[str] = Field(default_factory=list, description="Structural validation errors")
    structure_breakdown: Optional[PANStructureBreakdown] = Field(
        default=None, description="Detailed 5-part character breakdown"
    )
    normalization: Optional[PANNormalizationDetails] = Field(
        default=None, description="Auditable normalization provenance details"
    )


class PANRegistryRecord(BaseModel):
    """Curated or retrieved registry record for PAN."""
    full_name: str = Field(..., description="Full legal name of the taxpayer")
    pan_status: str = Field(default="Active", description="PAN operational status")
    entity_type: PANEntityType = Field(default=PANEntityType.UNKNOWN, description="Registered entity category")
    aadhaar_seeding_status: Optional[str] = Field(default=None, description="Aadhaar linking status if applicable")
    category: str = Field(default="Domestic", description="Taxpayer category")
    last_updated: Optional[str] = Field(default=None, description="Timestamp of record")


class PANRegistryResult(BaseModel):
    """Registry lookup result for PAN."""
    registry_found: bool = Field(..., description="True only if record exists in the lookup source")
    source: VerificationSource = Field(default=VerificationSource.MOCK_REGISTRY, description="Lookup provider source")
    record: Optional[PANRegistryRecord] = Field(default=None, description="Registry record if found, else null")
    status_message: str = Field(..., description="Explanation of registry search outcome")


class PANValidationResponse(BaseModel):
    """Complete response for PAN validation endpoint."""
    pan: str = Field(..., description="Original input PAN")
    deterministic: PANDeterministicResult = Field(..., description="Deterministic validation results")
    registry: PANRegistryResult = Field(..., description="Registry provider lookup results")
    overall_status: ValidationStatus = Field(..., description="Aggregated validation status")
    is_live_government_source: bool = Field(
        default=False, description="Always False for mock/sandbox; True only for live NSDL/ITD lookup"
    )
    disclaimer: str = Field(default=MOCK_REGISTRY_DISCLAIMER, description="Legal transparency disclaimer")


# ==========================================
# Udyam (MSME) Schemas
# ==========================================

class UdyamSegmentItem(BaseModel):
    """Segment in a standard Udyam registration number."""
    segment_name: str = Field(..., description="Name of the segment")
    characters: str = Field(..., description="Characters in the segment")
    position_range: str = Field(..., description="Segment descriptor range")
    is_valid: bool = Field(..., description="Whether this segment conforms to Udyam syntax")
    description: str = Field(..., description="Factual description of the registration component")


class UdyamStructureBreakdown(BaseModel):
    """4-part structural breakdown of a standard Indian Udyam registration number."""
    prefix_segment: UdyamSegmentItem = Field(..., description="Fixed scheme prefix 'UDYAM'")
    state_segment: UdyamSegmentItem = Field(..., description="2-letter Indian State/UT code")
    district_segment: UdyamSegmentItem = Field(..., description="2-digit district identifier (parsed registration component)")
    serial_segment: UdyamSegmentItem = Field(..., description="7-digit enterprise registration sequential ID")


class UdyamNormalizationDetails(BaseModel):
    """Auditable normalization provenance for Udyam inputs."""
    raw_input: str = Field(..., description="Original raw candidate string as extracted or input")
    normalized_value: str = Field(..., description="Sanitized uppercase Udyam registration number")
    is_normalized: bool = Field(..., description="True if any cleaning or normalization was applied")
    normalization_notes: List[str] = Field(
        default_factory=list, description="Itemized audit trail of applied normalization transformations"
    )


class UdyamValidationRequest(BaseModel):
    """Request payload for Udyam Registration Number validation."""
    udyam_registration_number: str = Field(
        ..., description="Udyam Registration Number (format: UDYAM-XX-00-0000000)"
    )
    expected_enterprise_name: Optional[str] = Field(
        default=None, description="Optional enterprise name to check consistency"
    )


class UdyamDeterministicResult(BaseModel):
    """Deterministic format validation for Udyam."""
    is_format_valid: bool = Field(..., description="True if Udyam format matches UDYAM-XX-00-0000000")
    state_code: Optional[str] = Field(default=None, description="Extracted 2-letter state code")
    state_name: Optional[str] = Field(default=None, description="Indian State/UT matching 2-letter code")
    district_code: Optional[str] = Field(default=None, description="Extracted 2-digit district code")
    sequential_id: Optional[str] = Field(default=None, description="Extracted 7-digit registration serial")
    validation_errors: List[str] = Field(default_factory=list, description="Structural validation errors")
    structure_breakdown: Optional[UdyamStructureBreakdown] = Field(
        default=None, description="Detailed 4-part segment breakdown"
    )
    normalization: Optional[UdyamNormalizationDetails] = Field(
        default=None, description="Auditable normalization provenance details"
    )


class MSMEPolicyAdvisory(BaseModel):
    """Advisory representation of tender-dependent MSME procurement benefits."""
    emd_exemption_eligible: bool = Field(
        default=True, description="Indicative eligibility for Earnest Money Deposit waiver"
    )
    emd_exemption_advisory: str = Field(
        default="EMD exemption is policy/tender-dependent per MSME Order 2012; applicable only for manufactured goods/services matching registered NIC code, not mere trading/resale.",
        description="Policy advisory condition note",
    )
    prior_experience_turnover_relaxation_eligible: bool = Field(
        default=True, description="Indicative eligibility for prior turnover/experience waiver"
    )
    prior_experience_advisory: str = Field(
        default="Relaxation of prior experience/turnover is subject to buyer discretion and explicit tender clause under GFR Rule 173(i) and PPP-MII policy.",
        description="Policy advisory condition note",
    )
    purchase_preference_eligible: bool = Field(
        default=True, description="Indicative eligibility for MSME purchase preference (L1+15% margin band)"
    )
    purchase_preference_advisory: str = Field(
        default="Purchase preference applies only if tender terms permit MSME preference and bidder matches L1 price.",
        description="Policy advisory condition note",
    )
    tender_clause_condition_notice: str = Field(
        default=POLICY_ADVISORY_DISCLAIMER, description="Mandatory non-absolute disclaimer"
    )


class UdyamRegistryRecord(BaseModel):
    """Curated or retrieved registry record for Udyam MSME."""
    enterprise_name: str = Field(..., description="Registered MSME enterprise name")
    enterprise_tier: EnterpriseType = Field(default=EnterpriseType.MICRO, description="Micro, Small, or Medium")
    major_activity: EnterpriseMajorActivity = Field(
        default=EnterpriseMajorActivity.MANUFACTURING, description="Manufacturing, Services, or Trading"
    )
    nic_codes: List[str] = Field(default_factory=list, description="Registered National Industry Classification codes")
    dic_name: Optional[str] = Field(default=None, description="District Industry Centre name")
    date_of_registration: Optional[str] = Field(default=None, description="Date of Udyam registration")
    date_of_incorporation: Optional[str] = Field(default=None, description="Date of enterprise incorporation")
    organization_type: str = Field(default="Private Limited Company", description="Type of organization")
    state: Optional[str] = Field(default=None, description="State of registration")
    advisory_benefits: MSMEPolicyAdvisory = Field(
        default_factory=MSMEPolicyAdvisory, description="Tender-dependent benefit breakdown"
    )


class UdyamRegistryResult(BaseModel):
    """Registry lookup result for Udyam MSME."""
    registry_found: bool = Field(..., description="True only if record exists in the lookup source")
    source: VerificationSource = Field(default=VerificationSource.MOCK_REGISTRY, description="Lookup provider source")
    record: Optional[UdyamRegistryRecord] = Field(default=None, description="Registry record if found, else null")
    status_message: str = Field(..., description="Explanation of registry search outcome")


class UdyamValidationResponse(BaseModel):
    """Complete response for Udyam validation endpoint."""
    udyam_registration_number: str = Field(..., description="Original input Udyam number")
    deterministic: UdyamDeterministicResult = Field(..., description="Deterministic validation results")
    registry: UdyamRegistryResult = Field(..., description="Registry provider lookup results")
    overall_status: ValidationStatus = Field(..., description="Aggregated validation status")
    is_live_government_source: bool = Field(
        default=False, description="Always False for mock/sandbox; True only for live Udyam portal API"
    )
    disclaimer: str = Field(default=MOCK_REGISTRY_DISCLAIMER, description="Legal transparency disclaimer")


# ==========================================
# OEM Authorization Schemas
# ==========================================

class OEMNormalizationDetails(BaseModel):
    """Auditable normalization provenance for MAF and OEM candidate strings."""
    raw_input: str = Field(..., description="Original raw MAF reference as extracted or input")
    normalized_value: str = Field(..., description="Sanitized standardized MAF certificate reference")
    is_normalized: bool = Field(..., description="True if delimiter or case normalization occurred")
    normalization_notes: List[str] = Field(
        default_factory=list, description="Itemized audit trail of applied normalization transformations"
    )


class MAFStructureBreakdown(BaseModel):
    """Structured breakdown of decomposed Manufacturer Authorization Form (MAF) evidence."""
    maf_reference: Optional[str] = Field(default=None, description="Standardized certificate reference code")
    manufacturer_name: str = Field(..., description="Original Equipment Manufacturer legal entity name")
    authorized_partner_name: str = Field(..., description="Authorized Bidder / Reseller legal entity name")
    tender_reference: Optional[str] = Field(default=None, description="Tender / Bid reference number")
    valid_from: Optional[str] = Field(default=None, description="Authorization start date string (YYYY-MM-DD)")
    valid_until: Optional[str] = Field(default=None, description="Authorization expiration date string (YYYY-MM-DD)")
    scope_of_authorization: Optional[str] = Field(default=None, description="Authorized products, series, or domains")
    signatory_name: Optional[str] = Field(default=None, description="Authorised Signatory name from MAF")
    signatory_designation: Optional[str] = Field(default=None, description="Authorised Signatory job title")
    temporal_standing: str = Field(default="ACTIVE", description="ACTIVE, EXPIRED, NOT_YET_EFFECTIVE, or NOT_SPECIFIED")


class OEMManufacturerItem(BaseModel):
    """Reference directory item for recognized OEMs in the database."""
    oem_name: str = Field(..., description="Standardized OEM entity name")
    program_name: str = Field(..., description="Partner authorization program name")
    supported_product_lines: List[str] = Field(default_factory=list, description="Supported equipment lines")
    active_partners_count: int = Field(default=0, description="Count of active certified partners in mock database")


class OEMValidationRequest(BaseModel):
    """Request payload for Manufacturer Authorization Form (MAF) validation."""
    oem_name: str = Field(..., description="Original Equipment Manufacturer legal name (e.g. Cisco Systems)")
    authorized_partner_name: str = Field(..., description="Authorized Bidder / Reseller legal name")
    maf_number: Optional[str] = Field(default=None, description="MAF / Authorization certificate reference number")
    tender_ref_number: Optional[str] = Field(default=None, description="Tender / Bid reference number in MAF")
    valid_from: Optional[date] = Field(default=None, description="Authorization start date")
    valid_until: Optional[date] = Field(default=None, description="Authorization expiration date")
    bid_submission_date: Optional[date] = Field(
        default=None, description="Bid submission date to evaluate validity against (defaults to today)"
    )
    scope_of_authorization: Optional[str] = Field(
        default=None, description="Authorised products, models, or service categories"
    )
    signatory_name: Optional[str] = Field(default=None, description="Authorised Signatory name from MAF")
    signatory_designation: Optional[str] = Field(default=None, description="Authorised Signatory job title")


class OEMDeterministicResult(BaseModel):
    """Deterministic evaluation of supplied MAF metadata."""
    is_oem_name_provided: bool = Field(..., description="True if OEM name is non-empty")
    is_partner_name_provided: bool = Field(..., description="True if partner name is non-empty")
    is_maf_number_provided: bool = Field(..., description="True if MAF certificate number is provided")
    is_tender_ref_provided: bool = Field(..., description="True if specific tender ref is provided")
    is_date_range_valid: bool = Field(..., description="True if valid_until is on or after valid_from")
    is_expired: bool = Field(..., description="True if authorization has expired relative to evaluation date")
    is_valid_on_bid_date: bool = Field(..., description="True if bid date falls within valid_from and valid_until")
    days_until_expiry: Optional[int] = Field(default=None, description="Days remaining until expiry; negative if expired")
    validation_errors: List[str] = Field(default_factory=list, description="Deterministic validation errors")
    metadata_notice: str = Field(
        default=OEM_METADATA_DISCLAIMER, description="Advisory note on metadata scope"
    )
    structure_breakdown: Optional[MAFStructureBreakdown] = Field(
        default=None, description="Structured 6-part decomposition of MAF metadata"
    )
    normalization: Optional[OEMNormalizationDetails] = Field(
        default=None, description="Auditable normalization provenance details"
    )


class OEMRegistryRecord(BaseModel):
    """Mock registry record for known OEM authorization programs."""
    oem_name: str = Field(..., description="Standard OEM entity name")
    authorized_partner_name: str = Field(..., description="Registered partner entity name")
    maf_number: str = Field(..., description="Registered MAF certificate number")
    is_officially_recognized_oem: bool = Field(default=True, description="True if OEM is registered in program")
    is_partner_in_oem_database: bool = Field(default=True, description="True if partner is an authorized reseller")
    authorization_status: str = Field(default="Active Authorized Partner", description="Partner standing")
    product_categories: List[str] = Field(default_factory=list, description="Authorized product lines")
    notes: Optional[str] = Field(default=None, description="Additional partner notes")


class OEMRegistryResult(BaseModel):
    """Registry lookup result for OEM authorization."""
    registry_found: bool = Field(..., description="True only if OEM/MAF record exists in registry")
    source: VerificationSource = Field(default=VerificationSource.MOCK_REGISTRY, description="Lookup provider source")
    record: Optional[OEMRegistryRecord] = Field(default=None, description="Registry record if found, else null")
    status_message: str = Field(..., description="Explanation of registry search outcome")


class OEMValidationResponse(BaseModel):
    """Complete response for OEM MAF validation endpoint."""
    oem_name: str = Field(..., description="Input OEM name")
    authorized_partner_name: str = Field(..., description="Input partner name")
    maf_number: Optional[str] = Field(default=None, description="Input MAF number")
    deterministic: OEMDeterministicResult = Field(..., description="Deterministic metadata checks")
    registry: OEMRegistryResult = Field(..., description="Registry provider lookup results")
    overall_status: ValidationStatus = Field(..., description="Aggregated validation status")
    is_live_government_source: bool = Field(
        default=False, description="Always False; indicates mock provider"
    )
    disclaimer: str = Field(default=OEM_METADATA_DISCLAIMER, description="Legal disclaimer")


# ==========================================
# Preset Demonstration Scenarios
# ==========================================

class PresetComplianceScenario(BaseModel):
    """Pre-built test scenario for API testing and interactive demo UI."""
    id: str = Field(..., description="Unique scenario identifier")
    name: str = Field(..., description="Scenario display name")
    category: str = Field(..., description="Scenario category tag")
    description: str = Field(..., description="Detailed description of what this scenario demonstrates")
    gstin_request: Optional[GSTINValidationRequest] = Field(default=None)
    pan_request: Optional[PANValidationRequest] = Field(default=None)
    udyam_request: Optional[UdyamValidationRequest] = Field(default=None)
    oem_request: Optional[OEMValidationRequest] = Field(default=None)
