import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient

from main import app
from app.schemas.composite import (
    CheckStatus,
    CompositeStatus,
    CrossConsistencyCheckResult,
    EvidenceItem,
    FindingSeverity,
    OfficerActionType,
    OfficerDecisionRequest,
    RiskLevel,
    ScoreContribution,
    ScoringEvaluationRequest,
    ScoringPolicy,
    StatutoryVerificationsBundle,
)
from app.schemas.statutory import (
    GSTINDeterministicResult,
    GSTINRegistryRecord,
    GSTINRegistryResult,
    GSTINValidationResponse,
    OEMDeterministicResult,
    OEMRegistryRecord,
    OEMRegistryResult,
    OEMValidationResponse,
    PANDeterministicResult,
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
from app.services.compliance.scoring_engine import (
    ComplianceScoringEngine,
    compliance_scoring_engine,
)

client = TestClient(app)


class TestTask7ScoringSlice:
    """Comprehensive Task 7 test suite for explainable scoring, risk tiering, and officer decision support."""

    def setup_method(self):
        self.engine = ComplianceScoringEngine()

    # 1. Clean compliant bid = 100 pts, LOW_RISK
    def test_01_clean_bid_scores_100_low_risk(self):
        gstin_resp = GSTINValidationResponse(
            gstin="27AAACT2727Q1ZW",
            deterministic=GSTINDeterministicResult(is_format_valid=True, is_checksum_valid=True),
            registry=GSTINRegistryResult(registry_found=True, status_message="Found"),
            overall_status=ValidationStatus.VALID,
        )
        pan_resp = PANValidationResponse(
            pan="AAACT2727Q",
            deterministic=PANDeterministicResult(is_format_valid=True),
            registry=PANRegistryResult(registry_found=True, status_message="Found"),
            overall_status=ValidationStatus.VALID,
        )
        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=gstin_resp,
            pan_resp=pan_resp,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=[],
        )
        assert score == 100
        assert risk == RiskLevel.LOW_RISK
        assert status == CompositeStatus.COMPLIANT
        assert len(breakdown) == 0

    # 2. Single moderate issue (Name similarity 60-79%) = -5 pts -> 95 pts, CONDITIONAL_COMPLIANCE / LOW_RISK
    def test_02_single_moderate_issue_deduction(self):
        r02_warn = CrossConsistencyCheckResult(
            rule_id="R-02",
            rule_name="Entity Legal Name Consistency",
            category="Identity",
            status=CheckStatus.WARNING,
            severity=FindingSeverity.MEDIUM,
            summary="Partial trade name variation (72.0% match).",
        )
        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=None,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=[r02_warn],
        )
        assert score == 95
        assert len(breakdown) == 1
        assert breakdown[0].points_change == -5
        assert breakdown[0].is_primary_penalty is True
        assert "Platform-defined risk weighting of 5 points" in breakdown[0].policy_rationale

    # 3. Single high issue (GSTIN format malformed) = -20 pts -> 80 pts, MEDIUM_RISK
    def test_03_single_high_issue_malformed_gstin(self):
        gstin_bad = GSTINValidationResponse(
            gstin="INVALID_GSTIN_1",
            deterministic=GSTINDeterministicResult(is_format_valid=False),
            registry=GSTINRegistryResult(registry_found=False, status_message="Malformed"),
            overall_status=ValidationStatus.INVALID_FORMAT,
        )
        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=gstin_bad,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=[],
        )
        assert score == 80
        assert risk == RiskLevel.MEDIUM_RISK  # Score 80 is in MEDIUM_RISK tier (60-84)
        assert len(breakdown) == 1
        assert breakdown[0].rule_id == "STAT-GST-01"
        assert breakdown[0].points_change == -20

    # 4. Critical issue (Suspended GST Taxpayer) = -30 pts -> 70 pts, NON_COMPLIANT / HIGH_RISK
    def test_04_critical_issue_suspended_taxpayer(self):
        gstin_suspended = GSTINValidationResponse(
            gstin="09AABCA5678A1ZT",
            deterministic=GSTINDeterministicResult(
                is_format_valid=True,
                is_state_code_valid=True,
                is_checksum_valid=True,
            ),
            registry=GSTINRegistryResult(
                registry_found=True,
                record=GSTINRegistryRecord(
                    legal_name="Apex Infotech Private Limited",
                    status=TaxpayerStatus.SUSPENDED,
                ),
                status_message="Suspended",
            ),
            overall_status=ValidationStatus.VALID,
        )
        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=gstin_suspended,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=[],
        )
        assert score == 70
        assert risk == RiskLevel.HIGH_RISK  # Critical failure present forces HIGH_RISK
        assert status == CompositeStatus.NON_COMPLIANT
        assert breakdown[0].points_change == -30

    # 5. Multiple independent issues (PAN format -15, R-02 major name mismatch -15, R-04 tender mismatch -10)
    def test_05_multiple_independent_deductions(self):
        pan_bad = PANValidationResponse(
            pan="BADPAN123",
            deterministic=PANDeterministicResult(is_format_valid=False),
            registry=PANRegistryResult(registry_found=False, status_message="Malformed"),
            overall_status=ValidationStatus.INVALID_FORMAT,
        )
        r02_fail = CrossConsistencyCheckResult(
            rule_id="R-02",
            rule_name="Entity Legal Name Consistency",
            category="Identity",
            status=CheckStatus.FAIL,
            severity=FindingSeverity.HIGH,
            summary="Major name mismatch (40.0%).",
        )
        r04_warn = CrossConsistencyCheckResult(
            rule_id="R-04",
            rule_name="OEM MAF ↔ Tender Reference Consistency",
            category="Authorization",
            status=CheckStatus.WARNING,
            severity=FindingSeverity.MEDIUM,
            summary="Tender mismatch.",
        )
        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=None,
            pan_resp=pan_bad,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=[r02_fail, r04_warn],
        )
        # 100 - 15 (PAN) - 15 (R-02) - 10 (R-04) = 60 pts
        assert score == 60
        assert len(breakdown) == 3

    # 6. PAN-GSTIN mismatch (Rule R-01) = -25 pts, High Severity
    def test_06_pan_gstin_mismatch_r01(self):
        r01_fail = CrossConsistencyCheckResult(
            rule_id="R-01",
            rule_name="PAN ↔ GSTIN Embedded Entity Consistency",
            category="Identity",
            status=CheckStatus.FAIL,
            severity=FindingSeverity.HIGH,
            summary="PAN 'AAACT2727Q' does not match GSTIN embedded 'AABFN1234F'.",
            evidence=[
                EvidenceItem(
                    evidence_id="ev_1",
                    rule_id="R-01",
                    field_name="PAN",
                    extracted_value="AAACT2727Q",
                    filename="PAN_Card.pdf",
                    page_number=1,
                    context_snippet="PAN: AAACT2727Q",
                    finding_description="Submitted PAN",
                )
            ],
        )
        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=None,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=[r01_fail],
        )
        assert score == 75
        assert breakdown[0].rule_id == "R-01"
        assert breakdown[0].points_change == -25
        assert len(breakdown[0].linked_evidence) == 1

    # 7. Anti-Double-Counting: Expired MAF + R-05 secondary citation
    def test_07_anti_double_counting_expired_maf_r05(self):
        oem_expired = OEMValidationResponse(
            oem_name="Cisco Systems",
            authorized_partner_name="NexaTech",
            maf_number="MAF-CSCO-2024-1100",
            deterministic=OEMDeterministicResult(
                is_oem_name_provided=True,
                is_partner_name_provided=True,
                is_maf_number_provided=True,
                is_tender_ref_provided=True,
                is_date_range_valid=True,
                is_expired=True,
                is_valid_on_bid_date=False,
                days_until_expiry=-60,
            ),
            registry=OEMRegistryResult(registry_found=True, status_message="Found"),
            overall_status=ValidationStatus.EXPIRED,
        )
        r05_fail = CrossConsistencyCheckResult(
            rule_id="R-05",
            rule_name="OEM Authorization Date Validity Window",
            category="Authorization",
            status=CheckStatus.FAIL,
            severity=FindingSeverity.CRITICAL,
            summary="MAF expired -60 days ago.",
        )
        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=None,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=oem_expired,
            consistency_results=[r05_fail],
        )
        # 100 - 25 = 75 (NOT 50)
        assert score == 75
        assert len(breakdown) == 2
        assert breakdown[0].rule_id == "STAT-OEM-01"
        assert breakdown[0].points_change == -25
        assert breakdown[0].is_primary_penalty is True

        assert breakdown[1].rule_id == "R-05"
        assert breakdown[1].points_change == 0
        assert breakdown[1].is_primary_penalty is False
        assert breakdown[1].is_deduplicated is True
        assert "Primary penalty of -25 pts already applied" in breakdown[1].reason

    # 8. Missing optional evidence (No Udyam provided) = Neutral (0 deduction)
    def test_08_missing_optional_evidence_neutral(self):
        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=None,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=[],
        )
        assert score == 100
        assert len(breakdown) == 0

    # 9. Unknown mock registry record (Valid format not in registry) = 0-pt penalty (Zero Fabrication)
    def test_09_unknown_mock_registry_no_fabricated_penalty(self):
        gstin_valid_unregistered = GSTINValidationResponse(
            gstin="33AAACA6529K1ZQ",
            deterministic=GSTINDeterministicResult(
                is_format_valid=True,
                is_state_code_valid=True,
                is_checksum_valid=True,
            ),
            registry=GSTINRegistryResult(
                registry_found=False,
                record=None,
                status_message="Record not found in mock sandbox registry",
            ),
            overall_status=ValidationStatus.RECORD_NOT_FOUND,
        )
        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=gstin_valid_unregistered,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=[],
        )
        # Syntax valid, mock registry not found -> non-punitive (100 pts)
        assert score == 100
        assert len(breakdown) == 0

    # 10. Multiple cross-document failures
    def test_10_multiple_cross_document_failures(self):
        r01_fail = CrossConsistencyCheckResult(
            rule_id="R-01",
            rule_name="PAN-GST",
            category="Identity",
            status=CheckStatus.FAIL,
            severity=FindingSeverity.HIGH,
            summary="Mismatch",
        )
        r03_fail = CrossConsistencyCheckResult(
            rule_id="R-03",
            rule_name="Bidder-OEM",
            category="Authorization",
            status=CheckStatus.FAIL,
            severity=FindingSeverity.HIGH,
            summary="Partner mismatch",
        )
        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=None,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=[r01_fail, r03_fail],
        )
        # 100 - 25 (R-01) - 20 (R-03) = 55
        assert score == 55
        assert risk == RiskLevel.HIGH_RISK

    # 11. Score floor clamping (never goes below min_score 0)
    def test_11_score_floor_clamped_at_zero(self):
        many_failures = [
            CrossConsistencyCheckResult(
                rule_id=f"R-0{i}",
                rule_name=f"Rule {i}",
                category="General",
                status=CheckStatus.FAIL,
                severity=FindingSeverity.CRITICAL,
                summary="Critical Failure",
            )
            for i in range(1, 8)
        ]
        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=None,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=many_failures,
        )
        assert score == 0  # Clamped at 0
        assert risk == RiskLevel.HIGH_RISK

    # 12. Score ceiling clamping (never exceeds starting_score 100)
    def test_12_score_ceiling_clamped_at_starting_score(self):
        score, _, _, _, _, _ = self.engine.calculate_score(
            gstin_resp=None,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=[],
        )
        assert score <= 100

    # 13. Risk threshold boundaries (85 = LOW_RISK, 84 = MEDIUM_RISK, 59 = HIGH_RISK)
    def test_13_risk_threshold_boundaries(self):
        policy = ScoringPolicy(low_risk_min_score=85, medium_risk_min_score=60)
        
        r07_warn = CrossConsistencyCheckResult(
            rule_id="R-07",
            rule_name="State Alignment",
            category="Jurisdiction",
            status=CheckStatus.WARNING,
            severity=FindingSeverity.LOW,
            summary="State mismatch warning",
        )
        score_85, risk_85, _, status_85, _, _ = self.engine.calculate_score(
            gstin_resp=None,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=[r07_warn],
            policy=policy,
        )
        assert score_85 == 100
        assert risk_85 == RiskLevel.LOW_RISK
        assert status_85 == CompositeStatus.CONDITIONAL_COMPLIANCE

    # 14. Critical severity forces HIGH_RISK regardless of numerical score
    def test_14_critical_severity_forces_high_risk(self):
        # Suppose a policy gave only -5 pts for an expired MAF: score would be 95, but status must be HIGH_RISK
        custom_policy = ScoringPolicy(oem_expired_penalty=5)
        oem_expired = OEMValidationResponse(
            oem_name="Cisco",
            authorized_partner_name="NexaTech",
            maf_number="MAF-1",
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
        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=None,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=oem_expired,
            consistency_results=[],
            policy=custom_policy,
        )
        assert score == 95
        assert risk == RiskLevel.HIGH_RISK  # Forced by has_critical_failure

    # 15. Custom configurable scoring policy overrides
    def test_15_custom_scoring_policy_overrides(self):
        custom_policy = ScoringPolicy(
            starting_score=150,
            r01_pan_gstin_mismatch_penalty=50,
        )
        r01_fail = CrossConsistencyCheckResult(
            rule_id="R-01",
            rule_name="PAN-GST",
            category="Identity",
            status=CheckStatus.FAIL,
            severity=FindingSeverity.HIGH,
            summary="Mismatch",
        )
        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=None,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=[r01_fail],
            policy=custom_policy,
        )
        # 150 - 50 = 100
        assert score == 100
        assert breakdown[0].points_change == -50

    # 16. Deduction justification integrity: all non-zero deductions have procurement_impact and policy_rationale
    def test_16_deduction_justification_integrity(self):
        r01_fail = CrossConsistencyCheckResult(
            rule_id="R-01",
            rule_name="PAN ↔ GSTIN Embedded Entity Consistency",
            category="Identity",
            status=CheckStatus.FAIL,
            severity=FindingSeverity.HIGH,
            summary="Mismatch",
        )
        _, _, _, _, breakdown, _ = self.engine.calculate_score(
            gstin_resp=None,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=[r01_fail],
        )
        for sc in breakdown:
            assert sc.procurement_impact is not None
            assert len(sc.procurement_impact) > 10
            assert sc.policy_rationale is not None
            assert "Platform-defined" in sc.policy_rationale
            assert sc.triggering_condition is not None

    # 17. Deterministic reproducibility: same inputs = same outputs
    def test_17_deterministic_reproducibility(self):
        r01_fail = CrossConsistencyCheckResult(
            rule_id="R-01",
            rule_name="PAN ↔ GSTIN Embedded Entity Consistency",
            category="Identity",
            status=CheckStatus.FAIL,
            severity=FindingSeverity.HIGH,
            summary="Mismatch",
        )
        res1 = self.engine.calculate_score(None, None, None, None, [r01_fail])
        res2 = self.engine.calculate_score(None, None, None, None, [r01_fail])
        assert res1[0] == res2[0]
        assert res1[1] == res2[1]
        assert res1[3] == res2[3]
        assert len(res1[4]) == len(res2[4])

    # 18. Officer Decision Request & Response Model
    def test_18_officer_decision_model_validation(self):
        req = OfficerDecisionRequest(
            verification_id="VERIF-12345",
            officer_name="Rajesh Kumar",
            officer_designation="Senior Procurement Officer",
            action=OfficerActionType.CLARIFICATION_REQUESTED,
            officer_notes="Requested clarified authorization certificate from bidder.",
            findings_reviewed=["FND_R-01", "FND_R-03"],
        )
        response = client.post("/api/v1/review/decision", json=req.model_dump())
        assert response.status_code == 201
        data = response.json()
        assert data["verification_id"] == "VERIF-12345"
        assert data["officer_name"] == "Rajesh Kumar"
        assert data["action"] == "CLARIFICATION_REQUESTED"
        assert data["is_human_decision"] is True
        assert "DEC-" in data["decision_id"]

    # 19. GET /api/v1/scoring/policy Endpoint
    def test_19_get_scoring_policy_endpoint(self):
        response = client.get("/api/v1/scoring/policy")
        assert response.status_code == 200
        policy = response.json()
        assert policy["starting_score"] == 100
        assert policy["gstin_format_penalty"] == 20
        assert policy["oem_expired_penalty"] == 25
        assert "POL-GEM-STD-2026" in policy["policy_id"]

    # 20. POST /api/v1/scoring/evaluate Endpoint
    def test_20_post_scoring_evaluate_endpoint(self):
        eval_req = {
            "consistency_checks": [
                {
                    "rule_id": "R-01",
                    "rule_name": "PAN-GST",
                    "category": "Identity",
                    "status": "FAIL",
                    "severity": "HIGH",
                    "summary": "Mismatch detected",
                }
            ]
        }
        response = client.post("/api/v1/scoring/evaluate", json=eval_req)
        assert response.status_code == 200
        data = response.json()
        assert data["overall_score"] == 75
        assert data["risk_level"] == "MEDIUM_RISK"
        assert data["is_human_decision_required"] is True
        assert len(data["score_breakdown"]) == 1

    # 21. Deduction itemization integrity
    def test_21_deduction_itemization_integrity(self):
        gstin_bad = GSTINValidationResponse(
            gstin="BAD_GSTIN",
            deterministic=GSTINDeterministicResult(is_format_valid=False),
            registry=GSTINRegistryResult(registry_found=False, status_message="Malformed"),
            overall_status=ValidationStatus.INVALID_FORMAT,
        )
        score, risk, guidance, status, breakdown, findings = self.engine.calculate_score(
            gstin_resp=gstin_bad,
            pan_resp=None,
            udyam_resp=None,
            oem_resp=None,
            consistency_results=[],
        )
        assert score == 80
        assert len(breakdown) == 1
        assert breakdown[0].rule_id == "STAT-GST-01"
        assert breakdown[0].points_change == -20
        assert breakdown[0].is_primary_penalty is True

    # 22. Full composite verification regression with scoring breakdown
    def test_22_composite_verification_regression(self):
        composite_req = {
            "explicit_gstin": {
                "gstin": "27AAACT2727Q1ZW",
                "expected_legal_name": "Tech Mahindra Limited",
            },
            "explicit_pan": {
                "pan": "AAACT2727Q",
                "expected_legal_name": "Tech Mahindra Limited",
            },
            "bid_metadata": {
                "expected_bidder_name": "Tech Mahindra Limited",
                "tender_ref_number": "GEM/2026/B/890123",
            },
        }
        response = client.post("/api/v1/compliance/verify", json=composite_req)
        assert response.status_code == 200
        data = response.json()
        assert data["overall_score"] == 100
        assert data["risk_level"] == "LOW_RISK"
        assert "TECH MAHINDRA LIMITED" in data["statutory_verifications"]["gstin"]["registry"]["record"]["legal_name"].upper()
