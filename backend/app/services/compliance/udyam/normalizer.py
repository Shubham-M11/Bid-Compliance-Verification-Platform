import re
from typing import List, Tuple
from app.schemas.statutory import UdyamNormalizationDetails

STRICT_UDYAM_REGEX = re.compile(r"^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$")
LOOSE_UDYAM_REGEX = re.compile(r"^UDYAM[\s\-_/:.]+([A-Z]{2})[\s\-_/:.]+([0-9]{2})[\s\-_/:.]+([0-9]{7})$", re.IGNORECASE)


class UdyamNormalizer:
    """
    Controlled, auditable Udyam normalizer.
    Cleans delimiters, slashes, whitespace, and case without silently altering source evidence.
    Records every transformation in auditable normalization notes.
    """

    def normalize(self, raw_input: str) -> Tuple[str, UdyamNormalizationDetails]:
        """
        Normalize raw Udyam input string.

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

        final_value = uppercased

        # 3. Delimiter normalization (e.g. spaces/slashes to hyphens)
        if not STRICT_UDYAM_REGEX.match(uppercased):
            loose_match = LOOSE_UDYAM_REGEX.match(uppercased)
            if loose_match:
                state, district, serial = loose_match.group(1), loose_match.group(2), loose_match.group(3)
                standardized = f"UDYAM-{state.upper()}-{district}-{serial}"
                if standardized != uppercased:
                    final_value = standardized
                    is_normalized = True
                    notes.append(f"Standardized delimiters: '{uppercased}' -> '{standardized}'.")

        details = UdyamNormalizationDetails(
            raw_input=raw_str,
            normalized_value=final_value,
            is_normalized=is_normalized,
            normalization_notes=notes,
        )

        return final_value, details


# Singleton instance
udyam_normalizer = UdyamNormalizer()
