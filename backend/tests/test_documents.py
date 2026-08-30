import io
from pathlib import Path
import tempfile
import pymupdf
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from main import app


def create_mock_pdf_bytes(pages_text: list[str]) -> bytes:
    """Helper to generate a valid in-memory PDF with given text for each page."""
    doc = pymupdf.open()
    for text in pages_text:
        page = doc.new_page()
        if text:
            page.insert_text((50, 72), text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


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
        assert data["document_id"].startswith("doc_")
        assert "created_at" in data


@pytest.mark.asyncio
async def test_upload_multi_page_pdf():
    """Test uploading a multi-page PDF and verify page sequence & numbering."""
    page_texts = [
        "Page 1: Technical Tender Specifications",
        "Page 2: Financial Bid Details & Turnover Requirements",
        "Page 3: OEM Authorization Letter & Signatures",
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


@pytest.mark.asyncio
async def test_upload_scanned_or_blank_pdf():
    """Test uploading a PDF with no extractable text (scanned image scenario)."""
    # Create a 1-page PDF without inserting any digital text
    pdf_content = create_mock_pdf_bytes([""])
    files = {"file": ("scanned_document.pdf", io.BytesIO(pdf_content), "application/pdf")}

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
        assert "scanned image" in data["message"]


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
    # Temporarily set max upload size to 100 bytes for testing
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
    
    # Count files matching our prefix before upload
    before_files = set(temp_dir.glob("doc_*"))

    pdf_content = create_mock_pdf_bytes(["Test temporary cleanup validation."])
    files = {"file": ("cleanup_test.pdf", io.BytesIO(pdf_content), "application/pdf")}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/documents/upload", files=files)
        assert response.status_code == 200

    after_files = set(temp_dir.glob("doc_*"))
    # The set of remaining files after upload should not have increased
    assert len(after_files - before_files) == 0
