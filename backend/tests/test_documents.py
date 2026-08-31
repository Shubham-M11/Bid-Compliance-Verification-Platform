import io
from pathlib import Path
import tempfile
from unittest.mock import MagicMock
from PIL import Image, ImageDraw
import pymupdf
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.schemas.document import ExtractionMethod
from app.services.documents.hybrid_processor import HybridDocumentProcessor
from app.services.documents.ocr_processor import BaseOCRProcessor
from app.services.documents.service import DocumentService, document_service
from main import app


def create_mock_pdf_bytes(pages_text: list[str]) -> bytes:
    """Helper to generate a valid in-memory digital PDF with given text for each page."""
    doc = pymupdf.open()
    for text in pages_text:
        page = doc.new_page()
        if text:
            page.insert_text((50, 72), text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def create_scanned_image_pdf_bytes(image_text: str = "SCANNED CERTIFICATE") -> bytes:
    """Helper to generate a PDF page containing an embedded raster image instead of digital text."""
    # 1. Create a PIL Image with rasterized text
    img = Image.new("RGB", (600, 200), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((30, 80), image_text, fill=(0, 0, 0))

    img_buffer = io.BytesIO()
    img.save(img_buffer, format="PNG")
    img_bytes = img_buffer.getvalue()

    # 2. Insert image into a PDF page
    doc = pymupdf.open()
    page = doc.new_page(width=600, height=200)
    page.insert_image(page.rect, stream=img_bytes)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


class MockOCRProcessor(BaseOCRProcessor):
    """Mock OCR processor for deterministic testing without external binaries."""

    def __init__(self, mock_text: str = "EXTRACTED VIA MOCK OCR", confidence: float = 94.5, available: bool = True):
        self.mock_text = mock_text
        self.confidence = confidence
        self._available = available

    def is_available(self) -> bool:
        return self._available

    def extract_text_and_confidence(self, image: Image.Image):
        if not self._available:
            return "", None
        return self.mock_text, self.confidence


# ==============================================================================
# Task 2A Regression & Digital Extraction Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_upload_single_page_pdf():
    """Test uploading a valid single-page digital PDF."""
    pdf_content = create_mock_pdf_bytes(["GeM Bidder GST Compliance Certificate GSTIN: 07AAAAA0000A1Z5"])
    files = {"file": ("certificate.pdf", io.BytesIO(pdf_content), "application/pdf")}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/documents/upload", files=files)
        assert response.status_code == 200
        data = response.json()

        assert data["filename"] == "certificate.pdf"
        assert data["content_type"] == "application/pdf"
        assert data["page_count"] == 1
        assert data["status"] == "processed"
        assert len(data["pages"]) == 1
        assert data["pages"][0]["page_number"] == 1
        assert "GST Compliance Certificate" in data["pages"][0]["text"]
        assert data["pages"][0]["has_text"] is True
        assert data["pages"][0]["character_count"] > 0
        assert data["pages"][0]["extraction_method"] == "digital"
        assert data["pages"][0]["ocr_confidence"] is None
        assert data["document_id"].startswith("doc_")
        assert "created_at" in data


@pytest.mark.asyncio
async def test_upload_multi_page_pdf():
    """Test uploading a multi-page digital PDF and verify page sequence & numbering."""
    page_texts = [
        "Page 1: Technical Tender Specifications and Overview",
        "Page 2: Financial Bid Details & Turnover Requirements for FY 2025",
        "Page 3: OEM Authorization Letter & Verification Signatures",
    ]
    pdf_content = create_mock_pdf_bytes(page_texts)
    files = {"file": ("tender_packet.pdf", io.BytesIO(pdf_content), "application/pdf")}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/documents/upload", files=files)
        assert response.status_code == 200
        data = response.json()

        assert data["page_count"] == 3
        assert len(data["pages"]) == 3
        assert data["status"] == "processed"

        for idx, expected_text in enumerate(page_texts):
            page_data = data["pages"][idx]
            assert page_data["page_number"] == idx + 1
            assert expected_text in page_data["text"]
            assert page_data["has_text"] is True
            assert page_data["extraction_method"] == "digital"
            assert page_data["ocr_confidence"] is None


@pytest.mark.asyncio
async def test_upload_scanned_or_blank_pdf_no_ocr():
    """Test uploading a blank PDF when OCR engine is unconfigured or yields no text."""
    pdf_content = create_mock_pdf_bytes([""])
    files = {"file": ("blank_document.pdf", io.BytesIO(pdf_content), "application/pdf")}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/documents/upload", files=files)
        assert response.status_code == 200
        data = response.json()

        assert data["page_count"] == 1
        assert data["status"] == "no_text_detected"
        assert len(data["pages"]) == 1
        assert data["pages"][0]["has_text"] is False
        assert data["pages"][0]["character_count"] == 0
        assert data["pages"][0]["text"] == ""


@pytest.mark.asyncio
async def test_upload_empty_file():
    """Test uploading an empty 0-byte file."""
    files = {"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/documents/upload", files=files)
        assert response.status_code == 400
        assert "empty" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_upload_invalid_file_extension():
    """Test uploading a non-PDF file format."""
    files = {"file": ("document.txt", io.BytesIO(b"Hello World"), "text/plain")}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/documents/upload", files=files)
        assert response.status_code == 400
        assert "unsupported" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_upload_malformed_pdf():
    """Test uploading corrupted PDF bytes."""
    corrupted_bytes = b"%PDF-1.4\nCorrupted binary payload that cannot be parsed by PyMuPDF"
    files = {"file": ("corrupt.pdf", io.BytesIO(corrupted_bytes), "application/pdf")}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/documents/upload", files=files)
        assert response.status_code == 400
        assert "malformed" in response.json()["detail"].lower() or "unreadable" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_upload_oversized_file(monkeypatch):
    """Test file size limit validation."""
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_BYTES", 100)

    pdf_content = create_mock_pdf_bytes(["A larger page text that easily exceeds one hundred bytes limit..."])
    files = {"file": ("oversized.pdf", io.BytesIO(pdf_content), "application/pdf")}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/documents/upload", files=files)
        assert response.status_code == 413
        assert "exceeds" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_temp_file_cleanup_after_upload():
    """Verify that no temporary files remain in the system temp dir after processing."""
    temp_dir = Path(tempfile.gettempdir())
    before_files = set(temp_dir.glob("doc_*"))

    pdf_content = create_mock_pdf_bytes(["Test temporary cleanup validation."])
    files = {"file": ("cleanup_test.pdf", io.BytesIO(pdf_content), "application/pdf")}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/documents/upload", files=files)
        assert response.status_code == 200

    after_files = set(temp_dir.glob("doc_*"))
    assert len(after_files - before_files) == 0


# ==============================================================================
# Task 2B Hybrid Extraction & OCR Fallback Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_hybrid_processor_scanned_ocr_fallback(monkeypatch):
    """Test scanned page OCR fallback using MockOCRProcessor."""
    # Inject mock OCR processor into DocumentService
    mock_ocr = MockOCRProcessor(mock_text="SCANNED PAN CARD ABCDE1234F", confidence=92.8, available=True)
    custom_hybrid = HybridDocumentProcessor(ocr_processor=mock_ocr)
    monkeypatch.setattr(document_service, "processor", custom_hybrid)

    # Scanned PDF without digital text
    pdf_content = create_scanned_image_pdf_bytes("SCANNED PAN CARD ABCDE1234F")
    files = {"file": ("scanned_pan.pdf", io.BytesIO(pdf_content), "application/pdf")}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/documents/upload", files=files)
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "ocr_processed"
        assert len(data["pages"]) == 1
        page = data["pages"][0]
        assert page["page_number"] == 1
        assert page["extraction_method"] == "ocr"
        assert page["ocr_confidence"] == 92.8
        assert "ABCDE1234F" in page["text"]
        assert page["has_text"] is True


@pytest.mark.asyncio
async def test_hybrid_processor_mixed_pages(monkeypatch):
    """
    Test a 3-page mixed document:
    Page 1: Digital text (>15 chars)
    Page 2: Scanned image (triggers OCR fallback)
    Page 3: Digital text (>15 chars)
    """
    mock_ocr = MockOCRProcessor(mock_text="SCANNED CERTIFICATE TEXT", confidence=88.5, available=True)
    custom_hybrid = HybridDocumentProcessor(ocr_processor=mock_ocr)
    monkeypatch.setattr(document_service, "processor", custom_hybrid)

    # Construct mixed PDF in-memory
    doc = pymupdf.open()
    # Page 1: Digital
    p1 = doc.new_page()
    p1.insert_text((50, 72), "Page 1: Government of India GeM Tender Requirements 2026", fontsize=12)
    # Page 2: Scanned Image
    img = Image.new("RGB", (400, 150), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((20, 50), "SCANNED CERTIFICATE TEXT", fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    p2 = doc.new_page(width=400, height=150)
    p2.insert_image(p2.rect, stream=buf.getvalue())
    # Page 3: Digital
    p3 = doc.new_page()
    p3.insert_text((50, 72), "Page 3: Final Acceptance and Signatures by Authorized Officer", fontsize=12)

    pdf_bytes = doc.tobytes()
    doc.close()

    files = {"file": ("mixed_tender.pdf", io.BytesIO(pdf_bytes), "application/pdf")}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/documents/upload", files=files)
        assert response.status_code == 200
        data = response.json()

        assert data["page_count"] == 3
        assert data["status"] == "ocr_processed"
        pages = data["pages"]

        # Page 1: Digital
        assert pages[0]["page_number"] == 1
        assert pages[0]["extraction_method"] == "digital"
        assert pages[0]["ocr_confidence"] is None
        assert "GeM Tender Requirements" in pages[0]["text"]

        # Page 2: OCR Fallback
        assert pages[1]["page_number"] == 2
        assert pages[1]["extraction_method"] == "ocr"
        assert pages[1]["ocr_confidence"] == 88.5
        assert "SCANNED CERTIFICATE" in pages[1]["text"]

        # Page 3: Digital
        assert pages[2]["page_number"] == 3
        assert pages[2]["extraction_method"] == "digital"
        assert pages[2]["ocr_confidence"] is None
        assert "Final Acceptance" in pages[2]["text"]


@pytest.mark.asyncio
async def test_hybrid_processor_ocr_unavailable_graceful_degradation(monkeypatch):
    """Test that if OCR engine is unavailable, the pipeline degrades gracefully without crashing."""
    mock_ocr = MockOCRProcessor(available=False)
    custom_hybrid = HybridDocumentProcessor(ocr_processor=mock_ocr)
    monkeypatch.setattr(document_service, "processor", custom_hybrid)

    # Scanned PDF without text
    pdf_content = create_scanned_image_pdf_bytes("UNREADABLE SCANNED")
    files = {"file": ("scanned_no_ocr.pdf", io.BytesIO(pdf_content), "application/pdf")}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/documents/upload", files=files)
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "no_text_detected"
        assert len(data["pages"]) == 1
        assert data["pages"][0]["has_text"] is False
        assert data["pages"][0]["extraction_method"] == "ocr_unavailable"
        assert "not configured" in data["message"].lower() or "no digital text" in data["message"].lower()


def test_tesseract_ocr_processor_discovery_and_configuration(tmp_path):
    """
    Verify that when Tesseract is installed or provided:
    1. _discover_tesseract() / __init__() captures the executable path
    2. is_available() returns True
    3. pytesseract.pytesseract.tesseract_cmd is set to that exact path
    """
    import pytesseract
    from app.services.documents.ocr_processor import TesseractOCRProcessor

    # 1. Test deterministic assignment with an explicit path
    fake_exe = tmp_path / "tesseract.exe"
    fake_exe.write_text("fake binary payload")

    processor_custom = TesseractOCRProcessor(tesseract_cmd=str(fake_exe))
    assert processor_custom.is_available() is True
    assert processor_custom._tesseract_cmd == str(fake_exe)
    assert pytesseract.pytesseract.tesseract_cmd == str(fake_exe)

    # 2. Test real Windows auto-discovery if installed at C:\Program Files\Tesseract-OCR\tesseract.exe
    standard_win_path = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")
    if standard_win_path.is_file():
        processor_auto = TesseractOCRProcessor()
        assert processor_auto.is_available() is True
        assert Path(processor_auto._tesseract_cmd).resolve() == standard_win_path.resolve()
        assert Path(pytesseract.pytesseract.tesseract_cmd).resolve() == standard_win_path.resolve()

