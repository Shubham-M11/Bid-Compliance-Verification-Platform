import logging
from pathlib import Path
import tempfile
import uuid
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.schemas.document import DocumentUploadResponse
from app.services.documents.base import BaseDocumentProcessor
from app.services.documents.hybrid_processor import HybridDocumentProcessor

logger = logging.getLogger(__name__)


class DocumentService:
    """Service coordinating document uploads, validation, temporary storage, and extraction."""

    def __init__(self, processor: BaseDocumentProcessor = None):
        self.processor = processor or HybridDocumentProcessor()

    async def process_uploaded_file(self, file: UploadFile) -> DocumentUploadResponse:
        """
        Validate, safely store temporarily, process via document processor, and clean up.
        """
        # 1. Validate filename
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Filename cannot be empty.",
            )

        original_filename = file.filename
        file_ext = Path(original_filename).suffix.lower().lstrip(".")

        if file_ext not in settings.ALLOWED_EXTENSIONS:
            allowed_str = ", ".join(settings.ALLOWED_EXTENSIONS).upper()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format '.{file_ext}'. Allowed formats: {allowed_str}.",
            )

        # 2. Validate MIME type if provided
        content_type = file.content_type or "application/pdf"
        if content_type not in settings.ALLOWED_MIME_TYPES and content_type != "application/octet-stream":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid MIME type '{content_type}'. Expected 'application/pdf'.",
            )

        # 3. Create temporary file and stream upload content
        document_id = f"doc_{uuid.uuid4().hex[:12]}"
        temp_file_path: Path = None
        total_bytes = 0

        try:
            # Create a named temporary file (delete=False to allow PyMuPDF reading across processes)
            with tempfile.NamedTemporaryFile(
                delete=False,
                suffix=f".{file_ext}",
                prefix=f"{document_id}_",
            ) as temp_out:
                temp_file_path = Path(temp_out.name)

                # Stream in 64KB chunks to prevent high memory consumption
                while chunk := await file.read(64 * 1024):
                    total_bytes += len(chunk)
                    if total_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
                        max_mb = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
                        raise HTTPException(
                            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                            detail=f"File size exceeds maximum allowed limit of {max_mb} MB.",
                        )
                    temp_out.write(chunk)

            # Check for empty file
            if total_bytes == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Uploaded file is empty (0 bytes).",
                )

            # 4. Delegate to the processor
            try:
                response = self.processor.process(
                    file_path=temp_file_path,
                    document_id=document_id,
                    filename=original_filename,
                    content_type="application/pdf",
                    file_size=total_bytes,
                )
                return response
            except ValueError as val_err:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(val_err),
                )
            except Exception as proc_err:
                logger.exception(f"Document processing failure: {proc_err}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="An unexpected error occurred while extracting text from the document.",
                )

        finally:
            # 5. Guaranteed Temporary File Cleanup
            if temp_file_path and temp_file_path.exists():
                try:
                    temp_file_path.unlink()
                except Exception as cleanup_err:
                    logger.warning(f"Failed to delete temp file {temp_file_path}: {cleanup_err}")


# Global default service instance
document_service = DocumentService()
