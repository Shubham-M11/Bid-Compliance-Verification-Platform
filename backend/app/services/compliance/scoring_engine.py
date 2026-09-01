from typing import List, Optional, Tuple
from app.schemas.composite import (
    CheckStatus,
    ComplianceFinding,
    CompositeStatus,
    CrossConsistencyCheckResult,
    FindingSeverity,
    RiskLevel,
    ScoreContribution,
    ScoringPolicy,
)
from app.schemas.statutory import (
    GSTINValidationResponse,
    OEMValidationResponse,
    PANValidationResponse,
    TaxpayerStatus,
    UdyamValidationResponse,
    ValidationStatus,
)


class ComplianceScoringEngine:
    """
    Explainable, deterministic compliance scoring engine.
    Calculates transparent score deductions from a configurable baseline (default 100),
    enforces generalized anti-double-counting rules, and categorizes decision-support risk tiers.
    
    IMPORTANT:
    The resulting score is a platform-defined review priority metric for human procurement officers.
    It does NOT represent a government-issued score or automatic tender decision.
    """

    def __init__(self, policy: Optional[ScoringPolicy] = None):
        self.policy = policy or ScoringPolicy()

    def calculate_score(
        self,
        gstin_resp: Optional[GSTINValidationResponse],
        pan_resp: Optional[PANValidationResponse],
        udyam_resp: Optional[UdyamValidationResponse],
        oem_resp: Optional[OEMValidationResponse],
        consistency_results: List[CrossConsistencyCheckResult],
        policy: Optional[ScoringPolicy] = None,
    ) -> Tuple[int, RiskLevel, str, CompositeStatus, List[ScoreContribution], List[ComplianceFinding]]:
        """
        Evaluate all statutory verifications and cross-consistency findings to produce
        an explainable compliance risk score and assessment.

        Returns:
            Tuple of (overall_score, risk_level, risk_guidance, composite_status, score_breakdown, findings)
        """
        active_policy = policy or self.policy
        score = active_policy.starting_score
        breakdown: List[ScoreContribution] = []
        findings: List[ComplianceFinding] = []
        has_critical_failure = False
        has_high_failure = False
        has_warnings = False
        has_stat_oem_expired_penalty = False
        has_stat_gstin_malformed_penalty = False
        has_stat_pan_malformed_penalty = False

        # ======================================================================
        # 1. Statutory Validation Checks (Task 3A Evaluations)
        # ======================================================================

        # GSTIN Validation Evaluation
        if gstin_resp:
            det = gstin_resp.deterministic
            reg = gstin_resp.registry

            if not det.is_format_valid:
                has_high_failure = True
                has_stat_gstin_malformed_penalty = True
                deduction = active_policy.gstin_format_penalty
                score -= deduction
                breakdown.append(
                    ScoreContribution(
                        contribution_id="SC_STAT_GST_01",
                        rule_id="STAT-GST-01",
                        rule_category="Statutory Validity",
                        title="Invalid GSTIN Format",
                        points_change=-deduction,
                        reason=f"GSTIN '{gstin_resp.gstin}' does not adhere to standard 15-character syntax.",
                        severity=FindingSeverity.HIGH,
                        is_primary_penalty=True,
                        is_deduplicated=False,
                        procurement_impact="Unverifiable statutory tax identity; bid cannot be verified against GST records.",
                        policy_rationale="Platform-defined high-impact statutory syntax defect weight.",
                        triggering_condition=f"Input string failed standard 15-character statutory GSTIN regex.",
                    )
                )
                findings.append(
                    ComplianceFinding(
                        finding_id="FND_GST_FMT",
                        rule_id="STAT-GST-01",
                        severity=FindingSeverity.HIGH,
                        title="Malformed GSTIN",
                        description=f"Supplied GSTIN '{gstin_resp.gstin}' failed structural regex validation.",
                        remediation_guidance="Verify and re-enter the authentic 15-character GSTIN.",
                    )
                )
            elif not det.is_checksum_valid:
                has_high_failure = True
                deduction = active_policy.gstin_checksum_penalty
                score -= deduction
                breakdown.append(
                    ScoreContribution(
                        contribution_id="SC_STAT_GST_02",
                        rule_id="STAT-GST-02",
                        rule_category="Statutory Validity",
                        title="Corrupted GSTIN Checksum",
                        points_change=-deduction,
                        reason=f"GSTIN checksum mismatch: 15th char '{det.checksum_char}' does not match Luhn Mod-36 calculated '{det.calculated_checksum}'.",
                        severity=FindingSeverity.HIGH,
                        is_primary_penalty=True,
                        is_deduplicated=False,
                        procurement_impact="High probability of typographical error or invalid identifier in submitted certificate.",
                        policy_rationale="Platform-defined high-impact checksum corruption defect weight.",
                        triggering_condition=f"Luhn Mod-36 hash check failed on 15th character (expected '{det.calculated_checksum}', got '{det.checksum_char}').",
                    )
                )
                findings.append(
                    ComplianceFinding(
                        finding_id="FND_GST_CHK",
                        rule_id="STAT-GST-02",
                        severity=FindingSeverity.HIGH,
                        title="GSTIN Checksum Failed",
                        description=f"The 15th checksum character '{det.checksum_char}' is invalid according to Luhn Mod-36.",
                        remediation_guidance="Review input for typographical errors in the 15th character.",
                    )
                )

            # Registry Status Evaluation (Only if format is valid)
            if reg.registry_found and reg.record:
                if reg.record.status == TaxpayerStatus.SUSPENDED:
                    has_critical_failure = True
                    deduction = active_policy.gstin_suspended_penalty
                    score -= deduction
                    breakdown.append(
                        ScoreContribution(
                            contribution_id="SC_STAT_GST_03",
                            rule_id="STAT-GST-03",
                            rule_category="Taxpayer Standing",
                            title="GSTIN Registration Suspended",
                            points_change=-deduction,
                            reason="Taxpayer registration is currently marked as SUSPENDED in registry.",
                            severity=FindingSeverity.CRITICAL,
                            is_primary_penalty=True,
                            is_deduplicated=False,
                            procurement_impact="Entity is flagged for filing compliance default; execution of public procurement contract may be legally restricted.",
                            policy_rationale="Platform-defined critical risk taxpayer default weight.",
                            triggering_condition="Taxpayer status in sandbox registry record is SUSPENDED.",
                        )
                    )
                    findings.append(
                        ComplianceFinding(
                            finding_id="FND_GST_SUSP",
                            rule_id="STAT-GST-03",
                            severity=FindingSeverity.CRITICAL,
                            title="Taxpayer Status Suspended",
                            description=f"GSTIN '{gstin_resp.gstin}' status is SUSPENDED. Filing compliance defaults detected.",
                            remediation_guidance="Bidder must resolve GST portal compliance suspension with tax authorities.",
                        )
                    )
                elif reg.record.status == TaxpayerStatus.CANCELLED:
                    has_critical_failure = True
                    deduction = active_policy.gstin_cancelled_penalty
                    score -= deduction
                    breakdown.append(
                        ScoreContribution(
                            contribution_id="SC_STAT_GST_04",
                            rule_id="STAT-GST-04",
                            rule_category="Taxpayer Standing",
                            title="GSTIN Registration Cancelled",
                            points_change=-deduction,
                            reason="Taxpayer registration has been CANCELLED.",
                            severity=FindingSeverity.CRITICAL,
                            is_primary_penalty=True,
                            is_deduplicated=False,
                            procurement_impact="Legal entity tax registration is inactive/cancelled; bidder is disqualified under statutory procurement guidelines.",
                            policy_rationale="Platform-defined critical taxpayer disqualification weight.",
                            triggering_condition="Taxpayer status in sandbox registry record is CANCELLED.",
                        )
                    )
                    findings.append(
                        ComplianceFinding(
                            finding_id="FND_GST_CANC",
                            rule_id="STAT-GST-04",
                            severity=FindingSeverity.CRITICAL,
                            title="Cancelled Taxpayer Registration",
                            description="Taxpayer GST registration has been cancelled.",
                            remediation_guidance="Bidder cannot participate in public procurement under cancelled GSTIN.",
                        )
                    )

        # PAN Validation Evaluation
        if pan_resp:
            if not pan_resp.deterministic.is_format_valid:
                has_high_failure = True
                has_stat_pan_malformed_penalty = True
                deduction = active_policy.pan_format_penalty
                score -= deduction
                breakdown.append(
                    ScoreContribution(
                        contribution_id="SC_STAT_PAN_01",
                        rule_id="STAT-PAN-01",
                        rule_category="Statutory Validity",
                        title="Invalid PAN Format",
                        points_change=-deduction,
                        reason=f"PAN '{pan_resp.pan}' does not adhere to standard 10-character syntax.",
                        severity=FindingSeverity.HIGH,
                        is_primary_penalty=True,
                        is_deduplicated=False,
                        procurement_impact="Unverifiable income tax identity; potential invalidity of statutory declaration.",
                        policy_rationale="Platform-defined high-impact PAN syntax defect weight.",
                        triggering_condition="Input string failed 10-character Indian PAN regex.",
                    )
                )
                findings.append(
                    ComplianceFinding(
                        finding_id="FND_PAN_FMT",
                        rule_id="STAT-PAN-01",
                        severity=FindingSeverity.HIGH,
                        title="Malformed PAN",
                        description=f"Supplied PAN '{pan_resp.pan}' failed 10-character syntax validation.",
                        remediation_guidance="Verify and re-enter the authentic 10-character PAN.",
                    )
                )

        # OEM Validation Evaluation
        if oem_resp:
            det = oem_resp.deterministic
            if det.is_expired:
                has_critical_failure = True
                has_stat_oem_expired_penalty = True
                deduction = active_policy.oem_expired_penalty
                score -= deduction
                breakdown.append(
                    ScoreContribution(
                        contribution_id="SC_STAT_OEM_01",
                        rule_id="STAT-OEM-01",
                        rule_category="OEM Authorization",
                        title="Expired OEM Authorization (MAF)",
                        points_change=-deduction,
                        reason=f"Manufacturer Authorization Form expired on {det.structure_breakdown.valid_until if det.structure_breakdown else 'past date'} ({det.days_until_expiry} days overdue).",
                        severity=FindingSeverity.CRITICAL,
                        is_primary_penalty=True,
                        is_deduplicated=False,
                        procurement_impact="Risk of unbacked hardware/software warranty, lack of OEM direct technical support, and disqualification under GeM OEM authorization clauses.",
                        policy_rationale="Platform-defined critical risk OEM authorization expiry weight.",
                        triggering_condition=f"Evaluation date is after MAF valid_until date ({det.days_until_expiry} days past expiration).",
                    )
                )
                findings.append(
                    ComplianceFinding(
                        finding_id="FND_OEM_EXP",
                        rule_id="STAT-OEM-01",
                        severity=FindingSeverity.CRITICAL,
                        title="Expired OEM Authorization",
                        description=f"MAF authorization is expired ({det.days_until_expiry} days overdue).",
                        remediation_guidance="Obtain an updated, active Manufacturer Authorization Form for this tender.",
                    )
                )

        # ======================================================================
        # 2. Cross-Entity Consistency Rules (R-01 through R-07)
        # ======================================================================
        for check in consistency_results:
            # Rule R-05 Anti-Double-Counting vs STAT-OEM-01 (Expired MAF)
            if check.rule_id == "R-05" and has_stat_oem_expired_penalty:
                breakdown.append(
                    ScoreContribution(
                        contribution_id="SC_R_05_DEDUP",
                        rule_id="R-05",
                        rule_category=check.category,
                        title=f"{check.rule_name} (Secondary Citation)",
                        points_change=0,
                        reason=f"{check.summary} (Primary penalty of -{active_policy.oem_expired_penalty} pts already applied under STAT-OEM-01).",
                        severity=check.severity,
                        is_primary_penalty=False,
                        is_deduplicated=True,
                        deduplication_reason="Root cause expiry is penalized under STAT-OEM-01; R-05 recorded as 0-pt secondary citation to prevent double counting.",
                        procurement_impact="Temporal validity violation (already accounted for in primary MAF deduction).",
                        policy_rationale="Anti-double-counting policy: only the primary root cause receives point deduction.",
                        triggering_condition="MAF date window validation failure coincides with STAT-OEM-01 expiry.",
                        linked_evidence=check.evidence,
                    )
                )
                findings.append(
                    ComplianceFinding(
                        finding_id="FND_R-05_SEC",
                        rule_id="R-05",
                        severity=check.severity,
                        title=f"{check.rule_name} (Secondary Citation)",
                        description=f"{check.summary} Note: Expiry root cause is already penalized under STAT-OEM-01.",
                        remediation_guidance=self._get_remediation_guidance(check.rule_id),
                        linked_evidence=check.evidence,
                    )
                )
                continue

            if check.status == CheckStatus.FAIL:
                if check.severity in [FindingSeverity.CRITICAL, FindingSeverity.HIGH]:
                    has_high_failure = True
                pts = self._get_rule_deduction(check.rule_id, check.severity, active_policy)
                score -= pts
                breakdown.append(
                    ScoreContribution(
                        contribution_id=f"SC_{check.rule_id}",
                        rule_id=check.rule_id,
                        rule_category=check.category,
                        title=check.rule_name,
                        points_change=-pts,
                        reason=check.summary,
                        severity=check.severity,
                        is_primary_penalty=True,
                        is_deduplicated=False,
                        procurement_impact=self._get_procurement_impact(check.rule_id),
                        policy_rationale=self._get_policy_rationale(check.rule_id, pts),
                        triggering_condition=f"Cross-document consistency check '{check.rule_name}' evaluated to FAIL.",
                        linked_evidence=check.evidence,
                    )
                )
                findings.append(
                    ComplianceFinding(
                        finding_id=f"FND_{check.rule_id}",
                        rule_id=check.rule_id,
                        severity=check.severity,
                        title=check.rule_name,
                        description=check.summary,
                        remediation_guidance=self._get_remediation_guidance(check.rule_id),
                        linked_evidence=check.evidence,
                    )
                )
            elif check.status == CheckStatus.WARNING:
                has_warnings = True
                pts = self._get_rule_deduction(check.rule_id, check.severity, active_policy)
                if pts > 0:
                    score -= pts
                breakdown.append(
                    ScoreContribution(
                        contribution_id=f"SC_{check.rule_id}",
                        rule_id=check.rule_id,
                        rule_category=check.category,
                        title=check.rule_name,
                        points_change=-pts if pts > 0 else 0,
                        reason=check.summary,
                        severity=check.severity,
                        is_primary_penalty=True,
                        is_deduplicated=False,
                        procurement_impact=self._get_procurement_impact(check.rule_id),
                        policy_rationale=self._get_policy_rationale(check.rule_id, pts),
                        triggering_condition=f"Cross-document consistency check '{check.rule_name}' evaluated to WARNING.",
                        linked_evidence=check.evidence,
                    )
                )
                findings.append(
                    ComplianceFinding(
                        finding_id=f"FND_{check.rule_id}",
                        rule_id=check.rule_id,
                        severity=check.severity,
                        title=check.rule_name,
                        description=check.summary,
                        remediation_guidance=self._get_remediation_guidance(check.rule_id),
                        linked_evidence=check.evidence,
                    )
                )

        # Clamp score strictly between min_score and starting_score
        final_score = max(active_policy.min_score, min(active_policy.starting_score, score))

        # ======================================================================
        # 3. Decision-Support Risk Tiers & Composite Status
        # ======================================================================
        if (
            final_score >= active_policy.low_risk_min_score
            and not has_critical_failure
            and not has_high_failure
        ):
            risk_level = RiskLevel.LOW_RISK
            risk_guidance = active_policy.low_risk_guidance
            composite_status = (
                CompositeStatus.CONDITIONAL_COMPLIANCE if has_warnings else CompositeStatus.COMPLIANT
            )
        elif final_score >= active_policy.medium_risk_min_score and not has_critical_failure:
            risk_level = RiskLevel.MEDIUM_RISK
            risk_guidance = active_policy.medium_risk_guidance
            composite_status = CompositeStatus.CONDITIONAL_COMPLIANCE
        else:
            risk_level = RiskLevel.HIGH_RISK
            risk_guidance = active_policy.high_risk_guidance
            composite_status = (
                CompositeStatus.NON_COMPLIANT if has_critical_failure else CompositeStatus.REVIEW_REQUIRED
            )

        return final_score, risk_level, risk_guidance, composite_status, breakdown, findings

    def _get_rule_deduction(
        self,
        rule_id: str,
        severity: FindingSeverity,
        policy: Optional[ScoringPolicy] = None,
    ) -> int:
        """Deterministic point deductions driven by configurable ScoringPolicy."""
        p = policy or self.policy
        deduction_table = {
            "R-01": p.r01_pan_gstin_mismatch_penalty,
            "R-02": p.r02_legal_name_high_mismatch_penalty if severity in [FindingSeverity.CRITICAL, FindingSeverity.HIGH] else p.r02_legal_name_med_mismatch_penalty,
            "R-03": p.r03_bidder_oem_mismatch_penalty,
            "R-04": p.r04_tender_ref_mismatch_penalty,
            "R-05": p.r05_maf_date_invalid_penalty,
            "R-06": p.r06_udyam_entity_incompatibility_penalty,
            "R-07": p.r07_state_alignment_penalty,
        }
        return deduction_table.get(
            rule_id,
            10 if severity in [FindingSeverity.CRITICAL, FindingSeverity.HIGH] else 5,
        )

    def _get_procurement_impact(self, rule_id: str) -> str:
        """Plain English explanation of why this rule defect matters to tender evaluation."""
        impact_map = {
            "R-01": "Dual-entity identity conflict: PAN embedded in GSTIN contradicts the standalone submitted PAN.",
            "R-02": "Entity name discrepancy across certificates; risk of submission by non-authorized subsidiary or misnamed vendor.",
            "R-03": "Bidder is not named as the authorized reseller in the OEM authorization form, invalidating product warranty.",
            "R-04": "Manufacturer Authorization Form references a different tender/bid number and may not apply to this procurement.",
            "R-05": "Manufacturer Authorization Form is not active during the bid evaluation window.",
            "R-06": "Legal constitution discrepancy between Income Tax declaration (PAN) and MSME classification (Udyam).",
            "R-07": "Registration jurisdiction differs across certificates (acceptable for multi-state branch operations upon verification).",
        }
        return impact_map.get(
            rule_id, "Requires procurement officer review before technical qualification."
        )

    def _get_policy_rationale(self, rule_id: str, points: int) -> str:
        """Justification of the platform-defined deduction weight."""
        return f"Platform-defined risk weighting of {points} points calibrated for public procurement review triage."

    def _get_remediation_guidance(self, rule_id: str) -> str:
        """Actionable resolution guidance for specific rule findings."""
        guidance_map = {
            "R-01": "Verify that the standalone PAN and the PAN embedded within the GSTIN belong to the same entity.",
            "R-02": "Ensure trade names or abbreviations match the registered corporate name across all certificates.",
            "R-03": "Obtain an OEM authorization certificate explicitly naming the bidding legal entity.",
            "R-04": "Ensure the MAF specifically references the current tender/bid invitation number.",
            "R-05": "Provide a Manufacturer Authorization Form that is active on the bid submission date.",
            "R-06": "Align business constitution documents between Income Tax (PAN) and MSME Udyam portals.",
            "R-07": "Confirm whether multi-state operations or distinct branch offices explain state differences.",
        }
        return guidance_map.get(
            rule_id, "Review submitted documentation with the procurement evaluation committee."
        )


# Global singleton instance
compliance_scoring_engine = ComplianceScoringEngine()

