"""
Task 4: Complete GST Vertical Slice Test Suite
Validates the complete lifecycle:
- Auditable OCR Normalization & Delimiter Cleaning
- Deterministic 5-Part Structural Breakdown
- Luhn Mod-36 Checksum Verification
- State Code & Embedded PAN Extraction
- Taxpayer Standing (Active, Suspended, Cancelled, Composition Scheme)
- Zero-Fabrication Registry Guardrails
- Document Extraction with Traceable Page Provenance
- Dedicated GST Endpoints & Backward Compatibility
"""

import io
from fastapi.testclient import TestClient
import fitz  # PyMuPDF
import pytest

from main import app
from app.schemas.statutory import (
    GSTINValidationRequest,
    TaxpayerStatus,
    ValidationStatus,
)
from app.services.compliance.gst.normalizer import GSTINNormalizer
from app.services.compliance.gst.validator import GSTINStructuralValidator
from app.services.compliance.gst.health import TaxpayerHealthEvaluator
from app.services.compliance.gst.service import GSTModuleService

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


class TestGSTNormalizer:
    """Test auditable GSTIN normalization and controlled OCR repairs."""

    def test_clean_standard_input(self):
        normalizer = GSTINNormalizer()
        cleaned, details = normalizer.normalize("27AAACT2727Q1ZW")
        assert cleaned == "27AAACT2727Q1ZW"
        assert details.is_normalized is False
        assert len(details.normalization_notes) == 0

    def test_whitespace_and_lowercase_normalization(self):
        normalizer = GSTINNormalizer()
        cleaned, details = normalizer.normalize("  27aaact2727q1zw  ")
        assert cleaned == "27AAACT2727Q1ZW"
        assert details.is_normalized is True
        assert any("whitespace" in n.lower() for n in details.normalization_notes)
        assert any("uppercase" in n.lower() for n in details.normalization_notes)

    def test_delimiter_stripping(self):
        normalizer = GSTINNormalizer()
        cleaned, details = normalizer.normalize("27-AAACT2727Q-1ZW")
        assert cleaned == "27AAACT2727Q1ZW"
        assert details.is_normalized is True
        assert any("delimiters" in n.lower() for n in details.normalization_notes)

    def test_controlled_ocr_state_code_repair(self):
        # 'O7' (letter O) instead of '07' (digit 0) in Delhi state code
        normalizer = GSTINNormalizer()
        cleaned, details = normalizer.normalize("O7AABFN1234F1ZS")
        assert cleaned == "07AABFN1234F1ZS"
        assert details.is_normalized is True
        assert any("OCR Repair" in n for n in details.normalization_notes)

    def test_controlled_ocr_constant_z_repair(self):
        # '2' instead of 'Z' in 14th slot
        normalizer = GSTINNormalizer()
        cleaned, details = normalizer.normalize("27AAACT2727Q12W")
        assert cleaned == "27AAACT2727Q1ZW"
        assert details.is_normalized is True
        assert any("constant character" in n.lower() for n in details.normalization_notes)


class TestGSTStructuralValidator:
    """Test 5-part character breakdown and deterministic validation."""

    def test_valid_corporate_breakdown(self):
        validator = GSTINStructuralValidator()
        result = validator.validate_structure("27AAACT2727Q1ZW")

        assert result.is_format_valid is True
        assert result.state_code == "27"
        assert result.state_name == "Maharashtra"
        assert result.is_state_code_valid is True
        assert result.extracted_pan == "AAACT2727Q"
        assert result.entity_type.value == "COMPANY"
        assert result.entity_number == "1"
        assert result.z_character == "Z"
        assert result.checksum_char == "W"
        assert result.is_checksum_valid is True
        assert len(result.validation_errors) == 0

        # Check 5-part breakdown
        sb = result.structure_breakdown
        assert sb is not None
        assert sb.state_segment.characters == "27"
        assert sb.state_segment.is_valid is True
        assert "Maharashtra" in sb.state_segment.description

        assert sb.pan_segment.characters == "AAACT2727Q"
        assert sb.pan_segment.is_valid is True
        assert "COMPANY" in sb.pan_segment.description

        assert sb.entity_segment.characters == "1"
        assert sb.entity_segment.is_valid is True

        assert sb.constant_segment.characters == "Z"
        assert sb.constant_segment.is_valid is True

        assert sb.checksum_segment.characters == "W"
        assert sb.checksum_segment.is_valid is True

    def test_invalid_checksum_breakdown(self):
        validator = GSTINStructuralValidator()
        result = validator.validate_structure("27AAACT2727Q1ZZ")  # Expected 'W', got 'Z'

        assert result.is_format_valid is True
        assert result.is_checksum_valid is False
        assert result.calculated_checksum == "W"
        assert result.checksum_char == "Z"
        assert len(result.validation_errors) >= 1
        assert any("checksum verification failed" in err.lower() for err in result.validation_errors)

        sb = result.structure_breakdown
        assert sb is not None
        assert sb.checksum_segment.is_valid is False

    def test_invalid_state_code(self):
        validator = GSTINStructuralValidator()
        result = validator.validate_structure("98AAACT2727Q1ZW")

        assert result.is_format_valid is True
        assert result.is_state_code_valid is False
        assert any("State code '98' is not a recognized" in err for err in result.validation_errors)

    def test_malformed_syntax(self):
        validator = GSTINStructuralValidator()
        result = validator.validate_structure("INVALID_GSTIN")

        assert result.is_format_valid is False
        assert result.structure_breakdown is None
        assert len(result.validation_errors) >= 1


class TestGSTModuleServiceAndRegistry:
    """Test GSTModuleService lifecycle with mock registry fixtures."""

    @pytest.mark.asyncio
    async def test_active_corporate_gstin(self):
        service = GSTModuleService()
        req = GSTINValidationRequest(
            gstin="27AAACT2727Q1ZW",
            expected_legal_name="Tech Mahindra Limited",
            expected_state_code="27",
        )
        resp = await service.validate_gstin(req)

        assert resp.gstin == "27AAACT2727Q1ZW"
        assert resp.overall_status == ValidationStatus.VALID
        assert resp.is_live_government_source is False
        assert resp.deterministic.is_checksum_valid is True
        assert resp.registry.registry_found is True
        assert resp.registry.record.status == TaxpayerStatus.ACTIVE
        assert resp.registry.record.is_filing_up_to_date is True
        assert resp.name_match_status == "MATCH"

    @pytest.mark.asyncio
    async def test_suspended_taxpayer_gstin(self):
        service = GSTModuleService()
        req = GSTINValidationRequest(
            gstin="09AABCA5678A1ZT",
            expected_legal_name="Apex Infotech Private Limited",
        )
        resp = await service.validate_gstin(req)

        assert resp.overall_status == ValidationStatus.VALID
        assert resp.registry.registry_found is True
        assert resp.registry.record.status == TaxpayerStatus.SUSPENDED
        assert resp.registry.record.is_filing_up_to_date is False

    @pytest.mark.asyncio
    async def test_cancelled_taxpayer_gstin(self):
        service = GSTModuleService()
        req = GSTINValidationRequest(
            gstin="27AAACD9999D1Z7",
        )
        resp = await service.validate_gstin(req)

        assert resp.registry.registry_found is True
        assert resp.registry.record.status == TaxpayerStatus.CANCELLED
        assert resp.registry.record.is_filing_up_to_date is False

    @pytest.mark.asyncio
    async def test_composition_dealer_gstin(self):
        service = GSTModuleService()
        req = GSTINValidationRequest(
            gstin="24AAACG1234G1Z8",
        )
        resp = await service.validate_gstin(req)

        assert resp.registry.registry_found is True
        assert resp.registry.record.is_composition_dealer is True
        assert resp.registry.record.taxpayer_type == "Composition"
        assert "Composition Scheme" in (resp.registry.record.composition_advisory_note or "")

    @pytest.mark.asyncio
    async def test_unregistered_valid_gstin_zero_fabrication(self):
        """MANDATORY GUARDRAIL: Valid GSTIN not in mock DB returns registry_found=False cleanly with no fabricated data."""
        service = GSTModuleService()
        req = GSTINValidationRequest(
            gstin="33AAACA6529K1ZQ",  # Ashok Leyland (Tamil Nadu)
        )
        resp = await service.validate_gstin(req)

        assert resp.deterministic.is_format_valid is True
        assert resp.deterministic.is_checksum_valid is True
        assert resp.registry.registry_found is False
        assert resp.registry.record is None
        assert resp.overall_status == ValidationStatus.RECORD_NOT_FOUND


class TestGSTEndpoints:
    """Test dedicated /api/v1/gst/* endpoints and backward compatibility."""

    def test_dedicated_gst_verify_endpoint(self):
        payload = {
            "gstin": "27AAACT2727Q1ZW",
            "expected_legal_name": "Tech Mahindra Limited",
            "expected_state_code": "27",
        }
        res = client.post("/api/v1/gst/verify", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["gstin"] == "27AAACT2727Q1ZW"
        assert data["deterministic"]["is_format_valid"] is True
        assert data["deterministic"]["structure_breakdown"] is not None
        assert data["registry"]["registry_found"] is True

    def test_dedicated_gst_analyze_structure_endpoint(self):
        payload = {
            "gstin": "07-AABFN1234F-1ZS",  # With hyphens to test normalization in structure analysis
            "expected_state_code": "07",
        }
        res = client.post("/api/v1/gst/analyze-structure", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["is_format_valid"] is True
        assert data["state_code"] == "07"
        assert data["state_name"] == "Delhi"
        assert data["extracted_pan"] == "AABFN1234F"
        assert data["is_checksum_valid"] is True
        assert data["normalization"]["is_normalized"] is True

    def test_dedicated_gst_state_codes_endpoint(self):
        res = client.get("/api/v1/gst/state-codes")
        assert res.status_code == 200
        codes = res.json()
        assert len(codes) >= 37
        code_dict = {item["state_code"]: item["state_name"] for item in codes}
        assert code_dict["27"] == "Maharashtra"
        assert code_dict["07"] == "Delhi"
        assert code_dict["29"] == "Karnataka"
        assert code_dict["99"] == "Centre Jurisdiction / Non-Resident Taxable"

    def test_backward_compatible_statutory_gstin_endpoint(self):
        """Preserves existing /api/v1/statutory/gstin/verify contract unchanged."""
        payload = {"gstin": "27AAACT2727Q1ZW"}
        res = client.post("/api/v1/statutory/gstin/verify", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["gstin"] == "27AAACT2727Q1ZW"
        assert data["deterministic"]["is_checksum_valid"] is True


class TestGSTDocumentExtractionIntegration:
    """Test extraction of GSTIN with page-level provenance from multi-page PDFs."""

    def test_multipage_gstin_provenance(self):
        p1 = "PAGE 1: Cover Page\nBid for IT Hardware"
        p2 = "PAGE 2: Statutory Compliance\nBidder GSTIN: 27AAACT2727Q1ZW (Registered in Maharashtra)"
        p3 = "PAGE 3: Financial Terms"

        pdf_stream = create_pdf_bytes([p1, p2, p3])

        response = client.post(
            "/api/v1/compliance/verify-document",
            files={"file": ("multipage_gst_bid.pdf", pdf_stream, "application/pdf")},
        )

        assert response.status_code == 200
        data = response.json()

        gst_cands = data["extracted_entities"]["gstin_candidates"]
        assert len(gst_cands) >= 1
        assert gst_cands[0]["value"] == "27AAACT2727Q1ZW"
        assert gst_cands[0]["page_number"] == 2
        assert "Maharashtra" in gst_cands[0]["context_snippet"]

        # Statutory verification
        assert data["statutory_verifications"]["gstin"]["deterministic"]["is_checksum_valid"] is True
        assert data["statutory_verifications"]["gstin"]["registry"]["registry_found"] is True


class TestRealSampleBidPDFs:
    """Test verification against actual sample bid PDF fixtures in backend/sample_bids/."""

    def test_sample_bid_a_compliant_corporate(self):
        from pathlib import Path
        pdf_path = Path(__file__).parent.parent / "sample_bids" / "test_a_compliant_corporate.pdf"
        if not pdf_path.exists():
            pytest.skip("Sample bid A fixture not found")

        with open(pdf_path, "rb") as f:
            res = client.post(
                "/api/v1/compliance/verify-document",
                files={"file": ("test_a_compliant_corporate.pdf", f, "application/pdf")},
                data={"expected_bidder_name": "Tech Mahindra Limited"},
            )
        assert res.status_code == 200
        data = res.json()
        assert data["overall_score"] == 100
        assert data["statutory_verifications"]["gstin"] is not None
        assert data["statutory_verifications"]["gstin"]["deterministic"]["extracted_pan"] == "AAACT2727Q"

    def test_sample_bid_c_corrupted_checksum(self):
        from pathlib import Path
        pdf_path = Path(__file__).parent.parent / "sample_bids" / "test_c_corrupted_checksum.pdf"
        if not pdf_path.exists():
            pytest.skip("Sample bid C fixture not found")

        with open(pdf_path, "rb") as f:
            res = client.post(
                "/api/v1/compliance/verify-document",
                files={"file": ("test_c_corrupted_checksum.pdf", f, "application/pdf")},
            )
        assert res.status_code == 200
        data = res.json()
        assert data["overall_score"] < 100
        gstin_res = data["statutory_verifications"]["gstin"]
        assert gstin_res is not None
        assert gstin_res["deterministic"]["is_checksum_valid"] is False

