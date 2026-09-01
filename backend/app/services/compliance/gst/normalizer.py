import re
from typing import List, Tuple
from app.schemas.statutory import GSTINNormalizationDetails
from app.services.compliance.luhn_mod36 import verify_gstin_checksum
from app.services.compliance.state_codes import is_valid_state_code

# Strict 15-character GSTIN regex pattern
STRICT_GSTIN_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")


class GSTINNormalizer:
    """
    Controlled, auditable GSTIN normalizer.
    Cleans delimiters, whitespace, and case without silently altering source evidence.
    Applies controlled OCR candidate repairs only when validated by state codes and Luhn Mod-36,
    and records every transformation in auditable normalization notes.
    """

    def normalize(self, raw_input: str) -> Tuple[str, GSTINNormalizationDetails]:
        """
        Normalize raw GSTIN input string.

        Returns:
            Tuple of (sanitized_value, normalization_details)
        """
        raw_str = raw_input or ""
        notes: List[str] = []
        is_normalized = False

        # 1. Strip leading and trailing whitespace
        trimmed = raw_str.strip()
        if trimmed != raw_str:
            is_normalized = True
            notes.append("Stripped leading/trailing whitespace.")

        # 2. Uppercase normalization
        uppercased = trimmed.upper()
        if uppercased != trimmed:
            is_normalized = True
            notes.append("Converted lowercase characters to uppercase.")

        # 3. Delimiter and internal whitespace stripping
        cleaned = re.sub(r"[\s\-_.:,;/]+", "", uppercased)
        if cleaned != uppercased:
            is_normalized = True
            notes.append(f"Removed internal delimiters/whitespace: '{uppercased}' -> '{cleaned}'.")

        final_value = cleaned

        # 4. Controlled OCR Artifact Detection (Only applied to candidate 15-char strings)
        if len(cleaned) == 15 and not STRICT_GSTIN_REGEX.match(cleaned):
            repaired, repair_note = self._attempt_controlled_ocr_repair(cleaned)
            if repaired and repaired != cleaned:
                final_value = repaired
                is_normalized = True
                notes.append(repair_note)

        details = GSTINNormalizationDetails(
            raw_input=raw_str,
            normalized_value=final_value,
            is_normalized=is_normalized,
            normalization_notes=notes,
        )

        return final_value, details

    def _attempt_controlled_ocr_repair(self, candidate: str) -> Tuple[str, str]:
        """
        Attempt controlled, testable OCR repairs on a 15-char candidate.
        Only accepts repairs if the resulting string matches strict syntax and valid state/checksum.
        """
        chars = list(candidate)
        repair_notes = []

        # Position 1-2 (State Code): Check if letter 'O' was used for digit '0' (e.g. 'O7' -> '07')
        if chars[0] == 'O' and chars[1].isdigit():
            chars[0] = '0'
            repair_notes.append("OCR Repair: Replaced letter 'O' at index 0 with digit '0' in state code.")
        elif chars[0].isdigit() and chars[1] == 'O':
            chars[1] = '0'
            repair_notes.append("OCR Repair: Replaced letter 'O' at index 1 with digit '0' in state code.")

        # Position 14 (14th char, index 13): Standard default constant is 'Z'
        # Common OCR confusion: '2' instead of 'Z' in 14th slot
        if chars[13] == '2':
            # Test if converting '2' to 'Z' satisfies checksum
            test_candidate = "".join(chars[:13] + ['Z'] + chars[14:])
            checksum_valid, _, _ = verify_gstin_checksum(test_candidate)
            if checksum_valid:
                chars[13] = 'Z'
                repair_notes.append("OCR Repair: Corrected constant character at index 13 from '2' to 'Z' (verified by Luhn Mod-36).")

        repaired_str = "".join(chars)

        # Confirm the repaired string matches strict syntax and has valid state code
        if STRICT_GSTIN_REGEX.match(repaired_str) and is_valid_state_code(repaired_str[:2]):
            return repaired_str, " | ".join(repair_notes) if repair_notes else "Normalized candidate."

        return candidate, ""


# Singleton instance
gstin_normalizer = GSTINNormalizer()
