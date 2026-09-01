import re
from typing import Dict, List, Optional, Tuple
from app.schemas.statutory import (
    PANDeterministicResult,
    PANEntityType,
    PANNormalizationDetails,
    PANSegmentItem,
    PANStructureBreakdown,
)

# Canonical 10-character PAN regex: 5 uppercase letters + 4 digits + 1 uppercase letter
PAN_REGEX = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$")

PAN_ENTITY_TYPE_MAP: Dict[str, Tuple[str, str]] = {
    "C": ("COMPANY", "Company (Private / Public Limited)"),
    "P": ("INDIVIDUAL", "Individual / Person"),
    "H": ("HUF", "Hindu Undivided Family"),
    "F": ("PARTNERSHIP_FIRM_LLP", "Partnership Firm / LLP"),
    "A": ("AOP", "Association of Persons"),
    "T": ("TRUST", "Trust"),
    "B": ("BOI", "Body of Individuals"),
    "L": ("LOCAL_AUTHORITY", "Local Authority"),
    "J": ("ARTIFICIAL_JURIDICAL_PERSON", "Artificial Juridical Person"),
    "G": ("GOVERNMENT", "Government Agency"),
}


class PANStructuralValidator:
    """
    Evaluates character-level structural validity and entity classification of Indian Permanent Account Numbers (PAN).
    
    NOTE ON CHECKSUM:
    PAN does not have a publicly documented checksum algorithm used for deterministic validation.
    The 10th character is validated strictly as an alphabetic identifier suffix.
    """

    def validate_structure(
        self,
        sanitized_pan: str,
        expected_legal_name: Optional[str] = None,
        normalization_details: Optional[PANNormalizationDetails] = None,
    ) -> PANDeterministicResult:
        """
        Execute deterministic structural parsing, entity decoding, and 5th-character name initial check.

        Returns:
            PANDeterministicResult containing 5-part character breakdown, entity classification, and name signal.
        """
        sanitized = sanitized_pan.strip().upper()
        errors: List[str] = []

        is_format_valid = bool(PAN_REGEX.match(sanitized))
        entity_type_code: Optional[str] = None
        entity_type_key = "UNKNOWN"
        entity_type_label: Optional[str] = None
        fifth_char: Optional[str] = None
        name_signal: Optional[str] = None
        name_note: Optional[str] = None

        if not is_format_valid:
            errors.append(
                f"PAN '{sanitized}' does not match standard 10-character syntax (format: ABCDE1234F - 5 letters, 4 digits, 1 letter)."
            )
            if len(sanitized) >= 4 and sanitized[3] in PAN_ENTITY_TYPE_MAP:
                entity_type_code = sanitized[3]
                entity_type_key, entity_type_label = PAN_ENTITY_TYPE_MAP[entity_type_code]
        else:
            entity_type_code = sanitized[3]
            if entity_type_code in PAN_ENTITY_TYPE_MAP:
                entity_type_key, entity_type_label = PAN_ENTITY_TYPE_MAP[entity_type_code]
            else:
                entity_type_label = f"Unclassified Entity Code '{entity_type_code}'"
                errors.append(f"4th character '{entity_type_code}' is not a recognized statutory entity code.")

            fifth_char = sanitized[4]
            name_signal, name_note = self.check_name_consistency(sanitized, expected_legal_name)

        entity_type = PANEntityType(entity_type_key)

        # Build 5-part structural breakdown
        breakdown = self._build_structure_breakdown(
            sanitized=sanitized,
            is_valid=is_format_valid,
            entity_type_label=entity_type_label or entity_type.value,
        )

        return PANDeterministicResult(
            is_format_valid=is_format_valid,
            entity_type_code=entity_type_code,
            entity_type=entity_type,
            entity_type_label=entity_type_label,
            fifth_character=fifth_char,
            name_consistency_signal=name_signal,
            name_consistency_note=name_note,
            validation_errors=errors,
            structure_breakdown=breakdown,
            normalization=normalization_details,
        )

    def _build_structure_breakdown(
        self,
        sanitized: str,
        is_valid: bool,
        entity_type_label: str,
    ) -> Optional[PANStructureBreakdown]:
        """Generate structured 5-part segment metadata for 10-character candidate."""
        if len(sanitized) != 10:
            return None

        # Segment 1: Series Prefix (Chars 1-3)
        series_chars = sanitized[0:3]
        series_valid = series_chars.isalpha()
        series_seg = PANSegmentItem(
            segment_name="Series Prefix",
            characters=series_chars,
            position_range="1-3",
            is_valid=series_valid,
            description=f"Alphabetic series sequence '{series_chars}' (AAA to ZZZ)"
            if series_valid
            else "Invalid prefix (must be 3 alphabetic characters)",
        )

        # Segment 2: Entity Code (Char 4)
        entity_char = sanitized[3]
        entity_valid = entity_char in PAN_ENTITY_TYPE_MAP
        entity_seg = PANSegmentItem(
            segment_name="Entity Code",
            characters=entity_char,
            position_range="4",
            is_valid=entity_valid,
            description=f"Entity Type '{entity_char}': {entity_type_label}",
        )

        # Segment 3: Name Initial (Char 5)
        name_char = sanitized[4]
        name_valid = name_char.isalpha()
        name_seg = PANSegmentItem(
            segment_name="Name Initial",
            characters=name_char,
            position_range="5",
            is_valid=name_valid,
            description=f"First letter of surname (individual) or registered legal entity name ('{name_char}')"
            if name_valid
            else "Invalid name initial (must be alphabetic)",
        )

        # Segment 4: Sequential Number (Chars 6-9)
        seq_chars = sanitized[5:9]
        seq_valid = seq_chars.isdigit()
        seq_seg = PANSegmentItem(
            segment_name="Sequential Number",
            characters=seq_chars,
            position_range="6-9",
            is_valid=seq_valid,
            description=f"4-digit sequential numeric series '{seq_chars}' (0001-9999)"
            if seq_valid
            else "Invalid sequence (must be 4 numeric digits)",
        )

        # Segment 5: Final Character / Identifier Suffix (Char 10) - NOT A CHECKSUM
        suffix_char = sanitized[9]
        suffix_valid = suffix_char.isalpha()
        suffix_seg = PANSegmentItem(
            segment_name="Final Character / Identifier Suffix",
            characters=suffix_char,
            position_range="10",
            is_valid=suffix_valid,
            description=f"Alphabetic identifier suffix '{suffix_char}' (Note: PAN does not have a public checksum algorithm)"
            if suffix_valid
            else "Invalid suffix (must be an alphabetic character)",
        )

        return PANStructureBreakdown(
            series_segment=series_seg,
            entity_segment=entity_seg,
            name_initial_segment=name_seg,
            sequential_segment=seq_seg,
            suffix_segment=suffix_seg,
        )

    def check_name_consistency(self, pan: str, expected_name: Optional[str]) -> Tuple[str, Optional[str]]:
        """
        Evaluate the 5th character of the PAN as an advisory name-consistency signal.
        """
        if not expected_name or not expected_name.strip():
            return "NOT_CHECKED", "No expected legal name supplied for 5th-character consistency evaluation."

        sanitized_pan = pan.strip().upper()
        if len(sanitized_pan) < 5 or not bool(PAN_REGEX.match(sanitized_pan)):
            return "NOT_CHECKED", "Invalid PAN format; 5th character check skipped."

        fifth_char = sanitized_pan[4]
        entity_code = sanitized_pan[3]
        clean_name = expected_name.strip().upper()
        words = [w for w in re.split(r"[\s\.,\-_]+", clean_name) if w]

        if not words:
            return "NOT_CHECKED", "Expected name contained no alphanumeric tokens."

        # For Individuals ('P'), check against surname (last word) or first name
        if entity_code == "P":
            last_word_initial = words[-1][0] if words else ""
            first_word_initial = words[0][0] if words else ""
            if fifth_char in (last_word_initial, first_word_initial):
                return "MATCH", f"5th character '{fifth_char}' matches initial of individual name token '{words[-1]}'."
            return (
                "MISMATCH",
                f"5th character '{fifth_char}' does not match surname '{words[-1]}' or first name '{words[0]}'.",
            )

        # For Corporate / Non-Individual Entities, check primary name tokens
        ignored_suffixes = {
            "PVT",
            "PRIVATE",
            "LTD",
            "LIMITED",
            "LLP",
            "INC",
            "CORP",
            "CORPORATION",
            "ENTERPRISE",
            "ENTERPRISES",
        }
        substantive_words = [w for w in words if w not in ignored_suffixes]
        target_words = substantive_words if substantive_words else words

        first_char = target_words[0][0] if target_words else ""
        if fifth_char == first_char:
            return "MATCH", f"5th character '{fifth_char}' matches primary entity name token '{target_words[0]}'."

        if any(w[0] == fifth_char for w in words):
            return "MATCH", f"5th character '{fifth_char}' matches token in entity name."

        return (
            "MISMATCH",
            f"5th character '{fifth_char}' does not match leading entity token '{target_words[0]}'.",
        )


# Singleton instance
pan_structural_validator = PANStructuralValidator()
