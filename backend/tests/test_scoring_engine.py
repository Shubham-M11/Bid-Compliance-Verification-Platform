import pytest
from app.schemas.composite import (
    CheckStatus,
    CompositeStatus,
    CrossConsistencyCheckResult,
    FindingSeverity,
    RiskLevel,
    ScoringPolicy,
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
        assert "proceed to standard tender evaluation workflow" in guidance.lower()
        assert "automatically approved" not in guidance.lower()
        assert status == CompositeStatus.COMPLIANT

    def test_maf_expiry_deducted_only_once_anti_double_counting(self):
        """
        Anti-Double-Counting Guardrail:
        When an OEM MAF is expired, STAT-OEM-01 applies the primary deduction (-25 pts).
        Rule R-05 must be recorded as a secondary citation (0 pts) to prevent a double -50 pt penalty.
        """
        oem_resp_expired = OEMValidationResponse(
            oem_name="Cisco Systems India Private Limited",
            authorized_partner_name="NexaTech Innovations LLP",
            maf_number="MAF-CSCO-2024-001",
            deterministic=OEMDeterministicResult(
                is_oem_name_provided=True,
                is_partner_name_provided=True,
                is_maf_number_provided=True,
                is_tender_ref_provided=True,
                is_date_range_valid=True,
                is_expired=True,
                is_valid_on_bid_date=False,
                days_until_expiry=-30,
            ),
            registry=OEMRegistryResult(registry_found=True, status_message="Found"),
            overall_status=ValidationStatus.EXPIRED,
        )

        r05_fail = CrossConsistencyCheckResult(
            rule_id="R-05",
            rule_name="OEM Authorization Date Validity Window",
            category="Authorization Validity",
            status=CheckStatus.FAIL,
            severity=FindingSeverity.CRITICAL,
            summary="MAF authorization is expired (-30 days overdue).",
        )

        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=None,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=oem_resp_expired,
            consistency_results=[r05_fail],
        )

        # Baseline 100 - 25 = 75 (NOT 50!)
        assert score == 75
        assert risk == RiskLevel.HIGH_RISK  # Critical failure present -> HIGH_RISK

        # Check that STAT-OEM-01 is primary and R-05 is secondary with 0-pt change
        stat_oem_entry = next(b for b in breakdown if b.rule_id == "STAT-OEM-01")
        assert stat_oem_entry.points_change == -25
        assert stat_oem_entry.is_primary_penalty is True

        r05_entry = next(b for b in breakdown if b.rule_id == "R-05")
        assert r05_entry.points_change == 0
        assert r05_entry.is_primary_penalty is False
        assert "already applied under STAT-OEM-01" in r05_entry.reason

    def test_score_never_goes_below_zero_clamping(self):
        """Verify cumulative deductions below 0 are cleanly clamped to 0."""
        gstin_cancelled = GSTINValidationResponse(
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
                    status=TaxpayerStatus.CANCELLED,
                ),
                status_message="Found",
            ),
            overall_status=ValidationStatus.RECORD_NOT_FOUND,
        )
        pan_invalid = PANValidationResponse(
            pan="INVALID12",
            deterministic=PANDeterministicResult(is_format_valid=False),
            registry=PANRegistryResult(registry_found=False, status_message="Malformed"),
            overall_status=ValidationStatus.INVALID_FORMAT,
        )

        heavy_fails = [
            CrossConsistencyCheckResult(
                rule_id="R-01",
                rule_name="PAN Mismatch",
                category="Identity",
                status=CheckStatus.FAIL,
                severity=FindingSeverity.HIGH,
                summary="Mismatch",
            ),
            CrossConsistencyCheckResult(
                rule_id="R-02",
                rule_name="Legal Name Mismatch",
                category="Identity",
                status=CheckStatus.FAIL,
                severity=FindingSeverity.HIGH,
                summary="Mismatch",
            ),
            CrossConsistencyCheckResult(
                rule_id="R-03",
                rule_name="OEM Partner Mismatch",
                category="Authorization",
                status=CheckStatus.FAIL,
                severity=FindingSeverity.HIGH,
                summary="Mismatch",
            ),
        ]

        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=gstin_cancelled,  # -35
            pan_resp=pan_invalid,        # -15
            udyam_resp=None,
            oem_resp=None,
            consistency_results=heavy_fails,  # -25, -15, -20 = -60 -> total -110
        )

        assert score == 0  # Clamped to 0
        assert risk == RiskLevel.HIGH_RISK
        assert status == CompositeStatus.NON_COMPLIANT

    def test_multiple_independent_medium_findings(self):
        """Verify multiple independent MEDIUM findings compound cleanly without triggering false critical status."""
        medium_findings = [
            CrossConsistencyCheckResult(
                rule_id="R-02",
                rule_name="Partial Name Variation",
                category="Entity Consistency",
                status=CheckStatus.WARNING,
                severity=FindingSeverity.MEDIUM,
                summary="Partial name variation (72% similarity).",
            ),
            CrossConsistencyCheckResult(
                rule_id="R-04",
                rule_name="Tender Ref Mismatch",
                category="Tender Linkage",
                status=CheckStatus.FAIL,
                severity=FindingSeverity.MEDIUM,
                summary="MAF does not cite tender number.",
            ),
            CrossConsistencyCheckResult(
                rule_id="R-06",
                rule_name="Udyam Org Incompatibility",
                category="MSME Compatibility",
                status=CheckStatus.FAIL,
                severity=FindingSeverity.MEDIUM,
                summary="Proprietorship vs Individual nuance.",
            ),
        ]

        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=None,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=medium_findings,
        )

        # Baseline 100 - (5 + 10 + 10) = 75
        assert score == 75
        assert risk == RiskLevel.MEDIUM_RISK
        assert "manual officer review recommended" in guidance.lower()
        assert status == CompositeStatus.CONDITIONAL_COMPLIANCE

    def test_unknown_mock_registry_records_receive_zero_penalty(self):
        """
        Guardrail: When a GSTIN is structurally valid (valid format, valid state, valid Luhn Mod-36 checksum)
        but absent from the local mock DB, it must NOT receive an arbitrary penalty.
        """
        gstin_valid_unregistered = GSTINValidationResponse(
            gstin="27AAACH2702H1ZW",
            deterministic=GSTINDeterministicResult(
                is_format_valid=True,
                is_state_code_valid=True,
                state_code="27",
                state_name="Maharashtra",
                is_checksum_valid=True,
                extracted_pan="AAACH2702H",
            ),
            registry=GSTINRegistryResult(
                registry_found=False,
                record=None,
                status_message="Record not found in mock database.",
            ),
            overall_status=ValidationStatus.VALID,
        )

        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=gstin_valid_unregistered,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=[],
        )

        assert score == 100
        assert risk == RiskLevel.LOW_RISK
        assert len(breakdown) == 0  # Zero deductions

    def test_every_nonzero_deduction_has_rule_id_severity_and_explanation(self):
        """Every deduction in score_breakdown must be fully explainable."""
        gstin_corrupted = GSTINValidationResponse(
            gstin="27AAACT2727Q1Z9",
            deterministic=GSTINDeterministicResult(
                is_format_valid=True,
                is_state_code_valid=True,
                is_checksum_valid=False,
                checksum_char="9",
                calculated_checksum="W",
            ),
            registry=GSTINRegistryResult(registry_found=False, status_message="Checksum invalid"),
            overall_status=ValidationStatus.INVALID_CHECKSUM,
        )

        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=gstin_corrupted,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=[],
        )

        assert score == 85
        assert len(breakdown) == 1
        item = breakdown[0]
        assert item.rule_id == "STAT-GST-02"
        assert item.severity == FindingSeverity.HIGH
        assert len(item.reason) > 10
        assert item.points_change == -15

    def test_warning_rules_remain_zero_point_contributions(self):
        """MANDATORY REFINEMENT #2: R-07 state code mismatch warning has 0-pt penalty."""
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

        assert score == 100
        assert risk == RiskLevel.LOW_RISK
        assert status == CompositeStatus.CONDITIONAL_COMPLIANCE
        assert any(b.rule_id == "R-07" and b.points_change == 0 for b in breakdown)

    def test_custom_scoring_policy_configuration(self):
        """Verify custom ScoringPolicy configuration alters deductions and risk thresholds accordingly."""
        custom_policy = ScoringPolicy(
            starting_score=200,
            gstin_format_penalty=50,
            low_risk_min_score=160,
            medium_risk_min_score=100,
            low_risk_guidance="Custom low risk threshold passed.",
        )

        gstin_malformed = GSTINValidationResponse(
            gstin="123",
            deterministic=GSTINDeterministicResult(is_format_valid=False),
            registry=GSTINRegistryResult(registry_found=False, status_message="Malformed"),
            overall_status=ValidationStatus.INVALID_FORMAT,
        )

        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=gstin_malformed,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=[],
            policy=custom_policy,
        )

        # 200 - 50 = 150 -> between 100 and 160 -> MEDIUM_RISK (or HIGH_RISK since critical failure)
        assert score == 150
        assert any(b.points_change == -50 for b in breakdown)
