import pytest
from app.schemas.composite import (
    CheckStatus,
    CompositeStatus,
    CrossConsistencyCheckResult,
    FindingSeverity,
    RiskLevel,
)
from app.schemas.statutory import (
    GSTINDeterministicResult,
    GSTINRegistryRecord,
    GSTINRegistryResult,
    GSTINValidationResponse,
    OEMDeterministicResult,
    OEMRegistryResult,
    OEMValidationResponse,
    PANDeterministicResult,
    PANRegistryResult,
    PANValidationResponse,
    TaxpayerStatus,
    ValidationStatus,
)
from app.services.compliance.scoring_engine import ComplianceScoringEngine


class TestComplianceScoringEngine:
    """Test explainable risk scoring, anti-double-counting, and decision-support guidance."""

    def setup_method(self):
        self.engine = ComplianceScoringEngine()

    def test_fully_compliant_corporate_scores_100_low_risk(self):
        gstin_resp = GSTINValidationResponse(
            gstin="27AAACT2727Q1ZW",
            deterministic=GSTINDeterministicResult(
                is_format_valid=True,
                is_state_code_valid=True,
                is_checksum_valid=True,
            ),
            registry=GSTINRegistryResult(
                registry_found=True,
                record=GSTINRegistryRecord(
                    legal_name="TECH MAHINDRA LIMITED",
                    status=TaxpayerStatus.ACTIVE,
                ),
                status_message="Found",
            ),
            overall_status=ValidationStatus.VALID,
        )
        pan_resp = PANValidationResponse(
            pan="AAACT2727Q",
            deterministic=PANDeterministicResult(is_format_valid=True),
            registry=PANRegistryResult(registry_found=True, status_message="Found"),
            overall_status=ValidationStatus.VALID,
        )
        oem_resp = OEMValidationResponse(
            oem_name="Hewlett Packard Enterprise",
            authorized_partner_name="Tech Mahindra Limited",
            deterministic=OEMDeterministicResult(
                is_oem_name_provided=True,
                is_partner_name_provided=True,
                is_maf_number_provided=True,
                is_tender_ref_provided=True,
                is_date_range_valid=True,
                is_expired=False,
                is_valid_on_bid_date=True,
                days_until_expiry=180,
            ),
            registry=OEMRegistryResult(registry_found=True, status_message="Found"),
            overall_status=ValidationStatus.VALID,
        )

        consistency_pass = [
            CrossConsistencyCheckResult(
                rule_id="R-01",
                rule_name="PAN-GST Match",
                category="Identity",
                status=CheckStatus.PASS,
                severity=FindingSeverity.INFO,
                summary="Matched",
            ),
            CrossConsistencyCheckResult(
                rule_id="R-02",
                rule_name="Legal Name Match",
                category="Identity",
                status=CheckStatus.PASS,
                severity=FindingSeverity.INFO,
                summary="Matched",
            ),
        ]

        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=gstin_resp,
            pan_resp=pan_resp,
            udyam_resp=None,
            oem_resp=oem_resp,
            consistency_results=consistency_pass,
        )

        assert score == 100
        assert risk == RiskLevel.LOW_RISK
        # Decision-support language check (MANDATORY REFINEMENT #3: Never say 'automatically approved')
        assert "proceed to standard tender evaluation workflow" in guidance.lower()
        assert "automatically approved" not in guidance.lower()
        assert status == CompositeStatus.COMPLIANT

    def test_suspended_taxpayer_high_risk_deduction(self):
        gstin_resp = GSTINValidationResponse(
            gstin="09AABCA5678A1ZT",
            deterministic=GSTINDeterministicResult(
                is_format_valid=True,
                is_state_code_valid=True,
                is_checksum_valid=True,
            ),
            registry=GSTINRegistryResult(
                registry_found=True,
                record=GSTINRegistryRecord(
                    legal_name="Apex Infotech Pvt Ltd",
                    status=TaxpayerStatus.SUSPENDED,
                    is_filing_up_to_date=False,
                ),
                status_message="Found",
            ),
            overall_status=ValidationStatus.VALID,
        )

        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=gstin_resp,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=[],
        )

        # Suspended taxpayer drops 30 points -> 70, but has critical failure -> HIGH_RISK
        assert score == 70
        assert risk == RiskLevel.HIGH_RISK
        assert "manual officer review required" in guidance.lower()
        assert any(b.rule_id == "STAT-GST-03" for b in breakdown)
        assert any("SUSPENDED" in f.description for f in findings)

    def test_anti_double_counting_for_state_warning(self):
        """
        MANDATORY REFINEMENT #2 & #4: State code mismatch warning has 0-pt penalty and
        does not double-penalize a compliant bidder.
        """
        warning_check = CrossConsistencyCheckResult(
            rule_id="R-07",
            rule_name="State Alignment",
            category="Geographic Jurisdiction",
            status=CheckStatus.WARNING,
            severity=FindingSeverity.LOW,
            summary="State mismatch warning (acceptable for multi-state operations)",
        )

        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=None,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=[warning_check],
        )

        # Base 100 with 0-pt state warning deduction
        assert score == 100
        assert risk == RiskLevel.LOW_RISK
        assert status == CompositeStatus.CONDITIONAL_COMPLIANCE
        assert any(b.rule_id == "R-07" and b.points_change == 0 for b in breakdown)
