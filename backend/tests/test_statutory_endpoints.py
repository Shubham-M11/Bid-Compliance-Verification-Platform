from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestGSTINVerificationEndpoint:
    """Test POST /api/v1/statutory/gstin/verify endpoint."""

    def test_verify_known_valid_gstin_endpoint(self):
        payload = {
            "gstin": "27AAACT2727Q1ZW",
            "expected_legal_name": "Tech Mahindra Limited",
            "expected_state_code": "27",
        }
        response = client.post("/api/v1/statutory/gstin/verify", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["gstin"] == "27AAACT2727Q1ZW"
        assert data["is_live_government_source"] is False
        assert "simulated/mock" in data["disclaimer"]

        # Deterministic Section
        det = data["deterministic"]
        assert det["is_format_valid"] is True
        assert det["state_code"] == "27"
        assert det["state_name"] == "Maharashtra"
        assert det["is_state_code_valid"] is True
        assert det["extracted_pan"] == "AAACT2727Q"
        assert det["entity_type"] == "COMPANY"
        assert det["is_checksum_valid"] is True
        assert det["calculated_checksum"] == "W"
        assert det["checksum_char"] == "W"

        # Registry Section
        reg = data["registry"]
        assert reg["registry_found"] is True
        assert reg["source"] == "mock_registry"
        assert reg["record"]["legal_name"] == "TECH MAHINDRA LIMITED"
        assert reg["record"]["status"] == "ACTIVE"

        # Name Match & Overall Status
        assert data["name_match_status"] == "MATCH"
        assert data["overall_status"] == "VALID"

    def test_verify_unregistered_valid_gstin_endpoint(self):
        """MANDATORY GUARDRAIL: Structurally valid GSTIN not in mock DB returns registry_found=False with NO fabrication."""
        payload = {
            "gstin": "33AAACA6529K1ZQ",  # Valid Ashok Leyland GSTIN (Tamil Nadu)
            "expected_state_code": "33",
        }
        response = client.post("/api/v1/statutory/gstin/verify", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["deterministic"]["is_format_valid"] is True
        assert data["deterministic"]["is_checksum_valid"] is True
        assert data["deterministic"]["state_name"] == "Tamil Nadu"

        # Registry should be cleanly null/not found
        assert data["registry"]["registry_found"] is False
        assert data["registry"]["record"] is None
        assert data["overall_status"] == "RECORD_NOT_FOUND"

    def test_verify_invalid_checksum_endpoint(self):
        payload = {
            "gstin": "27AAACT2727Q1ZZ",  # Expected 'W', supplied 'Z'
        }
        response = client.post("/api/v1/statutory/gstin/verify", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["deterministic"]["is_format_valid"] is True
        assert data["deterministic"]["is_checksum_valid"] is False
        assert data["overall_status"] == "INVALID_CHECKSUM"
        assert any("checksum" in err.lower() for err in data["deterministic"]["validation_errors"])

    def test_verify_state_code_mismatch_endpoint(self):
        payload = {
            "gstin": "27AAACT2727Q1ZW",  # Maharashtra (27)
            "expected_state_code": "29",  # Karnataka expected
        }
        response = client.post("/api/v1/statutory/gstin/verify", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["deterministic"]["is_format_valid"] is True
        assert any("State code mismatch" in err for err in data["deterministic"]["validation_errors"])


class TestPANVerificationEndpoint:
    """Test POST /api/v1/statutory/pan/verify endpoint."""

    def test_verify_corporate_pan_endpoint(self):
        payload = {
            "pan": "AAACT2727Q",
            "expected_legal_name": "Tech Mahindra Limited",
        }
        response = client.post("/api/v1/statutory/pan/verify", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["pan"] == "AAACT2727Q"
        assert data["deterministic"]["is_format_valid"] is True
        assert data["deterministic"]["entity_type"] == "COMPANY"
        assert data["deterministic"]["name_consistency_signal"] == "MATCH"
        assert data["registry"]["registry_found"] is True
        assert data["registry"]["record"]["full_name"] == "TECH MAHINDRA LIMITED"
        assert data["overall_status"] == "VALID"

    def test_verify_individual_pan_endpoint(self):
        payload = {
            "pan": "APSPS4321P",
            "expected_legal_name": "Rajesh Kumar Sharma",
        }
        response = client.post("/api/v1/statutory/pan/verify", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["deterministic"]["entity_type"] == "INDIVIDUAL"
        assert data["deterministic"]["name_consistency_signal"] == "MATCH"
        assert data["registry"]["record"]["aadhaar_seeding_status"] == "Seeded / Linked"

    def test_verify_invalid_format_pan_endpoint(self):
        payload = {"pan": "INVALID123"}
        response = client.post("/api/v1/statutory/pan/verify", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["deterministic"]["is_format_valid"] is False
        assert data["overall_status"] == "INVALID_FORMAT"


class TestUdyamVerificationEndpoint:
    """Test POST /api/v1/statutory/udyam/verify endpoint."""

    def test_verify_valid_udyam_micro_manufacturer(self):
        payload = {
            "udyam_registration_number": "UDYAM-DL-01-0012345",
            "expected_enterprise_name": "NexaTech Innovations LLP",
        }
        response = client.post("/api/v1/statutory/udyam/verify", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["deterministic"]["is_format_valid"] is True
        assert data["deterministic"]["state_code"] == "DL"
        assert data["deterministic"]["state_name"] == "Delhi"

        reg = data["registry"]
        assert reg["registry_found"] is True
        assert reg["record"]["enterprise_tier"] == "MICRO"
        assert reg["record"]["major_activity"] == "MANUFACTURING"

        # Check policy disclaimer and non-absolute benefits
        benefits = reg["record"]["advisory_benefits"]
        assert benefits["emd_exemption_eligible"] is True
        assert "advisory and subject to specific tender terms" in benefits["tender_clause_condition_notice"]
        assert data["overall_status"] == "VALID"

    def test_verify_unregistered_udyam_endpoint(self):
        payload = {"udyam_registration_number": "UDYAM-MH-99-8888888"}
        response = client.post("/api/v1/statutory/udyam/verify", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["deterministic"]["is_format_valid"] is True
        assert data["registry"]["registry_found"] is False
        assert data["overall_status"] == "RECORD_NOT_FOUND"


class TestOEMVerificationEndpoint:
    """Test POST /api/v1/statutory/oem/verify endpoint."""

    def test_verify_active_oem_maf(self):
        today = date.today()
        payload = {
            "oem_name": "Cisco Systems India Private Limited",
            "authorized_partner_name": "NexaTech Innovations LLP",
            "maf_number": "MAF-CSCO-2026-8891",
            "tender_ref_number": "GEM/2026/B/888999",
            "valid_from": str(today - timedelta(days=30)),
            "valid_until": str(today + timedelta(days=180)),
            "bid_submission_date": str(today),
        }
        response = client.post("/api/v1/statutory/oem/verify", json=payload)
        assert response.status_code == 200
        data = response.json()

        det = data["deterministic"]
        assert det["is_date_range_valid"] is True
        assert det["is_expired"] is False
        assert det["is_valid_on_bid_date"] is True
        assert det["days_until_expiry"] >= 170

        assert data["registry"]["registry_found"] is True
        assert data["overall_status"] == "VALID"

    def test_verify_expired_oem_maf(self):
        today = date.today()
        payload = {
            "oem_name": "Cisco Systems India Private Limited",
            "authorized_partner_name": "NexaTech Innovations LLP",
            "maf_number": "MAF-CSCO-2024-EXPIRED",
            "valid_from": str(today - timedelta(days=400)),
            "valid_until": str(today - timedelta(days=30)),  # Expired 30 days ago
            "bid_submission_date": str(today),
        }
        response = client.post("/api/v1/statutory/oem/verify", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["deterministic"]["is_expired"] is True
        assert data["deterministic"]["is_valid_on_bid_date"] is False
        assert data["overall_status"] == "EXPIRED"


class TestCompliancePresetsEndpoint:
    """Test GET /api/v1/statutory/presets endpoint."""

    def test_get_compliance_presets(self):
        response = client.get("/api/v1/statutory/presets")
        assert response.status_code == 200
        presets = response.json()

        assert len(presets) >= 5
        scenario_ids = [p["id"] for p in presets]
        assert "scn_corporate_compliant" in scenario_ids
        assert "scn_msme_manufacturer" in scenario_ids
        assert "scn_taxpayer_suspended" in scenario_ids
        assert "scn_invalid_checksum" in scenario_ids
        assert "scn_expired_oem_maf" in scenario_ids
        assert "scn_unregistered_valid_format" in scenario_ids
