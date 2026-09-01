from typing import List, Optional, Tuple
from app.schemas.statutory import PANRegistryRecord


class PANHealthEvaluator:
    """
    Evaluates factual taxpayer operational standing, entity classification,
    and Aadhaar linking indicators strictly from sandbox / mock registry records.
    
    IMPORTANT:
    Does NOT claim live government records or real-time NSDL / ITD database connectivity.
    All observations are non-prescriptive factual review signals.
    """

    def evaluate_pan_record(
        self,
        record: Optional[PANRegistryRecord],
        expected_legal_name: Optional[str] = None,
    ) -> Tuple[Optional[str], List[str]]:
        """
        Evaluate taxpayer standing and generate factual advisory observations.

        Returns:
            Tuple of (name_match_status: Optional[str], advisory_notes: List[str])
        """
        if not record:
            return "NOT_CHECKED" if expected_legal_name else None, []

        notes: List[str] = []

        # 1. Operational Status from sandbox record
        if record.pan_status.lower() == "active":
            notes.append("PAN operational standing is ACTIVE in sandbox records.")
        elif record.pan_status.lower() in ("inactive", "deactivated", "suspended"):
            notes.append(
                f"Taxpayer PAN status is marked as {record.pan_status.upper()} in sandbox records. Active PAN status is required for statutory compliance."
            )
        else:
            notes.append(f"PAN operational status: {record.pan_status}.")

        # 2. Aadhaar Seeding / Taxpayer Category
        if record.aadhaar_seeding_status:
            notes.append(f"Aadhaar Seeding Indicator: {record.aadhaar_seeding_status} (Sandbox Record).")

        if record.category:
            notes.append(f"Taxpayer Category: {record.category}.")

        # 3. Name Match Evaluation against Sandbox Record
        name_match_status = None
        if expected_legal_name and expected_legal_name.strip():
            clean_exp = expected_legal_name.strip().upper()
            clean_reg = record.full_name.upper()

            if clean_exp in clean_reg or clean_reg in clean_exp:
                name_match_status = "MATCH"
            else:
                # Check token overlap
                exp_tokens = set(clean_exp.split())
                reg_tokens = set(clean_reg.split())
                if exp_tokens & reg_tokens:
                    name_match_status = "MATCH"
                else:
                    name_match_status = "MISMATCH"
                    notes.append(
                        f"Legal name discrepancy: expected '{expected_legal_name}', registered '{record.full_name}'."
                    )

        return name_match_status, notes


# Singleton instance
pan_health_evaluator = PANHealthEvaluator()
