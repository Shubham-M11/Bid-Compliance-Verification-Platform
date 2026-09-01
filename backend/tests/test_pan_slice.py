"""
Task 5: Complete PAN Vertical Slice Test Suite
Validates the complete lifecycle:
- Auditable Delimiter/Case Normalization & Controlled OCR Repairs
- Deterministic 5-Part Character Decomposition (Series, Entity, Name Initial, Serial, Suffix)
- Strict Zero-Checksum Rule per Indian Income Tax Department Specs
- 4th-Character Statutory Entity Classification (all 10 types)
- 5th-Character Name Initial Consistency Signal (Advisory Only)
- Grounded Sandbox Operational Health (Active, Inactive, Aadhaar Seeding, Taxpayer Category)
- Zero-Fabrication Registry Guardrails
- Document Extraction with Traceable Page Provenance
- Dedicated PAN Endpoints & Backward Compatibility
"""

import io
from fastapi.testclient import TestClient
import fitz  # PyMuPDF
import pytest

from main import app
from app.schemas.statutory import (
    PANEntityType,
    PANValidationRequest,
    ValidationStatus,
)
from app.services.compliance.pan.normalizer import PANNormalizer
from app.services.compliance.pan.validator import PANStructuralValidator
from app.services.compliance.pan.health import PANHealthEvaluator
from app.services.compliance.pan.service import PANModuleService

client = TestClient(app)


def create_pdf_bytes(pages_text: list[str]) -> io.BytesIO:
    """Helper to generate in-memory multi-page PDF documents for testing."""
    doc = fitz.open()
    for text in pages_text:
        page = doc.new_page()
        page.insert_text((50, 100), text, fontsize=11)
    pdf_bytes = doc.tobytes()
    doc.close()
    return io.BytesIO(pdf_bytes)


class TestPANNormalizer:
    """Test auditable PAN normalization and delimiter cleaning."""

    def test_clean_standard_pan(self):
        normalizer = PANNormalizer()
        cleaned, details = normalizer.normalize("AAACT2727Q")
        assert cleaned == "AAACT2727Q"
        assert details.is_normalized is False
        assert len(details.normalization_notes) == 0

    def test_whitespace_and_lowercase_normalization(self):
        normalizer = PANNormalizer()
        cleaned, details = normalizer.normalize("  aaact2727q  ")
        assert cleaned == "AAACT2727Q"
        assert details.is_normalized is True
        assert any("whitespace" in n.lower() for n in details.normalization_notes)
        assert any("uppercase" in n.lower() for n in details.normalization_notes)

    def test_delimiter_stripping(self):
        normalizer = PANNormalizer()
        cleaned, details = normalizer.normalize("AAACT-2727-Q")
        assert cleaned == "AAACT2727Q"
        assert details.is_normalized is True
        assert any("delimiters" in n.lower() for n in details.normalization_notes)

    def test_controlled_ocr_digit_repair(self):
        # Letter 'O' instead of digit '0' in numeric series: 'AAACT2O27Q' -> 'AAACT2027Q'
        normalizer = PANNormalizer()
        cleaned, details = normalizer.normalize("AAACT2O27Q")
        assert cleaned == "AAACT2027Q"
        assert details.is_normalized is True
        assert any("OCR Repair" in n for n in details.normalization_notes)


class TestPANStructuralValidator:
    """Test 5-part character breakdown and deterministic entity decoding."""

    def test_valid_company_pan_breakdown(self):
        validator = PANStructuralValidator()
        result = validator.validate_structure("AAACT2727Q", expected_legal_name="Tech Mahindra Limited")

        assert result.is_format_valid is True
        assert result.entity_type_code == "C"
        assert result.entity_type == PANEntityType.COMPANY
        assert result.fifth_character == "T"
        assert result.name_consistency_signal == "MATCH"
        assert len(result.validation_errors) == 0

        # Check 5-part breakdown
        sb = result.structure_breakdown
        assert sb is not None
        assert sb.series_segment.characters == "AAA"
        assert sb.series_segment.is_valid is True

        assert sb.entity_segment.characters == "C"
        assert sb.entity_segment.is_valid is True
        assert "Company" in sb.entity_segment.description

        assert sb.name_initial_segment.characters == "T"
        assert sb.name_initial_segment.is_valid is True

        assert sb.sequential_segment.characters == "2727"
        assert sb.sequential_segment.is_valid is True

        assert sb.suffix_segment.characters == "Q"
        assert sb.suffix_segment.is_valid is True
        assert "public checksum algorithm" in sb.suffix_segment.description.lower()

    def test_all_ten_entity_types_decoding(self):
        validator = PANStructuralValidator()
        entity_cases = [
            ("AAACA1234A", "C", PANEntityType.COMPANY),
            ("AAAPA1234A", "P", PANEntityType.INDIVIDUAL),
            ("AAAHA1234A", "H", PANEntityType.HUF),
            ("AAAFA1234A", "F", PANEntityType.PARTNERSHIP_FIRM_LLP),
            ("AAAAA1234A", "A", PANEntityType.AOP),
            ("AAATA1234A", "T", PANEntityType.TRUST),
            ("AAABA1234A", "B", PANEntityType.BOI),
            ("AAALA1234A", "L", PANEntityType.LOCAL_AUTHORITY),
            ("AAAJA1234A", "J", PANEntityType.ARTIFICIAL_JURIDICAL_PERSON),
            ("AAAGA1234A", "G", PANEntityType.GOVERNMENT),
        ]
        for pan_str, exp_code, exp_type in entity_cases:
            res = validator.validate_structure(pan_str)
            assert res.is_format_valid is True
            assert res.entity_type_code == exp_code
            assert res.entity_type == exp_type

    def test_name_consistency_individual_surname(self):
        validator = PANStructuralValidator()
        # Individual PAN: 5th char 'S' for Rajesh Sharma
        res = validator.validate_structure("APSPS4321P", expected_legal_name="Rajesh Kumar Sharma")
        assert res.name_consistency_signal == "MATCH"

        # Mismatch case
        res_mismatch = validator.validate_structure("APSPS4321P", expected_legal_name="Vikram Verma")
        assert res_mismatch.name_consistency_signal == "MISMATCH"

    def test_malformed_syntax_errors(self):
        validator = PANStructuralValidator()
        res_short = validator.validate_structure("AAAC123")
        assert res_short.is_format_valid is False
        assert res_short.structure_breakdown is None
        assert len(res_short.validation_errors) >= 1

        res_invalid_chars = validator.validate_structure("12345AAAAA")
        assert res_invalid_chars.is_format_valid is False


class TestPANModuleServiceAndRegistry:
    """Test PANModuleService lifecycle with mock registry fixtures."""

    @pytest.mark.asyncio
    async def test_active_corporate_pan_lookup(self):
        service = PANModuleService()
        req = PANValidationRequest(
            pan="AAACT2727Q",
            expected_legal_name="Tech Mahindra Limited",
        )
        resp = await service.validate_pan(req)

        assert resp.pan == "AAACT2727Q"
        assert resp.overall_status == ValidationStatus.VALID
        assert resp.is_live_government_source is False
        assert resp.registry.registry_found is True
        assert resp.registry.record.full_name == "TECH MAHINDRA LIMITED"
        assert resp.registry.record.pan_status == "Active"

    @pytest.mark.asyncio
    async def test_individual_pan_with_aadhaar_status(self):
        service = PANModuleService()
        req = PANValidationRequest(
            pan="APSPS4321P",
            expected_legal_name="Rajesh Kumar Sharma",
        )
        resp = await service.validate_pan(req)

        assert resp.overall_status == ValidationStatus.VALID
        assert resp.registry.registry_found is True
        assert resp.registry.record.full_name == "RAJESH KUMAR SHARMA"
        assert resp.registry.record.aadhaar_seeding_status == "Seeded / Linked"

    @pytest.mark.asyncio
    async def test_huf_pan_lookup(self):
        service = PANModuleService()
        req = PANValidationRequest(
            pan="ABCHC1234H",
            expected_legal_name="Chopra Hindu Undivided Family",
        )
        resp = await service.validate_pan(req)

        assert resp.overall_status == ValidationStatus.VALID
        assert resp.deterministic.entity_type == PANEntityType.HUF
        assert resp.registry.registry_found is True
        assert "CHOPRA" in resp.registry.record.full_name

    @pytest.mark.asyncio
    async def test_unregistered_valid_pan_zero_fabrication(self):
        """MANDATORY GUARDRAIL: Valid PAN not in mock DB returns registry_found=False cleanly with no fabricated data."""
        service = PANModuleService()
        req = PANValidationRequest(
            pan="AAAPL1234K",
        )
        resp = await service.validate_pan(req)

        assert resp.deterministic.is_format_valid is True
        assert resp.registry.registry_found is False
        assert resp.registry.record is None
        assert resp.overall_status == ValidationStatus.RECORD_NOT_FOUND


class TestPANEndpoints:
    """Test dedicated /api/v1/pan/* endpoints and backward compatibility."""

    def test_dedicated_pan_verify_endpoint(self):
        payload = {
            "pan": "AAACT2727Q",
            "expected_legal_name": "Tech Mahindra Limited",
        }
        res = client.post("/api/v1/pan/verify", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["pan"] == "AAACT2727Q"
        assert data["deterministic"]["is_format_valid"] is True
        assert data["deterministic"]["structure_breakdown"] is not None
        assert data["registry"]["registry_found"] is True

    def test_dedicated_pan_analyze_structure_endpoint(self):
        payload = {
            "pan": "AABFN-1234-F",
            "expected_legal_name": "NexaTech Innovations LLP",
        }
        res = client.post("/api/v1/pan/analyze-structure", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["is_format_valid"] is True
        assert data["entity_type_code"] == "F"
        assert data["entity_type"] == "PARTNERSHIP_FIRM_LLP"
        assert data["normalization"]["is_normalized"] is True

    def test_dedicated_pan_entity_types_endpoint(self):
        res = client.get("/api/v1/pan/entity-types")
        assert res.status_code == 200
        types = res.json()
        assert len(types) == 10
        type_dict = {item["code"]: item["description"] for item in types}
        assert "Company" in type_dict["C"]
        assert "Individual" in type_dict["P"]
        assert "Hindu Undivided Family" in type_dict["H"]

    def test_backward_compatible_statutory_pan_endpoint(self):
        """Preserves existing /api/v1/statutory/pan/verify contract unchanged."""
        payload = {"pan": "AAACT2727Q"}
        res = client.post("/api/v1/statutory/pan/verify", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["pan"] == "AAACT2727Q"
        assert data["deterministic"]["is_format_valid"] is True


class TestPANDocumentExtractionIntegration:
    """Test extraction of PAN with page-level provenance from multi-page PDFs."""

    def test_multipage_pan_provenance(self):
        p1 = "PAGE 1: General Bidder Details\nBidder Name: Tech Mahindra Limited"
        p2 = "PAGE 2: Statutory Identity\nIncome Tax PAN: AAACT2727Q (Corporate Taxpayer)"
        p3 = "PAGE 3: Scope of Work"

        pdf_stream = create_pdf_bytes([p1, p2, p3])

        response = client.post(
            "/api/v1/compliance/verify-document",
            files={"file": ("multipage_pan_bid.pdf", pdf_stream, "application/pdf")},
        )

        assert response.status_code == 200
        data = response.json()

        pan_cands = data["extracted_entities"]["pan_candidates"]
        assert len(pan_cands) >= 1
        assert pan_cands[0]["value"] == "AAACT2727Q"
        assert pan_cands[0]["page_number"] == 2
        assert "Income Tax" in pan_cands[0]["context_snippet"] or "PAN" in pan_cands[0]["context_snippet"]

        # Statutory verification
        assert data["statutory_verifications"]["pan"]["deterministic"]["is_format_valid"] is True
        assert data["statutory_verifications"]["pan"]["registry"]["registry_found"] is True
