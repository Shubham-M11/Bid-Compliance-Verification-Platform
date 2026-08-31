from datetime import date, timedelta
import pytest
from app.schemas.composite import BidMetadata, CheckStatus, FindingSeverity
from app.schemas.statutory import (
    GSTINDeterministicResult,
    GSTINRegistryRecord,
    GSTINRegistryResult,
    GSTINValidationResponse,
    OEMDeterministicResult,
    OEMRegistryResult,
    OEMValidationResponse,
    PANDeterministicResult,
    PANEntityType,
    PANRegistryRecord,
    PANRegistryResult,
    PANValidationResponse,
    TaxpayerStatus,
    UdyamDeterministicResult,
    UdyamRegistryRecord,
    UdyamRegistryResult,
    UdyamValidationResponse,
    ValidationStatus,
)
from app.services.compliance.cross_consistency import CrossConsistencyEngine


class TestCrossConsistencyEngine:
    """Test all 7 cross-entity relational consistency rules."""

    def setup_method(self):
        self.engine = CrossConsistencyEngine()

    def test_r01_pan_gstin_embedded_match(self):
        gstin_resp = GSTINValidationResponse(
            gstin="27AAACT2727Q1ZW",
            deterministic=GSTINDeterministicResult(
                is_format_valid=True,
                extracted_pan="AAACT2727Q",
                is_checksum_valid=True,
            ),
            registry=GSTINRegistryResult(registry_found=True, status_message="Found"),
            overall_status=ValidationStatus.VALID,
        )
        pan_resp = PANValidationResponse(
            pan="AAACT2727Q",
            deterministic=PANDeterministicResult(is_format_valid=True),
            registry=PANRegistryResult(registry_found=True, status_message="Found"),
            overall_status=ValidationStatus.VALID,
        )

        res = self.engine._check_r01_pan_gstin_embedded(gstin_resp, pan_resp)
        assert res.status == CheckStatus.PASS
        assert res.severity == FindingSeverity.INFO
        assert res.rule_id == "R-01"

    def test_r01_pan_gstin_embedded_mismatch(self):
        gstin_resp = GSTINValidationResponse(
            gstin="27AAACT2727Q1ZW",
            deterministic=GSTINDeterministicResult(
                is_format_valid=True,
                extracted_pan="AAACT2727Q",
                is_checksum_valid=True,
            ),
            registry=GSTINRegistryResult(registry_found=True, status_message="Found"),
            overall_status=ValidationStatus.VALID,
        )
        pan_resp = PANValidationResponse(
            pan="BBBCB9999B",
            deterministic=PANDeterministicResult(is_format_valid=True),
            registry=PANRegistryResult(registry_found=True, status_message="Found"),
            overall_status=ValidationStatus.VALID,
        )

        res = self.engine._check_r01_pan_gstin_embedded(gstin_resp, pan_resp)
        assert res.status == CheckStatus.FAIL
        assert res.severity == FindingSeverity.HIGH
        assert "PAN mismatch" in res.evidence[0].finding_description

    def test_r02_legal_name_consistency_exact_and_partial(self):
        gstin_resp = GSTINValidationResponse(
            gstin="27AAACT2727Q1ZW",
            deterministic=GSTINDeterministicResult(is_format_valid=True),
            registry=GSTINRegistryResult(
                registry_found=True,
                record=GSTINRegistryRecord(legal_name="TECH MAHINDRA LIMITED"),
                status_message="Found",
            ),
            overall_status=ValidationStatus.VALID,
        )
        pan_resp = PANValidationResponse(
            pan="AAACT2727Q",
            deterministic=PANDeterministicResult(is_format_valid=True),
            registry=PANRegistryResult(
                registry_found=True,
                record=PANRegistryRecord(
                    full_name="TECH MAHINDRA LIMITED",
                    entity_type=PANEntityType.COMPANY,
                ),
                status_message="Found",
            ),
            overall_status=ValidationStatus.VALID,
        )

        # 1. Matching names
        res_pass = self.engine._check_r02_legal_name_consistency(
            gstin_resp, pan_resp, None, None, None, None
        )
        assert res_pass.status == CheckStatus.PASS

        # 2. Significant Mismatch
        pan_resp_mismatch = PANValidationResponse(
            pan="AAACT2727Q",
            deterministic=PANDeterministicResult(is_format_valid=True),
            registry=PANRegistryResult(
                registry_found=True,
                record=PANRegistryRecord(
                    full_name="COMPLETELY DIFFERENT VENDOR PRIVATE LIMITED",
                    entity_type=PANEntityType.COMPANY,
                ),
                status_message="Found",
            ),
            overall_status=ValidationStatus.VALID,
        )
        res_fail = self.engine._check_r02_legal_name_consistency(
            gstin_resp, pan_resp_mismatch, None, None, None, None
        )
        assert res_fail.status == CheckStatus.FAIL
        assert res_fail.severity == FindingSeverity.HIGH

    def test_r03_bidder_oem_partner_match(self):
        bid_meta = BidMetadata(expected_bidder_name="NexaTech Innovations LLP")
        oem_resp_match = OEMValidationResponse(
            oem_name="Cisco Systems",
            authorized_partner_name="NexaTech Innovations LLP",
            deterministic=OEMDeterministicResult(
                is_oem_name_provided=True,
                is_partner_name_provided=True,
                is_maf_number_provided=True,
                is_tender_ref_provided=True,
                is_date_range_valid=True,
                is_expired=False,
                is_valid_on_bid_date=True,
            ),
            registry=OEMRegistryResult(registry_found=True, status_message="Found"),
            overall_status=ValidationStatus.VALID,
        )

        res_pass = self.engine._check_r03_bidder_oem_partner_match(
            None, None, oem_resp_match, bid_meta
        )
        assert res_pass.status == CheckStatus.PASS

        oem_resp_mismatch = OEMValidationResponse(
            oem_name="Cisco Systems",
            authorized_partner_name="Random Unrelated Third Party Pvt Ltd",
            deterministic=OEMDeterministicResult(
                is_oem_name_provided=True,
                is_partner_name_provided=True,
                is_maf_number_provided=True,
                is_tender_ref_provided=True,
                is_date_range_valid=True,
                is_expired=False,
                is_valid_on_bid_date=True,
            ),
            registry=OEMRegistryResult(registry_found=True, status_message="Found"),
            overall_status=ValidationStatus.VALID,
        )
        res_fail = self.engine._check_r03_bidder_oem_partner_match(
            None, None, oem_resp_mismatch, bid_meta
        )
        assert res_fail.status == CheckStatus.FAIL
        assert res_fail.severity == FindingSeverity.HIGH

    def test_r05_maf_date_validity_window(self):
        oem_resp_expired = OEMValidationResponse(
            oem_name="Cisco Systems",
            authorized_partner_name="NexaTech",
            deterministic=OEMDeterministicResult(
                is_oem_name_provided=True,
                is_partner_name_provided=True,
                is_maf_number_provided=True,
                is_tender_ref_provided=True,
                is_date_range_valid=True,
                is_expired=True,
                is_valid_on_bid_date=False,
                days_until_expiry=-45,
            ),
            registry=OEMRegistryResult(registry_found=True, status_message="Found"),
            overall_status=ValidationStatus.EXPIRED,
        )
        res = self.engine._check_r05_maf_date_validity(oem_resp_expired, None)
        assert res.status == CheckStatus.FAIL
        assert res.severity == FindingSeverity.CRITICAL

    def test_r06_udyam_organization_pan_compatibility(self):
        pan_resp_company = PANValidationResponse(
            pan="AAACT2727Q",
            deterministic=PANDeterministicResult(
                is_format_valid=True,
                entity_type=PANEntityType.COMPANY,
            ),
            registry=PANRegistryResult(registry_found=True, status_message="Found"),
            overall_status=ValidationStatus.VALID,
        )
        udyam_resp_company = UdyamValidationResponse(
            udyam_registration_number="UDYAM-MH-12-0054321",
            deterministic=UdyamDeterministicResult(is_format_valid=True),
            registry=UdyamRegistryResult(
                registry_found=True,
                record=UdyamRegistryRecord(
                    enterprise_name="Vanguard Traders Pvt Ltd",
                    organization_type="Private Limited Company",
                ),
                status_message="Found",
            ),
            overall_status=ValidationStatus.VALID,
        )

        res = self.engine._check_r06_udyam_entity_compatibility(
            pan_resp_company, udyam_resp_company
        )
        assert res.status == CheckStatus.PASS

    def test_r07_state_mismatch_is_warning_not_failure(self):
        """
        MANDATORY REFINEMENT #2: R-07 GST state vs Udyam state mismatch must be a
        warning/review signal by default, NOT an automatic compliance failure.
        """
        gstin_resp = GSTINValidationResponse(
            gstin="27AAACT2727Q1ZW",  # Maharashtra (27)
            deterministic=GSTINDeterministicResult(
                is_format_valid=True,
                state_code="27",
                state_name="Maharashtra",
                is_state_code_valid=True,
            ),
            registry=GSTINRegistryResult(registry_found=True, status_message="Found"),
            overall_status=ValidationStatus.VALID,
        )
        udyam_resp = UdyamValidationResponse(
            udyam_registration_number="UDYAM-DL-01-0012345",  # Delhi (DL)
            deterministic=UdyamDeterministicResult(
                is_format_valid=True,
                state_code="DL",
                state_name="Delhi",
            ),
            registry=UdyamRegistryResult(registry_found=True, status_message="Found"),
            overall_status=ValidationStatus.VALID,
        )

        res = self.engine._check_r07_state_code_alignment(gstin_resp, udyam_resp, None)
        # Must be WARNING, not FAIL
        assert res.status == CheckStatus.WARNING
        assert res.severity == FindingSeverity.LOW
        assert "Multi-state operations" in res.evidence[0].finding_description
