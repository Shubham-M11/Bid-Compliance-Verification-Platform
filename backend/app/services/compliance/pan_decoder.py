import re
from typing import Dict, Optional, Tuple

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


def is_valid_pan_format(pan: str) -> bool:
    """Validate 10-character PAN format against canonical regex pattern."""
    if not pan:
        return False
    return bool(PAN_REGEX.match(pan.strip().upper()))


def decode_pan_entity_type(pan: str) -> Tuple[str, str]:
    """
    Decode the 4th character of a 10-character PAN into its standard entity classification.

    Returns:
        Tuple of (entity_type_enum_key, human_readable_label)
    """
    sanitized = pan.strip().upper()
    if len(sanitized) >= 4:
        code = sanitized[3]
        if code in PAN_ENTITY_TYPE_MAP:
            return PAN_ENTITY_TYPE_MAP[code]
    return "UNKNOWN", "Unknown / Unclassified Entity Type"


def check_pan_name_consistency(pan: str, expected_name: Optional[str]) -> Tuple[str, Optional[str]]:
    """
    Evaluate the 5th character of the PAN as an advisory name-consistency signal
    against a provided legal or individual name.

    In the Indian PAN schema:
    - For Individuals ('P'): 5th character is the first letter of the individual's surname / last name.
    - For Non-individuals ('C', 'F', 'T', etc.): 5th character is the first letter of the entity's registered legal name.

    Returns:
        Tuple of (signal_status: "MATCH" | "MISMATCH" | "NOT_CHECKED", explanatory_note)
    """
    if not expected_name or not expected_name.strip():
        return "NOT_CHECKED", "No expected legal name supplied for 5th-character consistency evaluation."

    sanitized_pan = pan.strip().upper()
    if len(sanitized_pan) < 5 or not is_valid_pan_format(sanitized_pan):
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
            f"5th character '{fifth_char}' does not match surname '{words[-1]}' or first name '{words[0]}'."
        )

    # For Corporate / Non-Individual Entities, check primary name tokens
    # Filter common legal suffixes like 'PRIVATE', 'LTD', 'LIMITED', 'LLP', 'CORP', 'PVT'
    ignored_suffixes = {"PVT", "PRIVATE", "LTD", "LIMITED", "LLP", "INC", "CORP", "CORPORATION", "ENTERPRISE", "ENTERPRISES"}
    substantive_words = [w for w in words if w not in ignored_suffixes]
    target_words = substantive_words if substantive_words else words

    # Check if first substantive word or any leading word matches
    first_char = target_words[0][0] if target_words else ""
    if fifth_char == first_char:
        return "MATCH", f"5th character '{fifth_char}' matches primary entity name token '{target_words[0]}'."

    # Also check full words list in case official prefix like 'M/S' was present
    if any(w[0] == fifth_char for w in words):
        return "MATCH", f"5th character '{fifth_char}' matches token in entity name."

    return (
        "MISMATCH",
        f"5th character '{fifth_char}' does not match leading entity token '{target_words[0]}'."
    )
