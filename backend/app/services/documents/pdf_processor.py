from datetime import datetime, timezone
import logging
from pathlib import Path
from typing import List
import pymupdf

from app.schemas.document import (
    DocumentProcessingStatus,
    DocumentUploadResponse,
    PageTextEvidence,
)
from app.services.documents.base import BaseDocumentProcessor

logger = logging.getLogger(__name__)


class PyMuPDFProcessor(BaseDocumentProcessor):
    """PDF text extractor powered by PyMuPDF."""

    def process(
        self,
        file_path: Path,
        document_id: str,
        filename: str,
        content_type: str,
        file_size: int,
    ) -> DocumentUploadResponse:
        """
        Extract page-level text evidence from a PDF document using PyMuPDF.
        """
        try:
            # Open PDF using PyMuPDF context manager to ensure safe handle release on Windows
            with pymupdf.open(str(file_path)) as doc:
                page_count = len(doc)
                pages_evidence: List[PageTextEvidence] = []
                total_characters = 0

                for page_index in range(page_count):
                    page = doc[page_index]
                    page_number = page_index + 1  # 1-indexed for human and legal readability

                    # Extract plain text
                    raw_text = page.get_text("text") or ""
                    cleaned_text = raw_text.strip()
                    char_count = len(cleaned_text)
                    has_text = char_count > 0

                    if has_text:
                        total_characters += char_count

                    pages_evidence.append(
                        PageTextEvidence(
                            page_number=page_number,
                            text=cleaned_text,
                            character_count=char_count,
                            has_text=has_text,
                        )
                    )

                # Determine processing status
                if page_count == 0:
                    status = DocumentProcessingStatus.NO_TEXT_DETECTED
                    message = "PDF document contains 0 pages."
                elif total_characters == 0:
                    status = DocumentProcessingStatus.NO_TEXT_DETECTED
                    message = (
                        "PDF contains no digital text layer. Document appears to be a scanned image "
                        "or contains non-text elements. OCR will be required."
                    )
                else:
                    status = DocumentProcessingStatus.PROCESSED
                    pages_with_text = sum(1 for p in pages_evidence if p.has_text)
                    message = (
                        f"PDF processed successfully. Extracted text from {pages_with_text} of "
                        f"{page_count} page(s) ({total_characters} total characters)."
                    )

                return DocumentUploadResponse(
                    document_id=document_id,
                    filename=filename,
                    content_type=content_type,
                    file_size=file_size,
                    page_count=page_count,
                    status=status,
                    pages=pages_evidence,
                    message=message,
                    created_at=datetime.now(timezone.utc),
                )

        except pymupdf.FileDataError as err:
            logger.error(f"PyMuPDF failed to parse file {filename}: {err}")
            raise ValueError(f"Malformed or unreadable PDF document: {err}")
        except Exception as err:
            logger.exception(f"Unexpected error while processing PDF {filename}: {err}")
            raise ValueError(f"Failed to process PDF document: {err}")
