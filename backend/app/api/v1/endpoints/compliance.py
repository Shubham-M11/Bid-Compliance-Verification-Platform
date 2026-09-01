from pathlib import Path
from typing import List, Optional
import uuid
from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from app.schemas.composite import (
    BidMetadata,
    CompositeVerificationRequest,
    CompositeVerificationResponse,
    ExtractedEntitiesSummary,
    SampleBidMetadata,
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

# Locate sample bids directory relative to backend root
_BACKEND_ROOT = Path(__file__).resolve().parents[4]
SAMPLE_BIDS_DIR = _BACKEND_ROOT / "sample_bids" if (_BACKEND_ROOT / "sample_bids").exists() else Path("sample_bids").resolve()

SAMPLE_BIDS: List[SampleBidMetadata] = [
    SampleBidMetadata(
        sample_id="sample_a_corporate",
        filename="test_a_compliant_corporate.pdf",
        name="Fully Compliant Corporate",
        bidder_name="Tech Mahindra Limited",
        tender_ref="GEM/2026/B/890123",
        category="Compliant Corporate",
        description="Standard compliant corporate bid with valid GSTIN, matching PAN, and active OEM MAF.",
        expected_score=100,
        expected_risk="LOW_RISK",
        primary_rule="Clean Audit (0 Deductions)",
    ),
    SampleBidMetadata(
        sample_id="sample_b_msme",
        filename="test_b_multipage_msme.pdf",
        name="Multi-Page MSME Manufacturer",
        bidder_name="NexaTech Innovations LLP",
        tender_ref="GEM/2026/B/778899",
        category="MSME Manufacturer",
        description="4-page bid document with Delhi Udyam registration and active Cisco Systems MAF on page 4.",
        expected_score=100,
        expected_risk="LOW_RISK",
        primary_rule="Multi-Page Provenance (p.1 & p.4)",
    ),
    SampleBidMetadata(
        sample_id="sample_c_checksum",
        filename="test_c_corrupted_checksum.pdf",
        name="GST Checksum Mismatch",
        bidder_name="Infosys Limited",
        tender_ref="GEM/2026/B/890123",
        category="Algorithmic Violation",
        description="GSTIN with corrupted 15th-character Mod-36 checksum, triggering -15 pts deduction.",
        expected_score=85,
        expected_risk="MEDIUM_RISK",
        primary_rule="STAT-GST-02 (Luhn Mod-36 Checksum)",
    ),
    SampleBidMetadata(
        sample_id="sample_d_pan_gst",
        filename="test_d_pan_gst_mismatch.pdf",
        name="PAN / GST Identity Conflict",
        bidder_name="Tech Mahindra Limited",
        tender_ref="GEM/2026/B/890123",
        category="Identity Conflict",
        description="Conflicting PAN and GSTIN belonging to different legal entities (Rule R-01, -25 pts).",
        expected_score=75,
        expected_risk="MEDIUM_RISK",
        primary_rule="Rule R-01 (PAN-GST Linkage)",
    ),
    SampleBidMetadata(
        sample_id="sample_e_expired_maf",
        filename="test_e_expired_maf.pdf",
        name="Expired OEM Authorization",
        bidder_name="NexaTech Innovations LLP",
        tender_ref="GEM/2026/B/778899",
        category="Expired Authorization",
        description="OEM MAF validity date passed relative to bid submission date (-25 pts primary deduction; R-05 deduplicated).",
        expected_score=75,
        expected_risk="HIGH_RISK",
        primary_rule="STAT-OEM-01 & Anti-Double-Counting",
    ),
    SampleBidMetadata(
        sample_id="sample_f_partial_no_oem",
        filename="test_f_partial_no_oem.pdf",
        name="Missing Optional OEM Document",
        bidder_name="Tata Consultancy Services Limited",
        tender_ref="GEM/2026/B/890123",
        category="Partial Bid",
        description="Valid GSTIN and PAN without OEM MAF, evaluated neutrally where OEM is not required.",
        expected_score=100,
        expected_risk="LOW_RISK",
        primary_rule="Neutral Evaluation (No Arbitrary Penalty)",
    ),
    SampleBidMetadata(
        sample_id="sample_g_blank",
        filename="test_g_blank.pdf",
        name="Blank / Unreadable Document",
        bidder_name="Unspecified Bidder",
        tender_ref="GEM/2026/B/000000",
        category="Edge Case",
        description="Document with zero text characters to demonstrate graceful parser handling.",
        expected_score=100,
        expected_risk="LOW_RISK",
        primary_rule="Graceful Degradation (no_text_detected)",
    ),
    SampleBidMetadata(
        sample_id="sample_h_scanned_ocr",
        filename="test_h_scanned_ocr.pdf",
        name="Scanned PDF / OCR Fallback",
        bidder_name="Tech Mahindra Limited",
        tender_ref="GEM/2026/B/890123",
        category="Scanned Document",
        description="Image-only PDF processed by automated OCR fallback extraction.",
        expected_score=100,
        expected_risk="LOW_RISK",
        primary_rule="OCR Fallback Layer",
    ),
]


class RawTextExtractionRequest(BaseModel):
    """Payload for extracting entities from plain text without prior PDF upload."""
    text: str = Field(..., min_length=1, description="Raw document text content to scan")
    document_id: Optional[str] = Field(default="doc_raw", description="Optional identifier")
    filename: Optional[str] = Field(default="pasted_text.txt", description="Optional source filename")


@router.get(
    "/sample-bids",
    response_model=List[SampleBidMetadata],
    status_code=status.HTTP_200_OK,
    summary="List available sample bid PDF scenarios",
    description="Returns pre-configured sample bid PDF scenarios for evaluation and demonstration.",
)
async def list_sample_bids() -> List[SampleBidMetadata]:
    """Return available sample bid scenarios."""
    return SAMPLE_BIDS


@router.post(
    "/verify-sample/{sample_id}",
    response_model=CompositeVerificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute end-to-end verification on a pre-loaded sample bid PDF",
    description="Loads a sample PDF from backend storage and executes the full document verification pipeline live.",
)
async def verify_sample_bid(
    sample_id: str,
    document_svc: DocumentService = Depends(lambda: document_service),
) -> CompositeVerificationResponse:
    """Execute live verification on sample bid PDF without client-side upload."""
    sample = next((s for s in SAMPLE_BIDS if s.sample_id == sample_id), None)
    if not sample:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sample scenario '{sample_id}' not found.",
        )

    file_path = SAMPLE_BIDS_DIR / sample.filename
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sample PDF file '{sample.filename}' not found at {file_path}.",
        )

    try:
        # Process document through the real hybrid parser
        doc_id = f"doc_{uuid.uuid4().hex[:12]}"
        file_size = file_path.stat().st_size
        doc_response = document_svc.processor.process(
            file_path=file_path,
            document_id=doc_id,
            filename=sample.filename,
            content_type="application/pdf",
            file_size=file_size,
        )

        bid_meta = BidMetadata(
            expected_bidder_name=sample.bidder_name,
            tender_ref_number=sample.tender_ref,
        )

        verification_req = CompositeVerificationRequest(
            documents=[doc_response],
            bid_metadata=bid_meta,
        )

        return await composite_verification_service.verify_composite(verification_req)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing sample verification for '{sample_id}': {str(e)}",
        )


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

