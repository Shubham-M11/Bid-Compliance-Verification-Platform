from datetime import date
from typing import List
from app.schemas.statutory import (
    GSTINValidationRequest,
    OEMValidationRequest,
    PANValidationRequest,
    PresetComplianceScenario,
    UdyamValidationRequest,
)

PRESET_SCENARIOS: List[PresetComplianceScenario] = [
    PresetComplianceScenario(
        id="scn_corporate_compliant",
        name="Fully Compliant Corporate (Tech Mahindra Ltd)",
        category="Compliant Corporate",
        description="Demonstrates a verified active corporate taxpayer in Maharashtra with consistent PAN, valid Luhn Mod-36 checksum, and active HPE Platinum MAF authorization.",
        gstin_request=GSTINValidationRequest(
            gstin="27AAACT2727Q1ZW",
            expected_legal_name="Tech Mahindra Limited",
            expected_state_code="27",
        ),
        pan_request=PANValidationRequest(
            pan="AAACT2727Q",
            expected_legal_name="Tech Mahindra Limited",
        ),
        oem_request=OEMValidationRequest(
            oem_name="Hewlett Packard Enterprise India Private Limited",
            authorized_partner_name="Tech Mahindra Limited",
            maf_number="HPE-IND-MAF-2026-0045",
            tender_ref_number="GEM/2026/B/890123",
            valid_from=date(2026, 1, 1),
            valid_until=date(2027, 3, 31),
            scope_of_authorization="Enterprise Servers and High Availability Storage Solutions",
            signatory_name="Arun Sundaram",
            signatory_designation="Director - Public Sector Alliances",
        ),
    ),
    PresetComplianceScenario(
        id="scn_msme_manufacturer",
        name="Compliant MSME Micro Manufacturer (NexaTech Innovations LLP)",
        category="MSME Manufacturer",
        description="Demonstrates an active Delhi MSME Micro enterprise eligible for advisory EMD waiver, with active Cisco Systems MAF and matching LLP entity classification.",
        gstin_request=GSTINValidationRequest(
            gstin="07AABFN1234F1ZS",
            expected_legal_name="NexaTech Innovations LLP",
            expected_state_code="07",
        ),
        pan_request=PANValidationRequest(
            pan="AABFN1234F",
            expected_legal_name="NexaTech Innovations LLP",
        ),
        udyam_request=UdyamValidationRequest(
            udyam_registration_number="UDYAM-DL-01-0012345",
            expected_enterprise_name="NexaTech Innovations LLP",
        ),
        oem_request=OEMValidationRequest(
            oem_name="Cisco Systems India Private Limited",
            authorized_partner_name="NexaTech Innovations LLP",
            maf_number="MAF-CSCO-2026-8891",
            tender_ref_number="GEM/2026/B/445566",
            valid_from=date(2026, 4, 1),
            valid_until=date(2027, 3, 31),
            scope_of_authorization="Enterprise Switching & Edge Security Firewalls",
            signatory_name="Priya Nair",
            signatory_designation="Regional Channel Lead",
        ),
    ),
    PresetComplianceScenario(
        id="scn_taxpayer_suspended",
        name="Suspended Taxpayer & Revoked MAF (Apex Infotech Pvt Ltd)",
        category="High Risk & Defaulter",
        description="Demonstrates a taxpayer with a valid checksum and format whose GST registration is SUSPENDED for filing defaults, alongside a revoked OEM authorization.",
        gstin_request=GSTINValidationRequest(
            gstin="09AABCA5678A1ZT",
            expected_legal_name="Apex Infotech Private Limited",
            expected_state_code="09",
        ),
        pan_request=PANValidationRequest(
            pan="AABCA5678A",
            expected_legal_name="Apex Infotech Private Limited",
        ),
        oem_request=OEMValidationRequest(
            oem_name="Dell International Services India Private Limited",
            authorized_partner_name="Apex Infotech Private Limited",
            maf_number="DELL-MAF-2024-9102",
            tender_ref_number="GEM/2026/B/112233",
            valid_from=date(2024, 1, 1),
            valid_until=date(2025, 12, 31),
            scope_of_authorization="Workstations and Commercial Desktops",
        ),
    ),
    PresetComplianceScenario(
        id="scn_invalid_checksum",
        name="Corrupted GSTIN Checksum & State Mismatch",
        category="Algorithmic Violation",
        description="Demonstrates algorithmic detection of an invalid 15th character Mod-36 checksum and state code discrepancy (Karnataka prefix 29 vs expected Maharashtra 27).",
        gstin_request=GSTINValidationRequest(
            gstin="29AAACH2702H1ZZ",  # Correct 15th char is W; Z will fail checksum
            expected_legal_name="Infosys Limited",
            expected_state_code="27",  # State mismatch: 29 != 27
        ),
        pan_request=PANValidationRequest(
            pan="AAACH2702H",
            expected_legal_name="Infosys Limited",
        ),
    ),
    PresetComplianceScenario(
        id="scn_expired_oem_maf",
        name="Expired Manufacturer Authorization Form (MAF)",
        category="Expired Authorization",
        description="Demonstrates deterministic detection of an expired MAF validity window where valid_until date has already passed relative to bid date.",
        oem_request=OEMValidationRequest(
            oem_name="Cisco Systems India Private Limited",
            authorized_partner_name="NexaTech Innovations LLP",
            maf_number="MAF-CSCO-2024-1100",
            tender_ref_number="GEM/2026/B/778899",
            valid_from=date(2024, 1, 1),
            valid_until=date(2024, 12, 31),
            scope_of_authorization="Routing and Switching Equipment",
            signatory_name="Vikram Sethi",
            signatory_designation="Vice President - Channels",
        ),
    ),
    PresetComplianceScenario(
        id="scn_unregistered_valid_format",
        name="Structurally Valid but Unregistered (Mock Absence)",
        category="Registry Absence",
        description="Demonstrates an authentic Tamil Nadu GSTIN with valid Mod-36 checksum that is NOT in the curated mock registry, illustrating clear separation of deterministic validation from mock absence.",
        gstin_request=GSTINValidationRequest(
            gstin="33AAACA6529K1ZQ",
            expected_legal_name="Ashok Leyland Limited",
            expected_state_code="33",
        ),
        pan_request=PANValidationRequest(
            pan="AAACA6529K",
            expected_legal_name="Ashok Leyland Limited",
        ),
    ),
]
