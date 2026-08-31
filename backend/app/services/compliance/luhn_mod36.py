from typing import Optional, Tuple

# Base-36 Character set for GSTIN Checksum
ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
RADIX = 36


def calculate_gstin_checksum(first_14_chars: str) -> Optional[str]:
    """
    Compute the 15th checksum character of a 14-character GSTIN prefix
    using the official Indian GSTN Luhn Mod-36 checksum algorithm.

    Algorithm:
    1. For each character from index 0 to 13, find its base-36 value (0-35).
    2. Weight factor alternates: 1 for even index (0, 2, 4...), 2 for odd index (1, 3, 5...).
    3. Multiply base-36 value by weighting factor.
    4. Compute quotient and remainder when divided by 36, and sum them: (product // 36) + (product % 36).
    5. Sum these values across all 14 characters.
    6. Checksum value = (36 - (total_sum % 36)) % 36.
    7. Look up the character corresponding to checksum value in ALPHABET.

    Returns:
        The single-character checksum (0-9, A-Z) or None if input is invalid.
    """
    sanitized = first_14_chars.strip().upper()
    if len(sanitized) != 14:
        return None

    total_sum = 0
    for idx, char in enumerate(sanitized):
        code_point = ALPHABET.find(char)
        if code_point == -1:
            return None  # Invalid character not in base-36 alphabet

        factor = 1 if (idx % 2 == 0) else 2
        product = code_point * factor
        digit_sum = (product // RADIX) + (product % RADIX)
        total_sum += digit_sum

    remainder = total_sum % RADIX
    check_code_point = (RADIX - remainder) % RADIX
    return ALPHABET[check_code_point]


def verify_gstin_checksum(gstin: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Verify whether the 15th character of a 15-character GSTIN matches the calculated checksum.

    Returns:
        Tuple of (is_valid, expected_checksum_char, actual_checksum_char)
    """
    sanitized = gstin.strip().upper()
    if len(sanitized) != 15:
        return False, None, None

    actual_char = sanitized[14]
    expected_char = calculate_gstin_checksum(sanitized[:14])

    if expected_char is None:
        return False, None, actual_char

    return (actual_char == expected_char), expected_char, actual_char
