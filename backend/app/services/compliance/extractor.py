from datetime import date, datetime
import re
from typing import Dict, List, Optional, Set, Tuple
from app.schemas.composite import (
    EntitySource,
    EntityType,
    ExtractedEntitiesSummary,
    ExtractedEntityItem,
)
from app.services.compliance.gst.normalizer import gstin_normalizer
from app.services.compliance.pan.normalizer import pan_normalizer
from app.services.compliance.udyam.normalizer import udyam_normalizer
from app.services.compliance.oem.normalizer import oem_normalizer
from app.services.compliance.luhn_mod36 import verify_gstin_checksum
from app.services.compliance.pan_decoder import is_valid_pan_format
from app.services.compliance.state_codes import is_valid_state_code

# Strict Regex Patterns
GSTIN_REGEX = re.compile(r"\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b")
GSTIN_DELIMITED_REGEX = re.compile(r"\b([0-9]{2}[\-\s][A-Z]{5}[0-9]{4}[A-Z]{1}[\-\s][1-9A-Z]{1}Z[0-9A-Z]{1})\b")
GSTIN_PREFIX_REGEX = re.compile(r"(?:GSTIN|GST\s*No|GST\s*Registration(?:\s*No)?|GST\s*ID)[:\s]+([0-9A-Za-z\-_]{15,18})\b", re.IGNORECASE)
PAN_REGEX = re.compile(r"\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b")
PAN_PREFIX_REGEX = re.compile(r"(?:PAN|Permanent\s*Account\s*Number|PAN\s*No|PAN\s*Card)[:\s]+([A-Za-z0-9\-\s]{10,14})\b", re.IGNORECASE)
UDYAM_REGEX = re.compile(r"\b(UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7})\b")
UDYAM_LOOSE_REGEX = re.compile(r"\b(UDYAM[\s\-_/:.]+[A-Za-z]{2}[\s\-_/:.]+[0-9]{2}[\s\-_/:.]+[0-9]{7})\b", re.IGNORECASE)
MAF_REGEX = re.compile(r"\b(MAF-[A-Z0-9\-]+|[A-Z0-9\-]+-MAF-[A-Z0-9\-]+)\b", re.IGNORECASE)
GEM_TENDER_REGEX = re.compile(r"\b(GEM/\d{4}/[A-Z]/\d+)\b", re.IGNORECASE)
GENERIC_TENDER_REGEX = re.compile(
    r"(?:Tender|Bid|RFP|NIT)\s*(?:No|Ref|ID|Number)?[:\s]+([A-Z0-9\-_/]{5,35})",
    re.IGNORECASE,
)

# Contextual Prefix Regexes for Names and References
BIDDER_PREFIX_REGEX = re.compile(
    r"(?:(?:Name\s+of\s+(?:the\s+)?(?:Bidder|Supplier|Vendor|Contractor|Taxpayer|Enterprise|Company))|(?:Bidder|Supplier|Vendor|Company)\s*(?:Name)?|Legal\s+Entity\s*(?:Name)?|M/s\.?)[:\s]+([^\n\r,;]{3,80})",
    re.IGNORECASE,
)
OEM_PREFIX_REGEX = re.compile(
    r"(?:Original\s+Equipment\s+Manufacturer|Manufacturer|OEM(?:\s+Name)?|Authorized\s+by)[:\s]+([^\n\r,;]{3,80})",
    re.IGNORECASE,
)
MAF_PREFIX_REGEX = re.compile(
    r"(?:MAF\s*(?:No|Ref|Number)?|Authorization\s+(?:Certificate|Ref|No))[:\s]+([A-Z0-9\-_/]{4,40})",
    re.IGNORECASE,
)
CORPORATE_SUFFIX_REGEX = re.compile(
    r"\b([A-Z][A-Za-z0-9\s,\.\-&]{2,60}\s+(?:PRIVATE\s+LIMITED|PVT\s+LTD|LIMITED|LTD|LLP|CORPORATION|CORP|ENTERPRISES))\b"
)

# Date Regexes
ISO_DATE_REGEX = re.compile(r"\b(\d{4}-\d{2}-\d{2})\b")
DMY_DATE_REGEX = re.compile(r"\b(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{4})\b")
MONTH_NAME_DATE_REGEX = re.compile(
    r"\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b",
    re.IGNORECASE,
)


class DocumentEntityExtractor:
    """
    Intelligent extractor scanning text/page evidence from documents (Task 2)
    to discover statutory identifiers, entity names, OEM references, and tender metadata.
    Preserves exact provenance (document ID, filename, page number, context snippet).
    """

    def extract_from_documents(
        self, documents: List[DocumentUploadResponse]
    ) -> ExtractedEntitiesSummary:
        """Extract all candidate entities across a collection of processed documents."""
        all_items: List[ExtractedEntityItem] = []

        for doc in documents:
            doc_id = doc.document_id
            filename = doc.filename
            for page in doc.pages:
                if page.has_text and page.text:
                    items = self.extract_from_page(
                        document_id=doc_id,
                        filename=filename,
                        page_number=page.page_number,
                        text=page.text,
                    )
                    all_items.extend(items)

        return self._build_summary(all_items)

    def extract_from_raw_text(
        self,
        text: str,
        document_id: str = "doc_raw",
        filename: str = "raw_input.txt",
        page_number: int = 1,
    ) -> ExtractedEntitiesSummary:
        """Extract candidate entities from an arbitrary raw text block."""
        items = self.extract_from_page(
            document_id=document_id,
            filename=filename,
            page_number=page_number,
            text=text,
        )
        return self._build_summary(items)

    def extract_from_page(
        self, document_id: str, filename: str, page_number: int, text: str
    ) -> List[ExtractedEntityItem]:
        """Scan a single page's text for statutory and tender entities."""
        items: List[ExtractedEntityItem] = []
        found_gstins: Set[str] = set()
        gstin_spans: List[Tuple[int, int]] = []
        found_pans: Set[str] = set()

        # 1. Extract GSTINs (Strict and Delimited/Prefixed Candidates)
        for match in GSTIN_REGEX.finditer(text):
            raw_val = match.group(1).upper()
            norm_val, norm_details = gstin_normalizer.normalize(raw_val)
            state_valid = is_valid_state_code(norm_val[:2])
            checksum_valid, _, _ = verify_gstin_checksum(norm_val)
            conf = 0.98 if (state_valid and checksum_valid) else (0.80 if state_valid else 0.60)

            found_gstins.add(norm_val)
            gstin_spans.append((match.start(), match.end()))
            items.append(
                ExtractedEntityItem(
                    entity_type=EntityType.GSTIN,
                    value=norm_val,
                    raw_match=match.group(0),
                    document_id=document_id,
                    filename=filename,
                    page_number=page_number,
                    confidence=conf,
                    context_snippet=self._get_context(text, match.start(), match.end()),
                    source_type=EntitySource.DOCUMENT_EXTRACTED,
                    extraction_method="regex_and_luhn_mod36",
                    is_candidate_only=False,
                )
            )

        # Also search for delimited or prefixed candidates if not already found
        for match in list(GSTIN_DELIMITED_REGEX.finditer(text)) + list(GSTIN_PREFIX_REGEX.finditer(text)):
            raw_candidate = match.group(1)
            norm_val, norm_details = gstin_normalizer.normalize(raw_candidate)
            if len(norm_val) == 15 and norm_val not in found_gstins:
                state_valid = is_valid_state_code(norm_val[:2])
                checksum_valid, _, _ = verify_gstin_checksum(norm_val)
                if state_valid or checksum_valid:
                    conf = 0.95 if (state_valid and checksum_valid) else 0.75
                    found_gstins.add(norm_val)
                    gstin_spans.append((match.start(), match.end()))
                    items.append(
                        ExtractedEntityItem(
                            entity_type=EntityType.GSTIN,
                            value=norm_val,
                            raw_match=match.group(0),
                            document_id=document_id,
                            filename=filename,
                            page_number=page_number,
                            confidence=conf,
                            context_snippet=self._get_context(text, match.start(), match.end()),
                            source_type=EntitySource.DOCUMENT_EXTRACTED,
                            extraction_method="ocr_normalized_regex",
                            is_candidate_only=False,
                        )
                    )

        # 2. Extract PANs (avoiding PAN matches that are strictly inside GSTIN string spans)
        for match in PAN_REGEX.finditer(text):
            p_start, p_end = match.start(), match.end()
            # If match is located inside any 15-char GSTIN string span, skip
            if any(g_start <= p_start and p_end <= g_end for g_start, g_end in gstin_spans):
                continue

            raw_val = match.group(1).upper()
            norm_val, norm_details = pan_normalizer.normalize(raw_val)
            if norm_val in found_pans:
                continue

            # Evaluate context proximity to keywords
            snippet = self._get_context(text, match.start(), match.end())
            has_pan_keyword = bool(re.search(r"\b(?:PAN|Income\s+Tax|Permanent\s+Account)\b", snippet, re.IGNORECASE))
            conf = 0.95 if has_pan_keyword else 0.85

            found_pans.add(norm_val)
            items.append(
                ExtractedEntityItem(
                    entity_type=EntityType.PAN,
                    value=norm_val,
                    raw_match=match.group(0),
                    document_id=document_id,
                    filename=filename,
                    page_number=page_number,
                    confidence=conf,
                    context_snippet=snippet,
                    source_type=EntitySource.DOCUMENT_EXTRACTED,
                    extraction_method="regex_pan_structure",
                    is_candidate_only=False,
                )
            )

        # Contextual prefixed PAN candidates
        for match in PAN_PREFIX_REGEX.finditer(text):
            raw_candidate = match.group(1)
            norm_val, norm_details = pan_normalizer.normalize(raw_candidate)
            if len(norm_val) == 10 and is_valid_pan_format(norm_val) and norm_val not in found_pans:
                snippet = self._get_context(text, match.start(), match.end())
                found_pans.add(norm_val)
                items.append(
                    ExtractedEntityItem(
                        entity_type=EntityType.PAN,
                        value=norm_val,
                        raw_match=match.group(0),
                        document_id=document_id,
                        filename=filename,
                        page_number=page_number,
                        confidence=0.92,
                        context_snippet=snippet,
                        source_type=EntitySource.DOCUMENT_EXTRACTED,
                        extraction_method="ocr_normalized_regex",
                        is_candidate_only=False,
                    )
                )

        # 3. Extract Udyam Registration Numbers
        found_udyams: Set[str] = set()
        for match in list(UDYAM_REGEX.finditer(text)) + list(UDYAM_LOOSE_REGEX.finditer(text)):
            raw_candidate = match.group(1)
            norm_val, norm_details = udyam_normalizer.normalize(raw_candidate)
            if norm_val not in found_udyams:
                found_udyams.add(norm_val)
                items.append(
                    ExtractedEntityItem(
                        entity_type=EntityType.UDYAM,
                        value=norm_val,
                        raw_match=match.group(0),
                        document_id=document_id,
                        filename=filename,
                        page_number=page_number,
                        confidence=0.98 if not norm_details.is_normalized else 0.90,
                        context_snippet=self._get_context(text, match.start(), match.end()),
                        source_type=EntitySource.DOCUMENT_EXTRACTED,
                        extraction_method="regex_udyam",
                        is_candidate_only=False,
                    )
                )

        # 4. Extract Legal / Bidder Entity Names (Treated strictly as Candidate Evidence)
        seen_names: Set[str] = set()
        for match in BIDDER_PREFIX_REGEX.finditer(text):
            candidate = self._clean_name_candidate(match.group(1))
            if candidate and len(candidate) > 4 and candidate not in seen_names:
                seen_names.add(candidate)
                items.append(
                    ExtractedEntityItem(
                        entity_type=EntityType.LEGAL_NAME,
                        value=candidate,
                        raw_match=match.group(0),
                        document_id=document_id,
                        filename=filename,
                        page_number=page_number,
                        confidence=0.88,
                        context_snippet=self._get_context(text, match.start(), match.end()),
                        source_type=EntitySource.DOCUMENT_EXTRACTED,
                        extraction_method="keyword_prefix_heuristic",
                        is_candidate_only=True,
                    )
                )

        for match in CORPORATE_SUFFIX_REGEX.finditer(text):
            candidate = self._clean_name_candidate(match.group(1))
            if candidate and len(candidate) > 4 and candidate not in seen_names:
                seen_names.add(candidate)
                items.append(
                    ExtractedEntityItem(
                        entity_type=EntityType.LEGAL_NAME,
                        value=candidate,
                        raw_match=match.group(0),
                        document_id=document_id,
                        filename=filename,
                        page_number=page_number,
                        confidence=0.80,
                        context_snippet=self._get_context(text, match.start(), match.end()),
                        source_type=EntitySource.DOCUMENT_EXTRACTED,
                        extraction_method="corporate_suffix_heuristic",
                        is_candidate_only=True,
                    )
                )

        # 5. Extract OEM Names
        for match in OEM_PREFIX_REGEX.finditer(text):
            candidate = self._clean_name_candidate(match.group(1))
            if candidate and len(candidate) > 3:
                items.append(
                    ExtractedEntityItem(
                        entity_type=EntityType.OEM_NAME,
                        value=candidate,
                        raw_match=match.group(0),
                        document_id=document_id,
                        filename=filename,
                        page_number=page_number,
                        confidence=0.85,
                        context_snippet=self._get_context(text, match.start(), match.end()),
                        source_type=EntitySource.DOCUMENT_EXTRACTED,
                        extraction_method="oem_prefix_heuristic",
                        is_candidate_only=True,
                    )
                )

        # 6. Extract MAF Certificate Numbers
        found_mafs: Set[str] = set()
        for match in MAF_REGEX.finditer(text):
            raw_val = match.group(1).upper()
            norm_val, norm_details = oem_normalizer.normalize_maf_number(raw_val)
            if norm_val and norm_val not in found_mafs:
                found_mafs.add(norm_val)
                items.append(
                    ExtractedEntityItem(
                        entity_type=EntityType.MAF_NUMBER,
                        value=norm_val,
                        raw_match=match.group(0),
                        document_id=document_id,
                        filename=filename,
                        page_number=page_number,
                        confidence=0.92,
                        context_snippet=self._get_context(text, match.start(), match.end()),
                        source_type=EntitySource.DOCUMENT_EXTRACTED,
                        extraction_method="regex_maf",
                        is_candidate_only=False,
                    )
                )

        for match in MAF_PREFIX_REGEX.finditer(text):
            raw_val = match.group(1).strip()
            norm_val, norm_details = oem_normalizer.normalize_maf_number(raw_val)
            if norm_val and len(norm_val) >= 4 and norm_val not in found_mafs:
                found_mafs.add(norm_val)
                items.append(
                    ExtractedEntityItem(
                        entity_type=EntityType.MAF_NUMBER,
                        value=norm_val,
                        raw_match=match.group(0),
                        document_id=document_id,
                        filename=filename,
                        page_number=page_number,
                        confidence=0.85,
                        context_snippet=self._get_context(text, match.start(), match.end()),
                        source_type=EntitySource.DOCUMENT_EXTRACTED,
                        extraction_method="maf_prefix_heuristic",
                        is_candidate_only=False,
                    )
                )

        # 7. Extract Tender / Bid References
        for match in GEM_TENDER_REGEX.finditer(text):
            raw_val = match.group(1).upper()
            items.append(
                ExtractedEntityItem(
                    entity_type=EntityType.TENDER_REF,
                    value=raw_val,
                    raw_match=match.group(0),
                    document_id=document_id,
                    filename=filename,
                    page_number=page_number,
                    confidence=0.96,
                    context_snippet=self._get_context(text, match.start(), match.end()),
                    source_type=EntitySource.DOCUMENT_EXTRACTED,
                    extraction_method="regex_gem_tender",
                    is_candidate_only=False,
                )
            )

        for match in GENERIC_TENDER_REGEX.finditer(text):
            raw_val = match.group(1).strip()
            if len(raw_val) >= 5 and not any(raw_val in it.value for it in items if it.entity_type == EntityType.TENDER_REF):
                items.append(
                    ExtractedEntityItem(
                        entity_type=EntityType.TENDER_REF,
                        value=raw_val,
                        raw_match=match.group(0),
                        document_id=document_id,
                        filename=filename,
                        page_number=page_number,
                        confidence=0.82,
                        context_snippet=self._get_context(text, match.start(), match.end()),
                        source_type=EntitySource.DOCUMENT_EXTRACTED,
                        extraction_method="generic_tender_prefix",
                        is_candidate_only=False,
                    )
                )

        # 8. Extract Dates
        for match in ISO_DATE_REGEX.finditer(text):
            raw_val = match.group(1)
            items.append(
                ExtractedEntityItem(
                    entity_type=EntityType.DATE,
                    value=raw_val,
                    raw_match=match.group(0),
                    document_id=document_id,
                    filename=filename,
                    page_number=page_number,
                    confidence=0.90,
                    context_snippet=self._get_context(text, match.start(), match.end()),
                    source_type=EntitySource.DOCUMENT_EXTRACTED,
                    extraction_method="iso_date_regex",
                    is_candidate_only=True,
                )
            )

        for match in DMY_DATE_REGEX.finditer(text):
            raw_val = match.group(1)
            items.append(
                ExtractedEntityItem(
                    entity_type=EntityType.DATE,
                    value=raw_val,
                    raw_match=match.group(0),
                    document_id=document_id,
                    filename=filename,
                    page_number=page_number,
                    confidence=0.85,
                    context_snippet=self._get_context(text, match.start(), match.end()),
                    source_type=EntitySource.DOCUMENT_EXTRACTED,
                    extraction_method="dmy_date_regex",
                    is_candidate_only=True,
                )
            )

        return items

    def _get_context(self, text: str, start: int, end: int, window: int = 50) -> str:
        """Extract a clean surrounding text window around match."""
        ctx_start = max(0, start - window)
        ctx_end = min(len(text), end + window)
        snippet = text[ctx_start:ctx_end].replace("\n", " ").replace("\r", " ")
        return re.sub(r"\s+", " ", snippet).strip()

    def _clean_name_candidate(self, raw_str: str) -> Optional[str]:
        """Normalize extracted candidate name token."""
        cleaned = re.sub(r"[\t\n\r]+", " ", raw_str)
        cleaned = re.sub(r"^[^\w]+|[^\w\.\)]+$", "", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        ignored_headers = {
            "PARTICULARS", "DETAILS", "INFORMATION", "DECLARATION", "DOCUMENT",
            "FORM", "PROFILE", "PAGE", "SECTION", "CERTIFICATE", "ANNEXURE",
            "SUMMARY", "SCHEDULE", "ATTACHMENT", "REQUIREMENTS", "INSTRUCTIONS"
        }
        if cleaned.upper() in ignored_headers or len(cleaned) < 4:
            return None
        return cleaned

    def _build_summary(self, items: List[ExtractedEntityItem]) -> ExtractedEntitiesSummary:
        """Group extracted items by entity type."""
        summary = ExtractedEntitiesSummary()
        for item in items:
            if item.entity_type == EntityType.GSTIN:
                summary.gstin_candidates.append(item)
            elif item.entity_type == EntityType.PAN:
                summary.pan_candidates.append(item)
            elif item.entity_type == EntityType.UDYAM:
                summary.udyam_candidates.append(item)
            elif item.entity_type == EntityType.LEGAL_NAME:
                summary.legal_name_candidates.append(item)
            elif item.entity_type == EntityType.OEM_NAME:
                summary.oem_name_candidates.append(item)
            elif item.entity_type == EntityType.MAF_NUMBER:
                summary.maf_number_candidates.append(item)
            elif item.entity_type == EntityType.TENDER_REF:
                summary.tender_ref_candidates.append(item)
            elif item.entity_type == EntityType.DATE:
                summary.date_candidates.append(item)
        return summary


# Global singleton instance
document_entity_extractor = DocumentEntityExtractor()
