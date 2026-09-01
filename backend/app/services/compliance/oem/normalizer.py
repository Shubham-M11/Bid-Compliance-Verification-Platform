import re
from typing import List, Optional, Tuple
from app.schemas.statutory import OEMNormalizationDetails

# Regex to detect loose delimiter variations in MAF codes:
# e.g. "MAF/CSCO/2026/8891", "MAF - CSCO - 2026 - 8891", "HPE/IND/MAF/2026/0045"
LOOSE_MAF_REGEX = re.compile(
    r"\b([A-Z0-9]+)[\s\-_/:.]+([A-Z0-9]+)[\s\-_/:.]+([A-Z0-9]+)(?:[\s\-_/:.]+([A-Z0-9]+))*\b",
    re.IGNORECASE,
)


class OEMNormalizer:
    """
    Controlled, auditable OEM / MAF normalizer.
    Standardizes certificate codes, delimiters, and legal entity names without silently altering source evidence.
    Records every transformation in auditable normalization notes.
    """

    def normalize_maf_number(
        self, raw_input: Optional[str]
    ) -> Tuple[Optional[str], OEMNormalizationDetails]:
        """
        Normalize raw MAF reference string.

        Returns:
            Tuple of (sanitized_maf_reference, normalization_details)
        """
        if not raw_input:
            return None, OEMNormalizationDetails(
                raw_input="",
                normalized_value="",
                is_normalized=False,
                normalization_notes=[],
            )

        raw_str = raw_input
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

        # 3. Delimiter normalization (replace slashes, underscores, multiple spaces with standard hyphens)
        standardized_delims = re.sub(r"[\s\-_/:.]+", "-", uppercased).strip("-")
        if standardized_delims != uppercased:
            is_normalized = True
            notes.append(f"Standardized delimiters: '{uppercased}' -> '{standardized_delims}'.")

        final_value = standardized_delims

        details = OEMNormalizationDetails(
            raw_input=raw_str,
            normalized_value=final_value,
            is_normalized=is_normalized,
            normalization_notes=notes,
        )

        return final_value, details

    def normalize_entity_name(self, raw_name: Optional[str]) -> str:
        """
        Standardize company/entity names for robust cross-document comparison.
        Normalizes variations of 'Private Limited', 'Pvt Ltd', 'LLP', etc.
        """
        if not raw_name:
            return ""

        clean = raw_name.strip().upper()
        # Normalize punctuation inside corporate suffixes
        clean = re.sub(r"\bP\s*\.?\s*V\s*\.?\s*T\s*\.?\b", "PRIVATE", clean)
        clean = re.sub(r"\bPVT\s*\.?\b", "PRIVATE", clean)
        clean = re.sub(r"\bL\s*\.?\s*T\s*\.?\s*D\s*\.?\b", "LIMITED", clean)
        clean = re.sub(r"\bLTD\s*\.?\b", "LIMITED", clean)
        clean = re.sub(r"\s+", " ", clean).strip()

        return clean


# Singleton instance
oem_normalizer = OEMNormalizer()
