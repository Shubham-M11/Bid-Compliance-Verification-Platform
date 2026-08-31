from datetime import date, timedelta
import pytest
from app.services.compliance.luhn_mod36 import (
    calculate_gstin_checksum,
    verify_gstin_checksum,
)
from app.services.compliance.pan_decoder import (
    check_pan_name_consistency,
    decode_pan_entity_type,
    is_valid_pan_format,
)
from app.services.compliance.state_codes import (
    INDIAN_STATE_CODES,
    get_state_name,
    is_valid_state_code,
)


class TestStateCodes:
    """Test official Indian 2-digit state code mapping."""

    def test_valid_state_codes(self):
        assert is_valid_state_code("01") is True  # Jammu & Kashmir
        assert is_valid_state_code("07") is True  # Delhi
        assert is_valid_state_code("27") is True  # Maharashtra
        assert is_valid_state_code("29") is True  # Karnataka
        assert is_valid_state_code("33") is True  # Tamil Nadu
        assert is_valid_state_code("38") is True  # Ladakh
        assert is_valid_state_code("97") is True  # Other Territory
        assert is_valid_state_code("99") is True  # Centre Jurisdiction

    def test_invalid_state_codes(self):
        assert is_valid_state_code("00") is False
        assert is_valid_state_code("39") is False
        assert is_valid_state_code("98") is False
        assert is_valid_state_code("XX") is False

    def test_get_state_name(self):
        assert get_state_name("27") == "Maharashtra"
        assert get_state_name("07") == "Delhi"
        assert get_state_name("29") == "Karnataka"
        assert get_state_name("999") is None


class TestLuhnMod36GSTINChecksum:
    """Test GSTIN Luhn Mod-36 checksum calculation and verification."""

    @pytest.mark.parametrize(
        "first_14,expected_checksum",
        [
            ("27AAACT2727Q1Z", "W"),  # Tech Mahindra
            ("29AAACH2702H1Z", "W"),  # Infosys
            ("29AAACB1976G1Z", "M"),  # Bharat Electronics
            ("07AABFN1234F1Z", "S"),  # NexaTech Innovations
            ("09AABCA5678A1Z", "T"),  # Apex Infotech
            ("27AAACD9999D1Z", "7"),  # Defunct Trading
            ("06APSPS4321P1Z", "5"),  # Sharma Electricals
            ("33AAACA6529K1Z", "Q"),  # Ashok Leyland
        ],
    )
    def test_calculate_gstin_checksum_known_values(self, first_14, expected_checksum):
        calc = calculate_gstin_checksum(first_14)
        assert calc == expected_checksum

    def test_verify_gstin_checksum_valid(self):
        is_valid, expected, actual = verify_gstin_checksum("27AAACT2727Q1ZW")
        assert is_valid is True
        assert expected == "W"
        assert actual == "W"

    def test_verify_gstin_checksum_invalid(self):
        # Corrupt 15th character from 'W' to 'Z'
        is_valid, expected, actual = verify_gstin_checksum("27AAACT2727Q1ZZ")
        assert is_valid is False
        assert expected == "W"
        assert actual == "Z"

    def test_verify_gstin_checksum_invalid_length(self):
        is_valid, expected, actual = verify_gstin_checksum("27AAACT2727Q")
        assert is_valid is False
        assert expected is None
        assert actual is None


class TestPANDecoder:
    """Test PAN structural validation, entity type decoding, and name consistency."""

    def test_pan_format_validation(self):
        assert is_valid_pan_format("AAACT2727Q") is True
        assert is_valid_pan_format("APSPS4321P") is True
        assert is_valid_pan_format("AABFN1234F") is True
        assert is_valid_pan_format("invalid") is False
        assert is_valid_pan_format("AAACT2727") is False  # 9 chars
        assert is_valid_pan_format("AAACT2727QQ") is False  # 11 chars
        assert is_valid_pan_format("12345ABCDE") is False

    @pytest.mark.parametrize(
        "pan,expected_entity_key,expected_substr",
        [
            ("AAACT2727Q", "COMPANY", "Company"),
            ("APSPS4321P", "INDIVIDUAL", "Individual"),
            ("AAAHH2702H", "HUF", "Hindu Undivided Family"),
            ("AABFN1234F", "PARTNERSHIP_FIRM_LLP", "Partnership"),
            ("AAAAA1234A", "AOP", "Association"),
            ("AAATT1234T", "TRUST", "Trust"),
            ("AAABA1234B", "BOI", "Body of Individuals"),
            ("AAALA1234L", "LOCAL_AUTHORITY", "Local Authority"),
            ("AAAJA1234J", "ARTIFICIAL_JURIDICAL_PERSON", "Artificial Juridical Person"),
            ("AAAGA1976G", "GOVERNMENT", "Government"),
        ],
    )
    def test_decode_pan_entity_type(self, pan, expected_entity_key, expected_substr):
        key, label = decode_pan_entity_type(pan)
        assert key == expected_entity_key
        assert expected_substr in label

    def test_pan_name_consistency_individual(self):
        # Individual PAN 'APSPS4321P': 5th char is 'S'
        # Expected name: Rajesh Kumar Sharma (Surname: Sharma -> initial 'S')
        signal, note = check_pan_name_consistency("APSPS4321P", "Rajesh Kumar Sharma")
        assert signal == "MATCH"
        assert "sharma" in note.lower()

        # Mismatched surname
        signal_bad, note_bad = check_pan_name_consistency("APSPS4321P", "Rajesh Kumar Gupta")
        assert signal_bad == "MISMATCH"

    def test_pan_name_consistency_company(self):
        # Company PAN 'AAACT2727Q': 5th char is 'T'
        # Expected name: Tech Mahindra Limited (Primary token: Tech -> initial 'T')
        signal, note = check_pan_name_consistency("AAACT2727Q", "Tech Mahindra Limited")
        assert signal == "MATCH"

        # Mismatched company name
        signal_bad, note_bad = check_pan_name_consistency("AAACT2727Q", "Infosys Limited")
        assert signal_bad == "MISMATCH"

    def test_pan_name_consistency_when_no_name_supplied(self):
        signal, note = check_pan_name_consistency("AAACT2727Q", None)
        assert signal == "NOT_CHECKED"

        signal_empty, _ = check_pan_name_consistency("AAACT2727Q", "   ")
        assert signal_empty == "NOT_CHECKED"
