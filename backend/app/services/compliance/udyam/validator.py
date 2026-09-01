import re
from typing import Dict, List, Optional
from app.schemas.statutory import (
    UdyamDeterministicResult,
    UdyamNormalizationDetails,
    UdyamSegmentItem,
    UdyamStructureBreakdown,
)

# Canonical Udyam format: UDYAM-XX-00-0000000
UDYAM_REGEX = re.compile(r"^UDYAM-([A-Z]{2})-([0-9]{2})-([0-9]{7})$")

UDYAM_STATE_CODE_MAP: Dict[str, str] = {
    "AN": "Andaman and Nicobar Islands",
    "AP": "Andhra Pradesh",
    "AR": "Arunachal Pradesh",
    "AS": "Assam",
    "BR": "Bihar",
    "CH": "Chandigarh",
    "CG": "Chhattisgarh",
    "DD": "Daman and Diu",
    "DL": "Delhi",
    "DN": "Dadra and Nagar Haveli",
    "GA": "Goa",
    "GJ": "Gujarat",
    "HR": "Haryana",
    "HP": "Himachal Pradesh",
    "JK": "Jammu and Kashmir",
    "JH": "Jharkhand",
    "KA": "Karnataka",
    "KR": "Karnataka",
    "KL": "Kerala",
    "LA": "Ladakh",
    "LD": "Lakshadweep",
    "MP": "Madhya Pradesh",
    "MH": "Maharashtra",
    "MN": "Manipur",
    "ML": "Meghalaya",
    "MZ": "Mizoram",
    "NL": "Nagaland",
    "OD": "Odisha",
    "PB": "Punjab",
    "PY": "Puducherry",
    "RJ": "Rajasthan",
    "SK": "Sikkim",
    "TN": "Tamil Nadu",
    "TS": "Telangana",
    "TR": "Tripura",
    "UP": "Uttar Pradesh",
    "UK": "Uttarakhand",
    "WB": "West Bengal",
}


class UdyamStructuralValidator:
    """
    Evaluates character-level structural validity of Indian Udyam Registration Numbers.
    Parses prefix, state code, district identifier, and sequential registration serial.
    """

    def validate_structure(
        self,
        sanitized_udyam: str,
        normalization_details: Optional[UdyamNormalizationDetails] = None,
    ) -> UdyamDeterministicResult:
        """
        Execute deterministic structural parsing and validation.

        Returns:
            UdyamDeterministicResult containing 4-part segment breakdown and error list.
        """
        sanitized = sanitized_udyam.strip().upper()
        errors: List[str] = []

        match = UDYAM_REGEX.match(sanitized)
        is_format_valid = bool(match)
        state_code: Optional[str] = None
        state_name: Optional[str] = None
        district_code: Optional[str] = None
        sequential_id: Optional[str] = None

        if not is_format_valid:
            errors.append(
                f"Udyam registration number '{sanitized}' does not match standard pattern (format: UDYAM-XX-00-0000000)."
            )
        else:
            state_code = match.group(1)
            district_code = match.group(2)
            sequential_id = match.group(3)
            state_name = UDYAM_STATE_CODE_MAP.get(state_code, "Other / UT")

            if state_code not in UDYAM_STATE_CODE_MAP:
                errors.append(f"State code '{state_code}' is not in the recognized 2-letter state directory.")

        breakdown = self._build_structure_breakdown(
            sanitized=sanitized,
            is_valid=is_format_valid,
            state_code=state_code,
            state_name=state_name,
            district_code=district_code,
            sequential_id=sequential_id,
        )

        return UdyamDeterministicResult(
            is_format_valid=is_format_valid,
            state_code=state_code,
            state_name=state_name,
            district_code=district_code,
            sequential_id=sequential_id,
            validation_errors=errors,
            structure_breakdown=breakdown,
            normalization=normalization_details,
        )

    def _build_structure_breakdown(
        self,
        sanitized: str,
        is_valid: bool,
        state_code: Optional[str],
        state_name: Optional[str],
        district_code: Optional[str],
        sequential_id: Optional[str],
    ) -> Optional[UdyamStructureBreakdown]:
        """Generate structured 4-part segment metadata for Udyam candidate."""
        if not is_valid or not state_code or not district_code or not sequential_id:
            return None

        # Segment 1: Fixed Scheme Prefix ('UDYAM')
        prefix_seg = UdyamSegmentItem(
            segment_name="Scheme Prefix",
            characters="UDYAM",
            position_range="Prefix",
            is_valid=True,
            description="Ministry of MSME Udyam Registration Prefix",
        )

        # Segment 2: State Code (2 letters)
        state_valid = state_code in UDYAM_STATE_CODE_MAP
        state_seg = UdyamSegmentItem(
            segment_name="State Code",
            characters=state_code,
            position_range="State (2-letter)",
            is_valid=state_valid,
            description=f"State / Territory: {state_name}"
            if state_valid
            else f"Unrecognized state code '{state_code}'",
        )

        # Segment 3: District Identifier (2 digits) - Conservative parsing
        district_seg = UdyamSegmentItem(
            segment_name="District Identifier",
            characters=district_code,
            position_range="District (2-digit)",
            is_valid=district_code.isdigit(),
            description=f"Parsed registration component (District Code: {district_code})",
        )

        # Segment 4: Sequential Registration Number (7 digits)
        serial_seg = UdyamSegmentItem(
            segment_name="Registration Sequence",
            characters=sequential_id,
            position_range="Serial (7-digit)",
            is_valid=sequential_id.isdigit(),
            description=f"Enterprise registration sequential ID #{sequential_id}",
        )

        return UdyamStructureBreakdown(
            prefix_segment=prefix_seg,
            state_segment=state_seg,
            district_segment=district_seg,
            serial_segment=serial_seg,
        )


# Singleton instance
udyam_structural_validator = UdyamStructuralValidator()
