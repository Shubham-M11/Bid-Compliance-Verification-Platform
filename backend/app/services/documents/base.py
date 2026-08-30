from abc import ABC, abstractmethod
from pathlib import Path

from app.schemas.document import DocumentUploadResponse


class BaseDocumentProcessor(ABC):
    """Abstract base class interface for document processors."""

    @abstractmethod
    def process(
        self,
        file_path: Path,
        document_id: str,
        filename: str,
        content_type: str,
        file_size: int,
    ) -> DocumentUploadResponse:
        """
        Extract text and structure from a document file.

        Args:
            file_path: Path to the local temporary file.
            document_id: Unique identifier generated for this document.
            filename: Original filename.
            content_type: MIME type of the file.
            file_size: File size in bytes.

        Returns:
            DocumentUploadResponse containing page-by-page extracted text and metadata.
        """
        pass
