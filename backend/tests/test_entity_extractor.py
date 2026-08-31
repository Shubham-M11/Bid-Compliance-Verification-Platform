import pytest
from app.schemas.composite import EntitySource, EntityType
from app.schemas.document import DocumentProcessingStatus, DocumentUploadResponse, PageTextEvidence
from app.services.compliance.extractor import DocumentEntityExtractor


class TestDocumentEntityExtractor:
    """Test DocumentEntityExtractor entity discovery, confidence, and provenance."""

    def setup_method(self):
        self.extractor = DocumentEntityExtractor()

    def test_extract_gstin_pan_udyam_from_text(self):
        sample_text = """
        TAX INVOICE & BIDDER CERTIFICATE
        Name of Bidder: NexaTech Innovations LLP
        GSTIN: 07AABFN1234F1ZS
        Permanent Account Number: AABFN1234F
        MSME Registration: UDYAM-DL-01-0012345
        OEM Authorization Ref: MAF-CSCO-2026-8891
        Tender No: GEM/2026/B/445566
        Date of Issue: 2026-04-15
        """
        summary = self.extractor.extract_from_raw_text(
            text=sample_text,
            document_id="doc_test_101",
            filename="bidder_credentials.pdf",
            page_number=1,
        )

        # 1. GSTIN Check
        assert len(summary.gstin_candidates) == 1
        gstin_item = summary.gstin_candidates[0]
        assert gstin_item.value == "07AABFN1234F1ZS"
        assert gstin_item.document_id == "doc_test_101"
        assert gstin_item.filename == "bidder_credentials.pdf"
        assert gstin_item.page_number == 1
        assert gstin_item.confidence >= 0.90
        assert gstin_item.source_type == EntitySource.DOCUMENT_EXTRACTED

        # 2. Standalone PAN Check (not embedded inside GSTIN)
        assert len(summary.pan_candidates) == 1
        pan_item = summary.pan_candidates[0]
        assert pan_item.value == "AABFN1234F"
        assert pan_item.confidence >= 0.85

        # 3. Udyam Check
        assert len(summary.udyam_candidates) == 1
        udyam_item = summary.udyam_candidates[0]
        assert udyam_item.value == "UDYAM-DL-01-0012345"

        # 4. MAF Number Check
        assert len(summary.maf_number_candidates) == 1
        assert summary.maf_number_candidates[0].value == "MAF-CSCO-2026-8891"

        # 5. Tender Reference Check
        assert len(summary.tender_ref_candidates) >= 1
        assert "GEM/2026/B/445566" in [t.value for t in summary.tender_ref_candidates]

        # 6. Candidate Legal Name Check (Treated strictly as Candidate Evidence)
        assert len(summary.legal_name_candidates) >= 1
        assert any("NexaTech Innovations" in n.value for n in summary.legal_name_candidates)
        assert all(n.is_candidate_only is True for n in summary.legal_name_candidates)

    def test_avoid_duplicate_pan_inside_gstin(self):
        """When text only contains GSTIN '27AAACT2727Q1ZW', standalone PAN extractor shouldn't double-extract embedded PAN."""
        sample_text = "Vendor GST Registration: 27AAACT2727Q1ZW (Registered in Maharashtra)"
        summary = self.extractor.extract_from_raw_text(sample_text)

        assert len(summary.gstin_candidates) == 1
        assert summary.gstin_candidates[0].value == "27AAACT2727Q1ZW"
        # PAN embedded in GSTIN should not be duplicated as standalone PAN candidate
        assert len(summary.pan_candidates) == 0

    def test_extract_from_multi_page_document_upload_response(self):
        doc = DocumentUploadResponse(
            document_id="doc_multi_01",
            filename="bid_submission_pack.pdf",
            content_type="application/pdf",
            file_size=204800,
            page_count=2,
            status=DocumentProcessingStatus.PROCESSED,
            pages=[
                PageTextEvidence(
                    page_number=1,
                    text="Bidder Name: Tech Mahindra Limited\nGSTIN: 27AAACT2727Q1ZW\nTender: GEM/2026/B/890123",
                    character_count=85,
                    has_text=True,
                ),
                PageTextEvidence(
                    page_number=2,
                    text="OEM Authorization\nManufacturer: Hewlett Packard Enterprise\nMAF No: HPE-IND-MAF-2026-0045\nValid until: 2027-03-31",
                    character_count=120,
                    has_text=True,
                ),
            ],
        )
        summary = self.extractor.extract_from_documents([doc])

        assert len(summary.gstin_candidates) == 1
        assert summary.gstin_candidates[0].page_number == 1
        assert summary.gstin_candidates[0].document_id == "doc_multi_01"

        assert len(summary.maf_number_candidates) == 1
        assert summary.maf_number_candidates[0].page_number == 2
        assert summary.maf_number_candidates[0].value == "HPE-IND-MAF-2026-0045"

        assert len(summary.oem_name_candidates) >= 1
        assert summary.oem_name_candidates[0].page_number == 2
