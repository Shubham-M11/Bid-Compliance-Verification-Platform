from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class ExtractionMethod(str, Enum):
    """Method utilized for extracting text from a document page."""
    DIGITAL = "digital"
    OCR = "ocr"
    OCR_UNAVAILABLE = "ocr_unavailable"


class DocumentProcessingStatus(str, Enum):
    """Enumeration of document processing states."""
    PROCESSED = "processed"
    OCR_PROCESSED = "ocr_processed"
    NO_TEXT_DETECTED = "no_text_detected"
    FAILED = "failed"


class PageTextEvidence(BaseModel):
    """Page-level extracted text and traceability metadata."""
    page_number: int = Field(..., ge=1, description="1-indexed page number in the original document")
    text: str = Field(default="", description="Extracted plain text content from this page")
    character_count: int = Field(default=0, description="Total characters extracted on this page")
    has_text: bool = Field(default=False, description="True if non-whitespace text was extracted")
    extraction_method: ExtractionMethod = Field(
        default=ExtractionMethod.DIGITAL,
        description="Mechanism used to extract page text ('digital', 'ocr', 'ocr_unavailable')",
    )
    ocr_confidence: Optional[float] = Field(
        default=None,
        description="Average OCR confidence score (0.0 to 100.0%) if extracted via OCR",
    )


class DocumentUploadResponse(BaseModel):
    """Schema returned by POST /api/v1/documents/upload."""
    document_id: str = Field(..., description="Unique generated document identifier")
    filename: str = Field(..., description="Original filename of the uploaded file")
    content_type: str = Field(..., description="MIME content type")
    file_size: int = Field(..., ge=0, description="Size of the uploaded file in bytes")
    page_count: int = Field(..., ge=0, description="Total number of pages in the document")
    status: DocumentProcessingStatus = Field(..., description="Processing status of the document")
    pages: List[PageTextEvidence] = Field(
        default_factory=list, description="List of page-level extracted evidence"
    )
    message: Optional[str] = Field(
        default=None, description="Informational message or processing notes"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timezone-aware UTC timestamp of processing",
    )
