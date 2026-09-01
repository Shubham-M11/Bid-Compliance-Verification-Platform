from typing import List, Optional, Tuple
from app.schemas.statutory import OEMRegistryRecord


class OEMHealthEvaluator:
    """
    Evaluates partner standing, tier status, and product authorization lines
    strictly from sandbox / mock registry records.
    
    IMPORTANT:
    Does NOT declare live government or manufacturer verification.
    All observations are non-prescriptive factual review signals based on sandbox data.
    """

    def evaluate_oem_record(
        self,
        record: Optional[OEMRegistryRecord],
        requested_partner: Optional[str] = None,
    ) -> Tuple[Optional[str], List[str]]:
        """
        Evaluate partner authorization standing and generate factual advisory observations.

        Returns:
            Tuple of (partner_match_status: Optional[str], advisory_notes: List[str])
        """
        if not record:
            return "NOT_CHECKED" if requested_partner else None, []

        notes: List[str] = []

        # 1. Partner Standing from Sandbox Record
        if record.is_partner_in_oem_database and "active" in record.authorization_status.lower():
            notes.append(f"Partner Authorization Standing: {record.authorization_status} (Sandbox Record).")
        elif not record.is_partner_in_oem_database or "revoked" in record.authorization_status.lower():
            notes.append(
                f"Partner standing alert: {record.authorization_status}. Partner is marked as unlisted/revoked in sandbox records."
            )
        else:
            notes.append(f"Partner Authorization Status: {record.authorization_status}.")

        # 2. Product Categories
        if record.product_categories:
            notes.append(
                f"Authorized Product Lines: {', '.join(record.product_categories)} (Verify against tender BOQ/Scope)."
            )

        # 3. Notes / Specific Restrictions
        if record.notes:
            notes.append(f"Program Notes: {record.notes}")

        # 4. Partner Name Comparison
        partner_match_status = None
        if requested_partner and requested_partner.strip():
            clean_req = requested_partner.strip().upper()
            clean_reg = record.authorized_partner_name.upper()

            if clean_req in clean_reg or clean_reg in clean_req:
                partner_match_status = "MATCH"
            else:
                req_tokens = set(clean_req.split())
                reg_tokens = set(clean_reg.split())
                if req_tokens & reg_tokens:
                    partner_match_status = "MATCH"
                else:
                    partner_match_status = "MISMATCH"
                    notes.append(
                        f"Partner discrepancy: requested '{requested_partner}', registered '{record.authorized_partner_name}'."
                    )

        return partner_match_status, notes


# Singleton instance
oem_health_evaluator = OEMHealthEvaluator()
