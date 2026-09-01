import re
from typing import List, Optional, Tuple
from app.schemas.statutory import (
    GSTINDeterministicResult,
    GSTINNormalizationDetails,
    GSTINSegmentItem,
    GSTINStructureBreakdown,
    PANEntityType,
)
from app.services.compliance.luhn_mod36 import verify_gstin_checksum
from app.services.compliance.pan_decoder import decode_pan_entity_type, is_valid_pan_format
from app.services.compliance.state_codes import get_state_name, is_valid_state_code

# Strict 15-character GSTIN regex: 2 digits state code + 10 char PAN + 1 entity num + 1 'Z' + 1 checksum char
GSTIN_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")


class GSTINStructuralValidator:
    """
    Evaluates character-level structural validity of Indian GSTIN identifiers.
    Produces a detailed 5-part breakdown across State Code, Embedded PAN, Entity Serial,
    Default Constant, and Luhn Mod-36 Checksum.
    """

    def validate_structure(
        self,
        sanitized_gstin: str,
        expected_state_code: Optional[str] = None,
        normalization_details: Optional[GSTINNormalizationDetails] = None,
    ) -> GSTINDeterministicResult:
        """
        Execute deterministic structural parsing and validation.

        Returns:
            GSTINDeterministicResult containing segment breakdown, PAN decode, and Luhn Mod-36 status.
        """
        sanitized = sanitized_gstin.strip().upper()
        errors: List[str] = []

        is_format_valid = bool(GSTIN_REGEX.match(sanitized))
        state_code: Optional[str] = None
        state_name: Optional[str] = None
        is_state_code_valid = False
        extracted_pan: Optional[str] = None
        entity_type = PANEntityType.UNKNOWN
        entity_number: Optional[str] = None
        z_char: Optional[str] = None
        checksum_char: Optional[str] = None
        calc_checksum: Optional[str] = None
        is_checksum_valid = False

        if not is_format_valid:
            errors.append(
                f"GSTIN '{sanitized}' does not match standard 15-character syntax (format: 22AAAAA0000A1Z5)."
            )
            if len(sanitized) >= 2:
                state_code = sanitized[:2]
                state_name = get_state_name(state_code)
                is_state_code_valid = is_valid_state_code(state_code)
            if len(sanitized) >= 12:
                extracted_pan = sanitized[2:12]
                if is_valid_pan_format(extracted_pan):
                    entity_type_key, _ = decode_pan_entity_type(extracted_pan)
                    entity_type = PANEntityType(entity_type_key)
        else:
            state_code = sanitized[:2]
            state_name = get_state_name(state_code)
            is_state_code_valid = is_valid_state_code(state_code)
            if not is_state_code_valid:
                errors.append(f"State code '{state_code}' is not a recognized Indian State/UT code.")

            # Validate expected state code if supplied
            if expected_state_code and expected_state_code.strip():
                expected_sc = expected_state_code.strip()
                if state_code != expected_sc:
                    errors.append(
                        f"State code mismatch: GSTIN state code is '{state_code}' ({state_name}), but expected state code was '{expected_sc}'."
                    )

            extracted_pan = sanitized[2:12]
            entity_type_key, _ = decode_pan_entity_type(extracted_pan)
            entity_type = PANEntityType(entity_type_key)
            entity_number = sanitized[12]
            z_char = sanitized[13]
            checksum_char = sanitized[14]

            # 2. Algorithmic Checksum Validation (Luhn Mod-36)
            is_checksum_valid, calc_checksum, _ = verify_gstin_checksum(sanitized)
            if not is_checksum_valid:
                errors.append(
                    f"GSTIN checksum verification failed: 15th character is '{checksum_char}', but Luhn Mod-36 calculated checksum is '{calc_checksum}'."
                )

        # 3. Build 5-Part Structural Breakdown
        breakdown = self._build_structure_breakdown(
            sanitized=sanitized,
            state_code=state_code,
            state_name=state_name,
            is_state_valid=is_state_code_valid,
            extracted_pan=extracted_pan,
            entity_type=entity_type,
            entity_number=entity_number,
            z_char=z_char,
            checksum_char=checksum_char,
            calc_checksum=calc_checksum,
            is_checksum_valid=is_checksum_valid,
        )

        return GSTINDeterministicResult(
            is_format_valid=is_format_valid,
            state_code=state_code,
            state_name=state_name,
            is_state_code_valid=is_state_code_valid,
            extracted_pan=extracted_pan,
            entity_type=entity_type,
            entity_number=entity_number,
            z_character=z_char,
            checksum_char=checksum_char,
            calculated_checksum=calc_checksum,
            is_checksum_valid=is_checksum_valid,
            validation_errors=errors,
            structure_breakdown=breakdown,
            normalization=normalization_details,
        )

    def _build_structure_breakdown(
        self,
        sanitized: str,
        state_code: Optional[str],
        state_name: Optional[str],
        is_state_valid: bool,
        extracted_pan: Optional[str],
        entity_type: PANEntityType,
        entity_number: Optional[str],
        z_char: Optional[str],
        checksum_char: Optional[str],
        calc_checksum: Optional[str],
        is_checksum_valid: bool,
    ) -> Optional[GSTINStructureBreakdown]:
        """Generate structured segment metadata for 15-character candidate."""
        if len(sanitized) != 15:
            return None

        # Segment 1: State Code (Chars 1-2)
        s_code = sanitized[:2]
        s_valid = is_state_valid and s_code.isdigit()
        s_desc = (
            f"State/UT Code {s_code}: {state_name}"
            if s_valid and state_name
            else f"State Code {s_code} (Unrecognized)"
        )
        state_seg = GSTINSegmentItem(
            segment_name="State Code",
            characters=s_code,
            position_range="1-2",
            is_valid=s_valid,
            description=s_desc,
        )

        # Segment 2: Embedded PAN (Chars 3-12)
        pan_str = sanitized[2:12]
        pan_valid = is_valid_pan_format(pan_str)
        pan_desc = (
            f"Income Tax PAN ({entity_type.value} entity)"
            if pan_valid
            else "Invalid 10-character PAN format"
        )
        pan_seg = GSTINSegmentItem(
            segment_name="Embedded PAN",
            characters=pan_str,
            position_range="3-12",
            is_valid=pan_valid,
            description=pan_desc,
        )

        # Segment 3: Entity Serial (Char 13)
        ent_char = sanitized[12]
        ent_valid = ent_char.isalnum() and (ent_char != "0")
        ent_desc = f"Entity registration counter #{ent_char} in state" if ent_valid else "Invalid entity counter"
        ent_seg = GSTINSegmentItem(
            segment_name="Entity Number",
            characters=ent_char,
            position_range="13",
            is_valid=ent_valid,
            description=ent_desc,
        )

        # Segment 4: Default Constant (Char 14)
        const_char = sanitized[13]
        const_valid = const_char == "Z"
        const_desc = "Statutory default constant 'Z'" if const_valid else f"Expected 'Z', found '{const_char}'"
        const_seg = GSTINSegmentItem(
            segment_name="Default Constant",
            characters=const_char,
            position_range="14",
            is_valid=const_valid,
            description=const_desc,
        )

        # Segment 5: Checksum (Char 15)
        chk_char = sanitized[14]
        chk_desc = (
            f"Luhn Mod-36 checksum character '{chk_char}' (Verified)"
            if is_checksum_valid
            else f"Checksum mismatch: actual '{chk_char}', expected '{calc_checksum}'"
        )
        chk_seg = GSTINSegmentItem(
            segment_name="Luhn Mod-36 Checksum",
            characters=chk_char,
            position_range="15",
            is_valid=is_checksum_valid,
            description=chk_desc,
        )

        return GSTINStructureBreakdown(
            state_segment=state_seg,
            pan_segment=pan_seg,
            entity_segment=ent_seg,
            constant_segment=const_seg,
            checksum_segment=chk_seg,
        )


# Singleton instance
gstin_structural_validator = GSTINStructuralValidator()
