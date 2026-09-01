import re
from typing import List, Tuple
from app.schemas.statutory import PANNormalizationDetails

STRICT_PAN_REGEX = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$")


class PANNormalizer:
    """
    Controlled, auditable PAN normalizer.
    Cleans delimiters, whitespace, and case without silently altering source evidence.
    Applies controlled OCR candidate repairs only when validated by strict PAN syntax rules,
    and records every transformation in auditable normalization notes.
    """

    def normalize(self, raw_input: str) -> Tuple[str, PANNormalizationDetails]:
        """
        Normalize raw PAN input string.

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

        # 4. Controlled OCR Artifact Detection (Only applied to candidate 10-char strings)
        if len(cleaned) == 10 and not STRICT_PAN_REGEX.match(cleaned):
            repaired, repair_note = self._attempt_controlled_ocr_repair(cleaned)
            if repaired and repaired != cleaned:
                final_value = repaired
                is_normalized = True
                notes.append(repair_note)

        details = PANNormalizationDetails(
            raw_input=raw_str,
            normalized_value=final_value,
            is_normalized=is_normalized,
            normalization_notes=notes,
        )

        return final_value, details

    def _attempt_controlled_ocr_repair(self, candidate: str) -> Tuple[str, str]:
        """
        Attempt controlled, testable OCR repairs on a 10-char candidate.
        Positions 0-4: alphabetic
        Positions 5-8: numeric (4 digits)
        Position 9: alphabetic
        """
        chars = list(candidate)
        repair_notes: List[str] = []

        # Positions 0-4 (Must be alphabetic): Check for common digit '0' instead of 'O'
        for i in range(5):
            if chars[i] == "0":
                chars[i] = "O"
                repair_notes.append(f"OCR Repair: Replaced digit '0' at index {i} with letter 'O'.")
            elif chars[i] == "1":
                chars[i] = "I"
                repair_notes.append(f"OCR Repair: Replaced digit '1' at index {i} with letter 'I'.")

        # Positions 5-8 (Must be numeric): Check for common letter 'O' instead of '0', 'I' instead of '1'
        for i in range(5, 9):
            if chars[i] == "O":
                chars[i] = "0"
                repair_notes.append(f"OCR Repair: Replaced letter 'O' at numeric index {i} with digit '0'.")
            elif chars[i] == "I":
                chars[i] = "1"
                repair_notes.append(f"OCR Repair: Replaced letter 'I' at numeric index {i} with digit '1'.")

        # Position 9 (Must be alphabetic)
        if chars[9] == "0":
            chars[9] = "O"
            repair_notes.append("OCR Repair: Replaced digit '0' at index 9 with letter 'O'.")

        repaired_str = "".join(chars)
        if STRICT_PAN_REGEX.match(repaired_str):
            return repaired_str, " | ".join(repair_notes) if repair_notes else "Normalized candidate."

        return candidate, ""


# Singleton instance
pan_normalizer = PANNormalizer()
