from typing import List, Optional, Tuple
from app.schemas.statutory import (
    EnterpriseMajorActivity,
    UdyamRegistryRecord,
)


class UdyamHealthEvaluator:
    """
    Evaluates enterprise classification, major activity, and policy-dependent procurement benefits
    strictly from sandbox / mock registry records.
    
    IMPORTANT:
    Does NOT declare automatic legal or procurement exemptions.
    Benefits under Public Procurement Policy for MSEs Order 2012 and GFR Rule 173(i)
    are strictly policy- and tender-dependent.
    """

    def evaluate_udyam_record(
        self,
        record: Optional[UdyamRegistryRecord],
        expected_enterprise_name: Optional[str] = None,
    ) -> Tuple[Optional[str], List[str]]:
        """
        Evaluate enterprise standing and formulate tender-dependent policy advisories.

        Returns:
            Tuple of (name_match_status: Optional[str], advisory_notes: List[str])
        """
        if not record:
            return "NOT_CHECKED" if expected_enterprise_name else None, []

        notes: List[str] = []

        # 1. Enterprise Tier & Activity Classification
        tier_val = record.enterprise_tier.value if hasattr(record.enterprise_tier, "value") else str(record.enterprise_tier)
        act_val = record.major_activity.value if hasattr(record.major_activity, "value") else str(record.major_activity)
        notes.append(f"Enterprise Standing: {tier_val} Enterprise ({act_val}).")

        # 2. Activity-Specific Procurement Policy Advisories
        if record.major_activity == EnterpriseMajorActivity.TRADING:
            notes.append(
                "Activity Advisory: Enterprise is registered under TRADING. Per Ministry of MSME circulars and Public Procurement Policy, pure trading/retail activities are generally not eligible for manufacturing EMD/turnover waivers unless specified in the tender document."
            )
        else:
            notes.append(
                "Procurement Advisory: EMD exemption, turnover/experience relaxation, and purchase preferences are indicative and subject to tender-specific conditions under GFR Rule 173(i) and MSME Order 2012."
            )

        # 3. NIC Codes Summary
        if record.nic_codes:
            notes.append(f"Registered NIC Codes: {', '.join(record.nic_codes)} (Verify against tender scope of work).")

        # 4. Name Match Evaluation against Sandbox Record
        name_match_status = None
        if expected_enterprise_name and expected_enterprise_name.strip():
            clean_exp = expected_enterprise_name.strip().upper()
            clean_reg = record.enterprise_name.upper()

            if clean_exp in clean_reg or clean_reg in clean_exp:
                name_match_status = "MATCH"
            else:
                exp_tokens = set(clean_exp.split())
                reg_tokens = set(clean_reg.split())
                if exp_tokens & reg_tokens:
                    name_match_status = "MATCH"
                else:
                    name_match_status = "MISMATCH"
                    notes.append(
                        f"Enterprise name discrepancy: expected '{expected_enterprise_name}', registered '{record.enterprise_name}'."
                    )

        return name_match_status, notes


# Singleton instance
udyam_health_evaluator = UdyamHealthEvaluator()
