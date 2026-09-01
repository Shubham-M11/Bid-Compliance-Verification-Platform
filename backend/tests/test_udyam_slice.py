"""
Task 5: Complete Udyam (MSME) Vertical Slice Test Suite
Validates the complete lifecycle:
- Auditable Delimiter & Spacing Normalization
- Deterministic 4-Part Segment Decomposition (Prefix, State, District, Serial)
- Conservative District/Geographic Parsing
- Enterprise Tier Classification (Micro, Small, Medium)
- Major Activity Classification (Manufacturing, Services, Trading)
- Grounded Policy-Dependent Procurement Advisories (No Automatic EMD Exemption Claims)
- Zero-Fabrication Registry Guardrails
- Document Extraction with Traceable Page Provenance
- Dedicated Udyam Endpoints & Backward Compatibility
"""

import io
from fastapi.testclient import TestClient
import fitz  # PyMuPDF
import pytest

from main import app
from app.schemas.statutory import (
    EnterpriseMajorActivity,
    EnterpriseType,
    UdyamValidationRequest,
    ValidationStatus,
)
from app.services.compliance.udyam.normalizer import UdyamNormalizer
from app.services.compliance.udyam.validator import UdyamStructuralValidator
from app.services.compliance.udyam.health import UdyamHealthEvaluator
from app.services.compliance.udyam.service import UdyamModuleService

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


class TestUdyamNormalizer:
    """Test auditable Udyam normalization and delimiter cleaning."""

    def test_clean_standard_udyam(self):
        normalizer = UdyamNormalizer()
        cleaned, details = normalizer.normalize("UDYAM-DL-01-0012345")
        assert cleaned == "UDYAM-DL-01-0012345"
        assert details.is_normalized is False
        assert len(details.normalization_notes) == 0

    def test_whitespace_and_lowercase_normalization(self):
        normalizer = UdyamNormalizer()
        cleaned, details = normalizer.normalize("  udyam-dl-01-0012345  ")
        assert cleaned == "UDYAM-DL-01-0012345"
        assert details.is_normalized is True
        assert any("whitespace" in n.lower() for n in details.normalization_notes)
        assert any("uppercase" in n.lower() for n in details.normalization_notes)

    def test_space_and_slash_delimiter_standardization(self):
        normalizer = UdyamNormalizer()
        cleaned_spaces, det_spaces = normalizer.normalize("UDYAM DL 01 0012345")
        assert cleaned_spaces == "UDYAM-DL-01-0012345"
        assert det_spaces.is_normalized is True

        cleaned_slashes, det_slashes = normalizer.normalize("UDYAM/KR/03/0098765")
        assert cleaned_slashes == "UDYAM-KR-03-0098765"
        assert det_slashes.is_normalized is True


class TestUdyamStructuralValidator:
    """Test 4-part segment breakdown and geographic parsing."""

    def test_valid_delhi_udyam_breakdown(self):
        validator = UdyamStructuralValidator()
        result = validator.validate_structure("UDYAM-DL-01-0012345")

        assert result.is_format_valid is True
        assert result.state_code == "DL"
        assert result.state_name == "Delhi"
        assert result.district_code == "01"
        assert result.sequential_id == "0012345"
        assert len(result.validation_errors) == 0

        # Check 4-part breakdown
        sb = result.structure_breakdown
        assert sb is not None
        assert sb.prefix_segment.characters == "UDYAM"
        assert sb.prefix_segment.is_valid is True

        assert sb.state_segment.characters == "DL"
        assert sb.state_segment.is_valid is True
        assert "Delhi" in sb.state_segment.description

        assert sb.district_segment.characters == "01"
        assert sb.district_segment.is_valid is True
        assert "Parsed registration component" in sb.district_segment.description

        assert sb.serial_segment.characters == "0012345"
        assert sb.serial_segment.is_valid is True

    def test_karnataka_udyam_breakdown(self):
        validator = UdyamStructuralValidator()
        result = validator.validate_structure("UDYAM-KR-03-0098765")

        assert result.is_format_valid is True
        assert result.state_code == "KR"
        assert result.state_name == "Karnataka"
        assert result.district_code == "03"
        assert result.sequential_id == "0098765"

    def test_malformed_udyam_errors(self):
        validator = UdyamStructuralValidator()
        res_short = validator.validate_structure("UDYAM-DL-1")
        assert res_short.is_format_valid is False
        assert res_short.structure_breakdown is None
        assert len(res_short.validation_errors) >= 1

        res_invalid_prefix = validator.validate_structure("MSME-DL-01-0012345")
        assert res_invalid_prefix.is_format_valid is False


class TestUdyamModuleServiceAndRegistry:
    """Test UdyamModuleService lifecycle and grounded procurement advisories."""

    @pytest.mark.asyncio
    async def test_micro_manufacturer_lookup(self):
        service = UdyamModuleService()
        req = UdyamValidationRequest(
            udyam_registration_number="UDYAM-DL-01-0012345",
            expected_enterprise_name="NexaTech Innovations LLP",
        )
        resp = await service.validate_udyam(req)

        assert resp.udyam_registration_number == "UDYAM-DL-01-0012345"
        assert resp.overall_status == ValidationStatus.VALID
        assert resp.is_live_government_source is False
        assert resp.registry.registry_found is True
        record = resp.registry.record
        assert record.enterprise_name == "NEXATECH INNOVATIONS LLP"
        assert record.enterprise_tier == EnterpriseType.MICRO
        assert record.major_activity == EnterpriseMajorActivity.MANUFACTURING
        assert record.advisory_benefits.emd_exemption_eligible is True
        # Verify non-absolute disclaimer
        assert "tender" in record.advisory_benefits.tender_clause_condition_notice.lower()

    @pytest.mark.asyncio
    async def test_small_service_enterprise_lookup(self):
        service = UdyamModuleService()
        req = UdyamValidationRequest(
            udyam_registration_number="UDYAM-KR-03-0098765",
        )
        resp = await service.validate_udyam(req)

        assert resp.overall_status == ValidationStatus.VALID
        assert resp.registry.registry_found is True
        record = resp.registry.record
        assert record.enterprise_tier == EnterpriseType.SMALL
        assert record.major_activity == EnterpriseMajorActivity.SERVICES

    @pytest.mark.asyncio
    async def test_medium_trading_enterprise_ineligibility_advisory(self):
        service = UdyamModuleService()
        req = UdyamValidationRequest(
            udyam_registration_number="UDYAM-MH-12-0054321",
        )
        resp = await service.validate_udyam(req)

        assert resp.overall_status == ValidationStatus.VALID
        assert resp.registry.registry_found is True
        record = resp.registry.record
        assert record.enterprise_tier == EnterpriseType.MEDIUM
        assert record.major_activity == EnterpriseMajorActivity.TRADING
        # Pure trading is ineligible for EMD waiver
        assert record.advisory_benefits.emd_exemption_eligible is False
        assert "trading" in record.advisory_benefits.emd_exemption_advisory.lower()

    @pytest.mark.asyncio
    async def test_unregistered_valid_udyam_zero_fabrication(self):
        """MANDATORY GUARDRAIL: Valid Udyam number not in mock DB returns registry_found=False cleanly with no fabricated data."""
        service = UdyamModuleService()
        req = UdyamValidationRequest(
            udyam_registration_number="UDYAM-UP-02-9999999",
        )
        resp = await service.validate_udyam(req)

        assert resp.deterministic.is_format_valid is True
        assert resp.registry.registry_found is False
        assert resp.registry.record is None
        assert resp.overall_status == ValidationStatus.RECORD_NOT_FOUND


class TestUdyamEndpoints:
    """Test dedicated /api/v1/udyam/* endpoints and backward compatibility."""

    def test_dedicated_udyam_verify_endpoint(self):
        payload = {
            "udyam_registration_number": "UDYAM-DL-01-0012345",
            "expected_enterprise_name": "NexaTech Innovations LLP",
        }
        res = client.post("/api/v1/udyam/verify", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["udyam_registration_number"] == "UDYAM-DL-01-0012345"
        assert data["deterministic"]["is_format_valid"] is True
        assert data["deterministic"]["structure_breakdown"] is not None
        assert data["registry"]["registry_found"] is True

    def test_dedicated_udyam_analyze_structure_endpoint(self):
        payload = {
            "udyam_registration_number": "UDYAM KR 03 0098765",  # Space-delimited to test normalization
        }
        res = client.post("/api/v1/udyam/analyze-structure", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["is_format_valid"] is True
        assert data["state_code"] == "KR"
        assert data["state_name"] == "Karnataka"
        assert data["district_code"] == "03"
        assert data["sequential_id"] == "0098765"
        assert data["normalization"]["is_normalized"] is True

    def test_dedicated_udyam_state_codes_endpoint(self):
        res = client.get("/api/v1/udyam/state-codes")
        assert res.status_code == 200
        codes = res.json()
        assert len(codes) >= 30
        code_dict = {item["state_code"]: item["state_name"] for item in codes}
        assert code_dict["DL"] == "Delhi"
        assert code_dict["MH"] == "Maharashtra"
        assert code_dict["KR"] == "Karnataka"

    def test_backward_compatible_statutory_udyam_endpoint(self):
        """Preserves existing /api/v1/statutory/udyam/verify contract unchanged."""
        payload = {"udyam_registration_number": "UDYAM-DL-01-0012345"}
        res = client.post("/api/v1/statutory/udyam/verify", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["udyam_registration_number"] == "UDYAM-DL-01-0012345"
        assert data["deterministic"]["is_format_valid"] is True


class TestUdyamDocumentExtractionIntegration:
    """Test extraction of Udyam with page-level provenance from multi-page PDFs."""

    def test_multipage_udyam_provenance(self):
        p1 = "PAGE 1: Technical Proposal"
        p2 = "PAGE 2: MSME Status\nUdyam Registration No: UDYAM-DL-01-0012345 (Micro Enterprise)"
        p3 = "PAGE 3: Bill of Quantities"

        pdf_stream = create_pdf_bytes([p1, p2, p3])

        response = client.post(
            "/api/v1/compliance/verify-document",
            files={"file": ("multipage_udyam_bid.pdf", pdf_stream, "application/pdf")},
        )

        assert response.status_code == 200
        data = response.json()

        udyam_cands = data["extracted_entities"]["udyam_candidates"]
        assert len(udyam_cands) >= 1
        assert udyam_cands[0]["value"] == "UDYAM-DL-01-0012345"
        assert udyam_cands[0]["page_number"] == 2
        assert "Micro Enterprise" in udyam_cands[0]["context_snippet"] or "Udyam" in udyam_cands[0]["context_snippet"]

        # Statutory verification
        assert data["statutory_verifications"]["udyam"]["deterministic"]["is_format_valid"] is True
        assert data["statutory_verifications"]["udyam"]["registry"]["registry_found"] is True
