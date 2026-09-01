from typing import List, Optional, Tuple
from app.schemas.statutory import (
    GSTINRegistryRecord,
    TaxpayerStatus,
)


class TaxpayerHealthEvaluator:
    """
    Evaluates factual taxpayer standing, registration constitution (Composition/Regular),
    and return filing indicators.
    Produces factual audit observations without making automatic legal disqualification claims.
    """

    def evaluate_taxpayer_record(
        self,
        record: Optional[GSTINRegistryRecord],
        expected_legal_name: Optional[str] = None,
    ) -> Tuple[Optional[str], List[str]]:
        """
        Evaluate taxpayer standing and return filing status.

        Returns:
            Tuple of (name_match_status: Optional[str], advisory_notes: List[str])
        """
        if not record:
            return "NOT_CHECKED" if expected_legal_name else None, []

        notes: List[str] = []

        # 1. Taxpayer Registration Standing
        if record.status == TaxpayerStatus.SUSPENDED:
            notes.append(
                "Taxpayer registration is marked as SUSPENDED in registry records. Common causes include return filing defaults or pending proceedings under GST Rule 21A."
            )
        elif record.status == TaxpayerStatus.CANCELLED:
            notes.append(
                "Taxpayer registration is marked as CANCELLED in registry records. Participation in public procurement requires active GST status."
            )
        elif record.status == TaxpayerStatus.ACTIVE:
            notes.append("Taxpayer registration status is ACTIVE.")

        # 2. Composition Scheme Advisory
        if record.is_composition_dealer or record.taxpayer_type.lower() == "composition":
            note = (
                record.composition_advisory_note
                or "Taxpayer is registered under Section 10 Composition Scheme. Composition taxpayers cannot collect GST or issue tax invoices."
            )
            notes.append(f"Composition Scheme Advisory: {note}")

        # 3. Return Filing Compliance
        if not record.is_filing_up_to_date:
            notes.append("Tax return filing defaults flagged in recent periods.")
        elif record.filing_status_summary:
            notes.append(f"Filing Compliance: {record.filing_status_summary}")

        # 4. Name Match Evaluation
        name_match_status = None
        if expected_legal_name and expected_legal_name.strip():
            clean_exp = expected_legal_name.strip().upper()
            clean_reg = record.legal_name.upper()
            clean_trade = (record.trade_name or "").upper()

            # Direct containment or high token alignment
            if clean_exp in clean_reg or clean_reg in clean_exp or (clean_trade and (clean_exp in clean_trade or clean_trade in clean_exp)):
                name_match_status = "MATCH"
            else:
                name_match_status = "MISMATCH"
                notes.append(
                    f"Legal name discrepancy: expected '{expected_legal_name}', registered '{record.legal_name}'."
                )

        return name_match_status, notes


# Singleton instance
taxpayer_health_evaluator = TaxpayerHealthEvaluator()
