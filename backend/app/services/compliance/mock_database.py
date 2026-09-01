from typing import Dict, List, Optional
from app.schemas.statutory import (
    EnterpriseMajorActivity,
    EnterpriseType,
    GSTINRegistryRecord,
    MSMEPolicyAdvisory,
    OEMRegistryRecord,
    PANEntityType,
    PANRegistryRecord,
    TaxpayerStatus,
    UdyamRegistryRecord,
)

# ==============================================================================
# Curated Mock GSTIN Database (Fixed Canonical Test Fixtures)
# ==============================================================================
MOCK_GSTIN_DB: Dict[str, GSTINRegistryRecord] = {
    # 1. Tech Mahindra Ltd - Active Corporate in Maharashtra (27)
    "27AAACT2727Q1ZW": GSTINRegistryRecord(
        legal_name="TECH MAHINDRA LIMITED",
        trade_name="TECH MAHINDRA",
        status=TaxpayerStatus.ACTIVE,
        taxpayer_type="Regular",
        registration_date="2017-07-01",
        principal_place_of_business="Gateway Building, Apollo Bunder, Mumbai, Maharashtra - 400001",
        state="Maharashtra",
        is_filing_up_to_date=True,
        last_updated="2026-08-15",
        is_composition_dealer=False,
        filing_status_summary="GSTR-1 and GSTR-3B filed up to July 2026. No compliance defaults flagged.",
    ),
    # 2. Infosys Ltd - Active Corporate in Karnataka (29)
    "29AAACH2702H1ZW": GSTINRegistryRecord(
        legal_name="INFOSYS LIMITED",
        trade_name="INFOSYS",
        status=TaxpayerStatus.ACTIVE,
        taxpayer_type="Regular",
        registration_date="2017-07-01",
        principal_place_of_business="Electronics City, Hosur Road, Bengaluru, Karnataka - 560100",
        state="Karnataka",
        is_filing_up_to_date=True,
        last_updated="2026-08-20",
        is_composition_dealer=False,
        filing_status_summary="GSTR-1 and GSTR-3B filed up to July 2026. Compliant taxpayer record.",
    ),
    # 3. Bharat Electronics Ltd (Govt/PSU) - Active in Karnataka (29)
    "29AAACB1976G1ZM": GSTINRegistryRecord(
        legal_name="BHARAT ELECTRONICS LIMITED",
        trade_name="BEL",
        status=TaxpayerStatus.ACTIVE,
        taxpayer_type="Regular (PSU)",
        registration_date="2017-07-01",
        principal_place_of_business="Outer Ring Road, Nagavara, Bengaluru, Karnataka - 560045",
        state="Karnataka",
        is_filing_up_to_date=True,
        last_updated="2026-08-25",
        is_composition_dealer=False,
        filing_status_summary="Public Sector Undertaking; statutory filings verified current.",
    ),
    # 4. NexaTech Solutions LLP - Active MSME Vendor in Delhi (07)
    "07AABFN1234F1ZS": GSTINRegistryRecord(
        legal_name="NEXATECH INNOVATIONS LLP",
        trade_name="NEXATECH SYSTEMS",
        status=TaxpayerStatus.ACTIVE,
        taxpayer_type="Regular",
        registration_date="2019-04-12",
        principal_place_of_business="Okhla Industrial Area Phase-III, New Delhi, Delhi - 110020",
        state="Delhi",
        is_filing_up_to_date=True,
        last_updated="2026-07-30",
        is_composition_dealer=False,
        filing_status_summary="GSTR-1 & GSTR-3B filings up to date for Q1 FY 2026-27.",
    ),
    # 5. Apex Infotech - Suspended Taxpayer in Uttar Pradesh (09)
    "09AABCA5678A1ZT": GSTINRegistryRecord(
        legal_name="APEX INFOTECH PRIVATE LIMITED",
        trade_name="APEX INFO",
        status=TaxpayerStatus.SUSPENDED,
        taxpayer_type="Regular",
        registration_date="2018-09-10",
        principal_place_of_business="Sector 62, Noida, Uttar Pradesh - 201309",
        state="Uttar Pradesh",
        is_filing_up_to_date=False,
        last_updated="2026-06-10",
        is_composition_dealer=False,
        filing_status_summary="Filing defaults: GSTR-3B overdue for 6 consecutive tax periods. Registration SUSPENDED under Rule 21A.",
    ),
    # 6. Defunct Trading Corp - Cancelled Taxpayer in Maharashtra (27)
    "27AAACD9999D1Z7": GSTINRegistryRecord(
        legal_name="DEFUNCT TRADING ENTERPRISES PRIVATE LIMITED",
        trade_name="DEFUNCT TRADING",
        status=TaxpayerStatus.CANCELLED,
        taxpayer_type="Regular",
        registration_date="2017-08-15",
        principal_place_of_business="MIDC Andheri East, Mumbai, Maharashtra - 400093",
        state="Maharashtra",
        is_filing_up_to_date=False,
        last_updated="2025-12-01",
        is_composition_dealer=False,
        filing_status_summary="Registration CANCELLED suo-moto by tax authority on 2025-12-01 due to non-commencement of business.",
    ),
    # 7. Rajesh Kumar Sharma - Individual Proprietorship in Haryana (06)
    "06APSPS4321P1Z5": GSTINRegistryRecord(
        legal_name="RAJESH KUMAR SHARMA",
        trade_name="SHARMA ELECTRICALS & IT WORKS",
        status=TaxpayerStatus.ACTIVE,
        taxpayer_type="Regular",
        registration_date="2020-01-15",
        principal_place_of_business="Cyber City, Gurugram, Haryana - 122002",
        state="Haryana",
        is_filing_up_to_date=True,
        last_updated="2026-08-10",
        is_composition_dealer=False,
        filing_status_summary="Individual proprietorship; quarterly return filing compliant.",
    ),
    # 8. Gujarat Enterprise - Composition Taxpayer in Gujarat (24)
    "24AAACG1234G1Z8": GSTINRegistryRecord(
        legal_name="GUJARAT TRADING & HARDWARE ENTERPRISES",
        trade_name="GUJARAT HARDWARE",
        status=TaxpayerStatus.ACTIVE,
        taxpayer_type="Composition",
        registration_date="2021-02-10",
        principal_place_of_business="GIDC Estate, Vatva, Ahmedabad, Gujarat - 382445",
        state="Gujarat",
        is_filing_up_to_date=True,
        last_updated="2026-08-12",
        is_composition_dealer=True,
        composition_advisory_note="Taxpayer is registered under Section 10 Composition Scheme (CMP-08 quarterly statement compliant). Note: Composition taxpayers cannot issue tax invoices or charge GST to buyers.",
        filing_status_summary="CMP-08 statements filed up to Q1 FY 2026-27.",
    ),
}


# ==============================================================================
# Curated Mock PAN Database
# ==============================================================================
MOCK_PAN_DB: Dict[str, PANRegistryRecord] = {
    "AAACT2727Q": PANRegistryRecord(
        full_name="TECH MAHINDRA LIMITED",
        pan_status="Active",
        entity_type=PANEntityType.COMPANY,
        aadhaar_seeding_status="Not Applicable (Corporate)",
        category="Domestic Company",
        last_updated="2026-08-15",
    ),
    "AAACH2702H": PANRegistryRecord(
        full_name="INFOSYS LIMITED",
        pan_status="Active",
        entity_type=PANEntityType.COMPANY,
        aadhaar_seeding_status="Not Applicable (Corporate)",
        category="Domestic Company",
        last_updated="2026-08-20",
    ),
    "AAACB1976G": PANRegistryRecord(
        full_name="BHARAT ELECTRONICS LIMITED",
        pan_status="Active",
        entity_type=PANEntityType.GOVERNMENT,
        aadhaar_seeding_status="Not Applicable (PSU)",
        category="Public Sector Undertaking",
        last_updated="2026-08-25",
    ),
    "AABFN1234F": PANRegistryRecord(
        full_name="NEXATECH INNOVATIONS LLP",
        pan_status="Active",
        entity_type=PANEntityType.PARTNERSHIP_FIRM_LLP,
        aadhaar_seeding_status="Not Applicable (LLP)",
        category="Limited Liability Partnership",
        last_updated="2026-07-30",
    ),
    "AABCA5678A": PANRegistryRecord(
        full_name="APEX INFOTECH PRIVATE LIMITED",
        pan_status="Active",
        entity_type=PANEntityType.COMPANY,
        aadhaar_seeding_status="Not Applicable (Corporate)",
        category="Domestic Company",
        last_updated="2026-06-10",
    ),
    "AAACD9999D": PANRegistryRecord(
        full_name="DEFUNCT TRADING ENTERPRISES PRIVATE LIMITED",
        pan_status="Inactive",
        entity_type=PANEntityType.COMPANY,
        aadhaar_seeding_status="Not Applicable (Corporate)",
        category="Domestic Company",
        last_updated="2025-12-01",
    ),
    "APSPS4321P": PANRegistryRecord(
        full_name="RAJESH KUMAR SHARMA",
        pan_status="Active",
        entity_type=PANEntityType.INDIVIDUAL,
        aadhaar_seeding_status="Seeded / Linked",
        category="Individual Resident",
        last_updated="2026-08-10",
    ),
    "ABCDE1234F": PANRegistryRecord(
        full_name="FIRST CAPITAL ENTERPRISE LLP",
        pan_status="Active",
        entity_type=PANEntityType.PARTNERSHIP_FIRM_LLP,
        aadhaar_seeding_status="Not Applicable",
        category="Limited Liability Partnership",
        last_updated="2026-05-12",
    ),
    "ABCHC1234H": PANRegistryRecord(
        full_name="CHOPRA HINDU UNDIVIDED FAMILY",
        pan_status="Active",
        entity_type=PANEntityType.HUF,
        aadhaar_seeding_status="Not Applicable (HUF)",
        category="Hindu Undivided Family",
        last_updated="2026-06-15",
    ),
    "ABCTT1234T": PANRegistryRecord(
        full_name="TAGORE EDUCATIONAL TRUST",
        pan_status="Active",
        entity_type=PANEntityType.TRUST,
        aadhaar_seeding_status="Not Applicable (Trust)",
        category="Registered Trust",
        last_updated="2026-04-18",
    ),
}


# ==============================================================================
# Curated Mock Udyam (MSME) Database
# ==============================================================================
MOCK_UDYAM_DB: Dict[str, UdyamRegistryRecord] = {
    # 1. Micro Manufacturer in Delhi (DL-01)
    "UDYAM-DL-01-0012345": UdyamRegistryRecord(
        enterprise_name="NEXATECH INNOVATIONS LLP",
        enterprise_tier=EnterpriseType.MICRO,
        major_activity=EnterpriseMajorActivity.MANUFACTURING,
        nic_codes=["26201", "26202", "62011"],  # Manufacturing of computers, peripheral units, software
        dic_name="DIC Okhla New Delhi",
        date_of_registration="2021-03-15",
        date_of_incorporation="2019-04-12",
        organization_type="Limited Liability Partnership",
        state="Delhi",
        advisory_benefits=MSMEPolicyAdvisory(
            emd_exemption_eligible=True,
            prior_experience_turnover_relaxation_eligible=True,
            purchase_preference_eligible=True,
        ),
    ),
    # 2. Small Services Provider in Karnataka (KR-03)
    "UDYAM-KR-03-0098765": UdyamRegistryRecord(
        enterprise_name="KAVERI CLOUD INFRASTRUCTURE SERVICES",
        enterprise_tier=EnterpriseType.SMALL,
        major_activity=EnterpriseMajorActivity.SERVICES,
        nic_codes=["62020", "62099"],  # IT consultancy and related services
        dic_name="DIC Bengaluru Urban",
        date_of_registration="2020-11-20",
        date_of_incorporation="2018-06-01",
        organization_type="Private Limited Company",
        state="Karnataka",
        advisory_benefits=MSMEPolicyAdvisory(
            emd_exemption_eligible=True,
            prior_experience_turnover_relaxation_eligible=True,
            purchase_preference_eligible=True,
        ),
    ),
    # 3. Medium Trading / Reseller Entity in Maharashtra (MH-12) - Note Trading activity limitations
    "UDYAM-MH-12-0054321": UdyamRegistryRecord(
        enterprise_name="VANGUARD COMMERCIAL TRADERS PRIVATE LIMITED",
        enterprise_tier=EnterpriseType.MEDIUM,
        major_activity=EnterpriseMajorActivity.TRADING,
        nic_codes=["46511", "46520"],  # Wholesale of computers, computer peripheral equipment and software
        dic_name="DIC Pune",
        date_of_registration="2022-01-10",
        date_of_incorporation="2015-08-22",
        organization_type="Private Limited Company",
        state="Maharashtra",
        advisory_benefits=MSMEPolicyAdvisory(
            emd_exemption_eligible=False,  # Trading/retail activities usually excluded from public procurement EMD waivers
            emd_exemption_advisory="Advisory Note: Pure trading/reselling MSMEs are generally ineligible for public procurement EMD/experience waivers under MSME Order 2012 unless offering self-manufactured products/services.",
            prior_experience_turnover_relaxation_eligible=False,
            purchase_preference_eligible=False,
        ),
    ),
}


# ==============================================================================
# Curated Mock OEM / MAF Database
# ==============================================================================
MOCK_OEM_DB: List[OEMRegistryRecord] = [
    # 1. Cisco Systems active partner
    OEMRegistryRecord(
        oem_name="CISCO SYSTEMS INDIA PRIVATE LIMITED",
        authorized_partner_name="NEXATECH INNOVATIONS LLP",
        maf_number="MAF-CSCO-2026-8891",
        is_officially_recognized_oem=True,
        is_partner_in_oem_database=True,
        authorization_status="Active Premier Certified Partner",
        product_categories=["Enterprise Networking", "Cybersecurity", "Data Center Hardware"],
        notes="Authorized for GeM Tender Bidding in India territory for FY 2026-27.",
    ),
    # 2. Hewlett Packard Enterprise active partner
    OEMRegistryRecord(
        oem_name="HEWLETT PACKARD ENTERPRISE INDIA PRIVATE LIMITED",
        authorized_partner_name="TECH MAHINDRA LIMITED",
        maf_number="HPE-IND-MAF-2026-0045",
        is_officially_recognized_oem=True,
        is_partner_in_oem_database=True,
        authorization_status="Active Platinum Partner",
        product_categories=["Servers", "Storage", "HCI Solutions"],
        notes="Global System Integrator agreement active.",
    ),
    # 3. Dell Technologies revoked/expired partner
    OEMRegistryRecord(
        oem_name="DELL INTERNATIONAL SERVICES INDIA PRIVATE LIMITED",
        authorized_partner_name="APEX INFOTECH PRIVATE LIMITED",
        maf_number="DELL-MAF-2024-9102",
        is_officially_recognized_oem=True,
        is_partner_in_oem_database=False,
        authorization_status="Revoked / Non-Compliant",
        product_categories=["Client Solutions", "Workstations"],
        notes="Partner authorization revoked in 2025 due to compliance default.",
    ),
]
