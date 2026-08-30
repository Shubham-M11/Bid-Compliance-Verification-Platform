from datetime import datetime, timezone
import io
import logging
from pathlib import Path
from typing import List, Optional
from PIL import Image
import pymupdf

from app.core.config import settings
from app.schemas.document import (
    DocumentProcessingStatus,
    DocumentUploadResponse,
    ExtractionMethod,
    PageTextEvidence,
)
from app.services.documents.base import BaseDocumentProcessor
from app.services.documents.ocr_processor import BaseOCRProcessor, TesseractOCRProcessor

logger = logging.getLogger(__name__)


class HybridDocumentProcessor(BaseDocumentProcessor):
    """
    Hybrid PDF text extractor that uses PyMuPDF for digital text extraction
    and falls back to in-memory OCR (Tesseract) for scanned/image-only pages.
    """

    def __init__(self, ocr_processor: Optional[BaseOCRProcessor] = None):
        self.ocr_processor = ocr_processor or TesseractOCRProcessor()

    def process(
        self,
        file_path: Path,
        document_id: str,
        filename: str,
        content_type: str,
        file_size: int,
    ) -> DocumentUploadResponse:
        """
        Process PDF page-by-page, selecting digital extraction or OCR fallback based on text content.
        """
        try:
            with pymupdf.open(str(file_path)) as doc:
                page_count = len(doc)
                pages_evidence: List[PageTextEvidence] = []
                digital_page_count = 0
                ocr_page_count = 0
                total_characters = 0
                all_ocr_confidences: List[float] = []

                for page_index in range(page_count):
                    page = doc[page_index]
                    page_number = page_index + 1  # 1-indexed

                    # 1. First attempt native digital text extraction via PyMuPDF
                    raw_digital_text = page.get_text("text") or ""
                    cleaned_digital_text = raw_digital_text.strip()
                    digital_char_count = len(cleaned_digital_text)

                    # 2. Check if digital text meets the meaningful threshold
                    if digital_char_count >= settings.OCR_MIN_TEXT_THRESHOLD:
                        pages_evidence.append(
                            PageTextEvidence(
                                page_number=page_number,
                                text=cleaned_digital_text,
                                character_count=digital_char_count,
                                has_text=True,
                                extraction_method=ExtractionMethod.DIGITAL,
                                ocr_confidence=None,
                            )
                        )
                        digital_page_count += 1
                        total_characters += digital_char_count
                    else:
                        # 3. Fallback: Render page in-memory to image and run OCR
                        pix = page.get_pixmap(dpi=settings.OCR_DPI)
                        img_bytes = pix.tobytes("png")
                        image = Image.open(io.BytesIO(img_bytes))

                        ocr_text, ocr_conf = self.ocr_processor.extract_text_and_confidence(image)
                        cleaned_ocr_text = ocr_text.strip()
                        ocr_char_count = len(cleaned_ocr_text)

                        if ocr_char_count > 0:
                            pages_evidence.append(
                                PageTextEvidence(
                                    page_number=page_number,
                                    text=cleaned_ocr_text,
                                    character_count=ocr_char_count,
                                    has_text=True,
                                    extraction_method=ExtractionMethod.OCR,
                                    ocr_confidence=ocr_conf,
                                )
                            )
                            ocr_page_count += 1
                            total_characters += ocr_char_count
                            if ocr_conf is not None:
                                all_ocr_confidences.append(ocr_conf)
                        else:
                            # 4. No text detected in digital layer OR OCR (blank page or OCR unavailable)
                            fallback_method = (
                                ExtractionMethod.OCR_UNAVAILABLE
                                if not self.ocr_processor.is_available()
                                else ExtractionMethod.OCR
                            )
                            # If digital text had 1-14 chars, retain it if OCR found nothing
                            has_residual_digital = digital_char_count > 0
                            final_text = cleaned_digital_text if has_residual_digital else ""
                            final_count = len(final_text)

                            pages_evidence.append(
                                PageTextEvidence(
                                    page_number=page_number,
                                    text=final_text,
                                    character_count=final_count,
                                    has_text=has_residual_digital,
                                    extraction_method=ExtractionMethod.DIGITAL if has_residual_digital else fallback_method,
                                    ocr_confidence=None,
                                )
                            )
                            if has_residual_digital:
                                digital_page_count += 1
                                total_characters += final_count

                # Determine overall document processing status
                if page_count == 0 or total_characters == 0:
                    status = DocumentProcessingStatus.NO_TEXT_DETECTED
                    if not self.ocr_processor.is_available() and ocr_page_count == 0:
                        message = (
                            "No digital text detected. Document appears to be scanned, "
                            "and Tesseract OCR binary is not configured on this server."
                        )
                    else:
                        message = "PDF document contains no extractable digital or OCR text."
                elif ocr_page_count > 0:
                    status = DocumentProcessingStatus.OCR_PROCESSED
                    avg_doc_conf = (
                        f" (Avg OCR confidence: {round(sum(all_ocr_confidences)/len(all_ocr_confidences), 1)}%)"
                        if all_ocr_confidences
                        else ""
                    )
                    message = (
                        f"Hybrid extraction complete: {digital_page_count} digital page(s), "
                        f"{ocr_page_count} OCR page(s){avg_doc_conf}."
                    )
                else:
                    status = DocumentProcessingStatus.PROCESSED
                    message = f"Digital extraction complete: {digital_page_count} page(s) with text."

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
            logger.error(f"Failed to parse PDF {filename}: {err}")
            raise ValueError(f"Malformed or unreadable PDF document: {err}")
        except Exception as err:
            logger.exception(f"Unexpected error in HybridDocumentProcessor for {filename}: {err}")
            raise ValueError(f"Failed to process PDF document: {err}")
