from fastapi import APIRouter, Depends, File, UploadFile, status

from app.schemas.document import DocumentUploadResponse
from app.services.documents.service import DocumentService, document_service

router = APIRouter()


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload and Extract PDF Document",
    description=(
        "Uploads a tender/compliance PDF document, validates size and MIME type, "
        "and extracts traceable page-by-page text evidence using PyMuPDF."
    ),
)
async def upload_document(
    file: UploadFile = File(..., description="PDF document to be processed"),
    service: DocumentService = Depends(lambda: document_service),
) -> DocumentUploadResponse:
    """Handle document upload and text extraction."""
    return await service.process_uploaded_file(file)
