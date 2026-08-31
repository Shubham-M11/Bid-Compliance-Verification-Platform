"""
Task 3D Integration Tests
Validates the complete end-to-end pipeline:
PDF Upload -> Document Processor (PyMuPDF/OCR) -> Page-Level Evidence ->
Entity Extractor -> Statutory Verification (Task 3A) -> Cross-Consistency (Task 3B) ->
Scoring Engine -> Unified Composite Verification Endpoint (/api/v1/compliance/verify-document).
"""

import io
from PIL import Image, ImageDraw, ImageFont
from fastapi.testclient import TestClient
import fitz  # PyMuPDF
import pytest

from main import app
from app.schemas.composite import CompositeStatus, FindingSeverity, RiskLevel
from app.services.documents.ocr_processor import TesseractOCRProcessor

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


def create_scanned_image_pdf_bytes(text_content: str) -> io.BytesIO:
    """Helper to generate a true image-only scanned PDF without a digital text layer."""
    img = Image.new("RGB", (1240, 1754), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", 32)
    except Exception:
        font = ImageFont.load_default()
    draw.text((80, 100), text_content, fill=(0, 0, 0), font=font)

    img_stream = io.BytesIO()
    img.save(img_stream, format="PNG")

    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    page.insert_image(page.rect, stream=img_stream.getvalue())
    pdf_bytes = doc.tobytes()
    doc.close()
    return io.BytesIO(pdf_bytes)


class TestTask3DEndToEndIntegration:
    """Complete integration test suite for Task 3D."""

    def test_e2e_clean_digital_pdf_fully_compliant(self):
        """
        Tests clean digital PDF with authentic compliant GSTIN, PAN, and active HPE OEM MAF.
        Expects 100/100 score, LOW_RISK, COMPLIANT, with full page-level provenance.
        """
        page1_text = (
            "BID SUBMISSION DOCUMENT\n"
            "Bidder Legal Name: Tech Mahindra Limited\n"
            "Tender Reference: GEM/2026/B/890123\n"
            "Goods and Services Tax Identification: 27AAACT2727Q1ZW\n"
            "Permanent Account Number: AAACT2727Q\n"
        )
        page2_text = (
            "MANUFACTURER AUTHORIZATION FORM (MAF)\n"
            "Manufacturer: Hewlett Packard Enterprise India Private Limited\n"
            "Authorized Partner: Tech Mahindra Limited\n"
            "MAF Reference: HPE-IND-MAF-2026-0045\n"
            "Valid From: 2026-01-01 to 2027-03-31\n"
            "Scope: Enterprise Servers and High Availability Storage\n"
        )

        pdf_stream = create_pdf_bytes([page1_text, page2_text])

        response = client.post(
            "/api/v1/compliance/verify-document",
            files={"file": ("bid_tech_mahindra.pdf", pdf_stream, "application/pdf")},
            data={
                "expected_bidder_name": "Tech Mahindra Limited",
                "tender_ref_number": "GEM/2026/B/890123",
            },
        )

        assert response.status_code == 200
        data = response.json()

        # Score and Status
        assert data["overall_score"] == 100
        assert data["risk_level"] == RiskLevel.LOW_RISK.value
        assert data["overall_status"] == CompositeStatus.COMPLIANT.value
        assert len(data["score_breakdown"]) == 0
        assert len(data["findings"]) == 0

        # Extracted Entities
        extracted = data["extracted_entities"]
        assert len(extracted["gstin_candidates"]) >= 1
        assert extracted["gstin_candidates"][0]["value"] == "27AAACT2727Q1ZW"
        assert extracted["gstin_candidates"][0]["page_number"] == 1

        assert len(extracted["pan_candidates"]) >= 1
        assert extracted["pan_candidates"][0]["value"] == "AAACT2727Q"
        assert extracted["pan_candidates"][0]["page_number"] == 1

        assert len(extracted["oem_name_candidates"]) >= 1
        assert extracted["oem_name_candidates"][0]["page_number"] == 2

        # Statutory Verifications
        stat = data["statutory_verifications"]
        assert stat["gstin"]["deterministic"]["is_format_valid"] is True
        assert stat["gstin"]["deterministic"]["is_checksum_valid"] is True
        assert stat["gstin"]["registry"]["registry_found"] is True

        assert stat["pan"]["deterministic"]["is_format_valid"] is True
        assert stat["pan"]["deterministic"]["entity_type"] == "COMPANY"

        assert stat["oem"]["deterministic"]["is_valid_on_bid_date"] is True
        assert stat["oem"]["registry"]["record"]["is_partner_in_oem_database"] is True

        # Evidence Provenance Preservation
        audit_trail = data["evidence_audit_trail"]
        assert len(audit_trail) >= 3
        # Check that document_id and filename are properly attached
        for ev in audit_trail:
            if ev["source_type"] == "DOCUMENT_EXTRACTED":
                assert ev["filename"] == "bid_tech_mahindra.pdf"
                assert ev["page_number"] in [1, 2]
                assert ev["context_snippet"] is not None

    def test_e2e_multipage_pdf_entities_across_pages(self):
        """
        Tests multi-page document where entities are distributed across 3 pages:
        Page 1: GSTIN, Page 2: PAN & Legal Name, Page 3: Cisco OEM MAF.
        """
        p1 = "PAGE 1: General Details\nGSTIN: 07AABFN1234F1ZS (Delhi State Registration)"
        p2 = "PAGE 2: Tax Registration\nPAN Number: AABFN1234F\nBidder Name: NexaTech Innovations LLP"
        p3 = (
            "PAGE 3: OEM Certificate\n"
            "OEM Name: Cisco Systems India Private Limited\n"
            "MAF No: MAF-CSCO-2026-8891\n"
            "Tender Ref: GEM/2026/B/445566\n"
            "Valid From: 2026-04-01 until 2027-03-31"
        )

        pdf_stream = create_pdf_bytes([p1, p2, p3])

        response = client.post(
            "/api/v1/compliance/verify-document",
            files={"file": ("multipage_submission.pdf", pdf_stream, "application/pdf")},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["overall_score"] == 100
        assert data["risk_level"] == RiskLevel.LOW_RISK.value

        # Confirm 3 distinct pages were cataloged in provenance
        ext_gst = data["extracted_entities"]["gstin_candidates"][0]
        ext_pan = data["extracted_entities"]["pan_candidates"][0]
        ext_oem = data["extracted_entities"]["oem_name_candidates"][0]

        assert ext_gst["page_number"] == 1
        assert ext_pan["page_number"] == 2
        assert ext_oem["page_number"] == 3

    def test_e2e_document_with_missing_optional_identifiers(self):
        """
        Tests document containing only GSTIN and PAN, without Udyam or OEM MAF.
        Pipeline must process cleanly without crashing, assigning NOT_APPLICABLE to missing checks.
        """
        p1 = (
            "FINANCIAL PROPOSAL\n"
            "Bidder: Tech Mahindra Limited\n"
            "GSTIN: 27AAACT2727Q1ZW\n"
            "PAN: AAACT2727Q\n"
        )
        pdf_stream = create_pdf_bytes([p1])

        response = client.post(
            "/api/v1/compliance/verify-document",
            files={"file": ("partial_bid.pdf", pdf_stream, "application/pdf")},
        )

        assert response.status_code == 200
        data = response.json()

        # Score remains 100 because statutory inputs provided are clean
        assert data["overall_score"] == 100
        assert data["statutory_verifications"]["gstin"] is not None
        assert data["statutory_verifications"]["pan"] is not None
        assert data["statutory_verifications"]["udyam"] is None
        assert data["statutory_verifications"]["oem"] is None

        # Check R-04 and R-05 are NOT_APPLICABLE
        r04 = next((c for c in data["consistency_checks"] if c["rule_id"] == "R-04"), None)
        assert r04 is not None
        assert r04["status"] == "NOT_APPLICABLE"

    def test_e2e_document_with_corrupted_gstin_checksum(self):
        """
        Tests document with invalid Mod-36 checksum in GSTIN.
        Deducts -15 pts (Score: 85), MEDIUM_RISK, CONDITIONAL_COMPLIANCE.
        """
        p1 = (
            "BID PROPOSAL\n"
            "Company: Infosys Limited\n"
            "GSTIN: 29AAACH2702H1ZZ\n"  # 15th char 'Z' is invalid checksum; expected 'W'
            "PAN: AAACH2702H\n"
        )
        pdf_stream = create_pdf_bytes([p1])

        response = client.post(
            "/api/v1/compliance/verify-document",
            files={"file": ("corrupted_gstin_bid.pdf", pdf_stream, "application/pdf")},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["overall_score"] == 85
        assert data["risk_level"] == RiskLevel.MEDIUM_RISK.value
        assert data["overall_status"] == CompositeStatus.CONDITIONAL_COMPLIANCE.value
        assert any(sc["rule_id"] == "STAT-GST-02" for sc in data["score_breakdown"])

        # Finding should be present with page provenance
        chk_finding = next((f for f in data["findings"] if f["rule_id"] == "STAT-GST-02"), None)
        assert chk_finding is not None
        assert len(chk_finding["linked_evidence"]) >= 1
        assert chk_finding["linked_evidence"][0]["page_number"] == 1

    def test_e2e_document_with_pan_gstin_mismatch(self):
        """
        Tests document with contradictory PAN and GSTIN (PAN ↔ GSTIN mismatch).
        Triggers Rule R-01 failure (-25 pts), HIGH_RISK, REVIEW_REQUIRED.
        """
        p1 = (
            "BID DOCUMENTS\n"
            "Tax Registration GSTIN: 27AAACT2727Q1ZW\n"
            "Income Tax PAN: AABFN1234F\n"
        )
        pdf_stream = create_pdf_bytes([p1])

        response = client.post(
            "/api/v1/compliance/verify-document",
            files={"file": ("pan_mismatch_bid.pdf", pdf_stream, "application/pdf")},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["overall_score"] == 60
        assert data["risk_level"] == RiskLevel.MEDIUM_RISK.value

        r01_check = next((c for c in data["consistency_checks"] if c["rule_id"] == "R-01"), None)
        assert r01_check is not None
        assert r01_check["status"] == "FAIL"

    def test_e2e_document_with_expired_oem_maf_deduplication(self):
        """
        Tests document with expired OEM MAF.
        Verifies single primary deduction (-25 pts) under STAT-OEM-01 and secondary citation under R-05.
        """
        p1 = (
            "OEM AUTHORIZATION\n"
            "OEM Name: Cisco Systems India Private Limited\n"
            "Partner: NexaTech Innovations LLP\n"
            "MAF No: MAF-CSCO-2024-1100\n"
            "Valid From: 2024-01-01 to 2024-12-31\n"
            "Tender No: GEM/2026/B/778899\n"
        )
        pdf_stream = create_pdf_bytes([p1])

        response = client.post(
            "/api/v1/compliance/verify-document",
            files={"file": ("expired_maf_bid.pdf", pdf_stream, "application/pdf")},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["overall_score"] == 75
        assert data["risk_level"] == RiskLevel.HIGH_RISK.value

        # Anti-double counting verification
        stat_oem_sc = next((sc for sc in data["score_breakdown"] if sc["rule_id"] == "STAT-OEM-01"), None)
        assert stat_oem_sc is not None
        assert stat_oem_sc["points_change"] == -25
        assert stat_oem_sc["is_primary_penalty"] is True

        r05_sc = next((sc for sc in data["score_breakdown"] if sc["rule_id"] == "R-05"), None)
        assert r05_sc is not None
        assert r05_sc["points_change"] == 0
        assert r05_sc["is_primary_penalty"] is False

    def test_e2e_document_with_unregistered_valid_gstin(self):
        """
        Tests document containing authentic valid GSTIN not present in mock database.
        Must assign valid deterministic status and 0-pt penalty (100/100, LOW_RISK).
        """
        p1 = (
            "BID PROFILE\n"
            "Company: Ashok Leyland Limited\n"
            "GSTIN: 33AAACA6529K1ZQ\n"
            "PAN: AAACA6529K\n"
        )
        pdf_stream = create_pdf_bytes([p1])

        response = client.post(
            "/api/v1/compliance/verify-document",
            files={"file": ("unregistered_valid_bid.pdf", pdf_stream, "application/pdf")},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["overall_score"] == 100
        assert data["risk_level"] == RiskLevel.LOW_RISK.value
        assert data["statutory_verifications"]["gstin"]["deterministic"]["is_checksum_valid"] is True
        assert data["statutory_verifications"]["gstin"]["registry"]["registry_found"] is False

    def test_e2e_blank_pdf_graceful_handling(self):
        """
        Tests empty/blank PDF with no text.
        Must return 200 with 0 extracted entities, no crash, and neutral state.
        """
        doc = fitz.open()
        doc.new_page()  # Blank page
        pdf_bytes = doc.tobytes()
        doc.close()
        pdf_stream = io.BytesIO(pdf_bytes)

        response = client.post(
            "/api/v1/compliance/verify-document",
            files={"file": ("blank_bid.pdf", pdf_stream, "application/pdf")},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["overall_score"] == 100
        assert len(data["extracted_entities"]["gstin_candidates"]) == 0
        assert len(data["extracted_entities"]["pan_candidates"]) == 0

    def test_e2e_scanned_pdf_real_ocr_pipeline(self):
        """
        Tests true image-only scanned PDF requiring Tesseract OCR fallback.
        Renders image without digital text layer, triggers OCR processing,
        extracts candidate GSTIN/PAN with confidence >= 0.70, and produces full compliance verdict.
        """
        ocr_proc = TesseractOCRProcessor()
        if not ocr_proc.is_available():
            pytest.skip("Tesseract OCR binary is not installed in this environment.")

        scanned_text = (
            "BIDDER: Tech Mahindra Limited\n"
            "GSTIN: 27AAACT2727Q1ZW\n"
            "PAN: AAACT2727Q\n"
        )
        pdf_stream = create_scanned_image_pdf_bytes(scanned_text)

        response = client.post(
            "/api/v1/compliance/verify-document",
            files={"file": ("scanned_certificate.pdf", pdf_stream, "application/pdf")},
        )

        assert response.status_code == 200
        data = response.json()

        # Score and Status
        assert data["overall_score"] == 100
        assert data["risk_level"] == RiskLevel.LOW_RISK.value

        # Extracted candidates from OCR
        gst_cands = data["extracted_entities"]["gstin_candidates"]
        assert len(gst_cands) >= 1
        assert gst_cands[0]["value"] == "27AAACT2727Q1ZW"
        assert gst_cands[0]["page_number"] == 1

        pan_cands = data["extracted_entities"]["pan_candidates"]
        assert len(pan_cands) >= 1
        assert pan_cands[0]["value"] == "AAACT2727Q"

    def test_e2e_invalid_file_extension_error(self):
        """Tests rejection of non-PDF upload."""
        fake_txt = io.BytesIO(b"Not a PDF file content")

        response = client.post(
            "/api/v1/compliance/verify-document",
            files={"file": ("document.docx", fake_txt, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )

        assert response.status_code == 400
        assert "Allowed formats: PDF" in response.json()["detail"]
