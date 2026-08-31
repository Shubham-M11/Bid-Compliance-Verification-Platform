from typing import List, Optional
from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from app.schemas.composite import (
    BidMetadata,
    CompositeVerificationRequest,
    CompositeVerificationResponse,
    ExtractedEntitiesSummary,
)
from app.schemas.document import DocumentUploadResponse
from app.services.compliance.composite_service import (
    CompositeVerificationService,
    composite_verification_service,
)
from app.services.compliance.extractor import (
    DocumentEntityExtractor,
    document_entity_extractor,
)
from app.services.documents.service import DocumentService, document_service

router = APIRouter()


class RawTextExtractionRequest(BaseModel):
    """Payload for extracting entities from plain text without prior PDF upload."""
    text: str = Field(..., min_length=1, description="Raw document text content to scan")
    document_id: Optional[str] = Field(default="doc_raw", description="Optional identifier")
    filename: Optional[str] = Field(default="pasted_text.txt", description="Optional source filename")


@router.post(
    "/verify",
    response_model=CompositeVerificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Run composite compliance verification and risk analysis",
    description=(
        "Performs complete compliance intelligence: extracts statutory identifiers from Task 2 document evidence, "
        "runs individual statutory validations, executes cross-entity relational consistency checks, "
        "and computes an explainable, deterministic 100-point risk score."
    ),
)
async def verify_compliance(
    request: CompositeVerificationRequest,
) -> CompositeVerificationResponse:
    """Execute end-to-end composite compliance verification."""
    try:
        return await composite_verification_service.verify_composite(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing composite compliance verification: {str(e)}",
        )


@router.post(
    "/extract-entities",
    response_model=ExtractedEntitiesSummary,
    status_code=status.HTTP_200_OK,
    summary="Extract statutory and tender entities from documents or text",
    description=(
        "Scans document pages or raw text to extract GSTIN, PAN, Udyam, Legal Names, OEM MAF references, "
        "and tender numbers with complete page and document provenance."
    ),
)
async def extract_entities(
    documents: Optional[List[DocumentUploadResponse]] = Body(default=None),
) -> ExtractedEntitiesSummary:
    """Extract candidate statutory and tender entities from document collection."""
    try:
        if not documents:
            return ExtractedEntitiesSummary()
        return document_entity_extractor.extract_from_documents(documents)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error extracting entities from documents: {str(e)}",
        )


@router.post(
    "/extract-from-text",
    response_model=ExtractedEntitiesSummary,
    status_code=status.HTTP_200_OK,
    summary="Extract entities from raw plain text",
    description="Utility endpoint to extract candidate statutory identifiers from a raw text string.",
)
async def extract_entities_from_text(
    request: RawTextExtractionRequest,
) -> ExtractedEntitiesSummary:
    """Extract candidate entities from raw string."""
    try:
        return document_entity_extractor.extract_from_raw_text(
            text=request.text,
            document_id=request.document_id or "doc_raw",
            filename=request.filename or "pasted_text.txt",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error extracting entities from text: {str(e)}",
        )


@router.post(
    "/verify-document",
    response_model=CompositeVerificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload PDF and execute end-to-end composite verification",
    description=(
        "Unified endpoint: Uploads a bid PDF, extracts text/page evidence via PyMuPDF/OCR, "
        "extracts statutory and tender entities, executes statutory & consistency checks, and produces "
        "an explainable composite review response in a single seamless call."
    ),
)
async def verify_document(
    file: UploadFile = File(..., description="Bid PDF document to process and verify"),
    expected_bidder_name: Optional[str] = Form(default=None, description="Optional expected bidder name"),
    tender_ref_number: Optional[str] = Form(default=None, description="Optional expected tender reference"),
    document_svc: DocumentService = Depends(lambda: document_service),
) -> CompositeVerificationResponse:
    """Handle end-to-end PDF upload, document text extraction, and composite compliance verification."""
    try:
        # 1. Process and extract document text evidence (PyMuPDF with Tesseract OCR fallback)
        doc_response = await document_svc.process_uploaded_file(file)

        # 2. Build composite verification request with document evidence
        bid_meta = (
            BidMetadata(
                expected_bidder_name=expected_bidder_name,
                tender_ref_number=tender_ref_number,
            )
            if (expected_bidder_name or tender_ref_number)
            else None
        )

        verification_req = CompositeVerificationRequest(
            documents=[doc_response],
            bid_metadata=bid_meta,
        )

        # 3. Execute complete composite compliance pipeline
        return await composite_verification_service.verify_composite(verification_req)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during document compliance verification: {str(e)}",
        )
