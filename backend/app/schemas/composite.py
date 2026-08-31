from datetime import date, datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.schemas.document import DocumentUploadResponse
from app.schemas.statutory import (
    GSTINValidationRequest,
    GSTINValidationResponse,
    MOCK_REGISTRY_DISCLAIMER,
    OEMValidationRequest,
    OEMValidationResponse,
    PANValidationRequest,
    PANValidationResponse,
    UdyamValidationRequest,
    UdyamValidationResponse,
)


# ==============================================================================
# Enumerations for Composite Intelligence & Risk Analysis
# ==============================================================================

class RiskLevel(str, Enum):
    """Decision-support compliance risk tiers."""
    LOW_RISK = "LOW_RISK"
    MEDIUM_RISK = "MEDIUM_RISK"
    HIGH_RISK = "HIGH_RISK"


class CompositeStatus(str, Enum):
    """Aggregated compliance verdict status."""
    COMPLIANT = "COMPLIANT"
    CONDITIONAL_COMPLIANCE = "CONDITIONAL_COMPLIANCE"
    NON_COMPLIANT = "NON_COMPLIANT"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"


class FindingSeverity(str, Enum):
    """Severity classification for audit findings."""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class CheckStatus(str, Enum):
    """Individual rule evaluation status."""
    PASS = "PASS"
    FAIL = "FAIL"
    WARNING = "WARNING"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class EntityType(str, Enum):
    """Categorization of extracted statutory/tender entities."""
    GSTIN = "GSTIN"
    PAN = "PAN"
    UDYAM = "UDYAM"
    LEGAL_NAME = "LEGAL_NAME"
    OEM_NAME = "OEM_NAME"
    MAF_NUMBER = "MAF_NUMBER"
    TENDER_REF = "TENDER_REF"
    DATE = "DATE"
    OTHER = "OTHER"


class EntitySource(str, Enum):
    """Provenance origin of an entity or identifier."""
    DOCUMENT_EXTRACTED = "DOCUMENT_EXTRACTED"
    USER_SUPPLIED = "USER_SUPPLIED"


# Decision-support guidance text constants
RISK_GUIDANCE_MAP: Dict[RiskLevel, str] = {
    RiskLevel.LOW_RISK: "Low compliance risk detected; proceed to standard tender evaluation workflow.",
    RiskLevel.MEDIUM_RISK: "Moderate compliance risk or policy warnings detected; manual officer review recommended.",
    RiskLevel.HIGH_RISK: "Significant compliance risk or statutory inconsistency detected; manual officer review required.",
}


# ==============================================================================
# Extracted Entity & Evidence Traceability Models
# ==============================================================================

class ExtractedEntityItem(BaseModel):
    """Candidate entity extracted from document pages with full provenance."""
    entity_type: EntityType = Field(..., description="Classification of the entity")
    value: str = Field(..., description="Extracted & normalized entity value")
    raw_match: str = Field(..., description="Exact string match found in source text")
    document_id: str = Field(..., description="Source document identifier")
    filename: str = Field(..., description="Original filename")
    page_number: int = Field(..., ge=1, description="1-indexed source page number")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Extraction confidence score (0.0 - 1.0)")
    context_snippet: str = Field(..., description="Surrounding contextual text snippet")
    source_type: EntitySource = Field(
        default=EntitySource.DOCUMENT_EXTRACTED, description="Provenance origin"
    )
    extraction_method: str = Field(
        default="regex", description="Mechanism (regex, keyword_heuristic, structure_rule)"
    )
    is_candidate_only: bool = Field(
        default=True,
        description="True for candidate extracted text (e.g. extracted legal names) requiring verification",
    )


class EvidenceItem(BaseModel):
    """Traceable evidence item linking an audit finding to source documents and values."""
    evidence_id: str = Field(..., description="Unique evidence citation identifier")
    rule_id: str = Field(..., description="Associated consistency or validation rule ID")
    field_name: str = Field(..., description="Field under examination (e.g. 'PAN', 'Legal Name', 'MAF Expiry')")
    extracted_value: Optional[str] = Field(default=None, description="Value extracted from document")
    comparison_value: Optional[str] = Field(default=None, description="Registry, user-supplied, or cross-entity comparison value")
    document_id: Optional[str] = Field(default=None, description="Referenced document ID if from document")
    filename: Optional[str] = Field(default=None, description="Referenced document filename")
    page_number: Optional[int] = Field(default=None, description="Source page number")
    context_snippet: Optional[str] = Field(default=None, description="Contextual excerpt from document")
    source_type: EntitySource = Field(default=EntitySource.DOCUMENT_EXTRACTED, description="Data origin")
    finding_description: str = Field(..., description="Audit observation statement")


# ==============================================================================
# Cross-Entity Rule & Score Breakdown Models
# ==============================================================================

class CrossConsistencyCheckResult(BaseModel):
    """Outcome of a single cross-entity consistency rule."""
    rule_id: str = Field(..., description="Unique rule code (e.g. R-01, R-02)")
    rule_name: str = Field(..., description="Human-readable rule name")
    category: str = Field(..., description="Category (Identity, Authorization, Temporal, Policy)")
    status: CheckStatus = Field(..., description="Check status (PASS, FAIL, WARNING, etc.)")
    severity: FindingSeverity = Field(..., description="Finding severity level")
    summary: str = Field(..., description="Concise non-technical finding summary")
    details: Dict[str, Any] = Field(default_factory=dict, description="Structured evaluation metadata")
    evidence: List[EvidenceItem] = Field(default_factory=list, description="Linked audit evidence items")


class ScoreContribution(BaseModel):
    """Itemized explainable score adjustment."""
    rule_id: str = Field(..., description="Rule triggering this score contribution")
    rule_category: str = Field(..., description="Rule category")
    title: str = Field(..., description="Short explanation title")
    points_change: int = Field(..., description="Points deducted (negative) or neutral (0)")
    reason: str = Field(..., description="Clear explanation of the score deduction or neutral verdict")
    severity: FindingSeverity = Field(..., description="Severity level")
    is_primary_penalty: bool = Field(
        default=True,
        description="True if primary deduction for root cause; False if suppressed to avoid double counting",
    )


class ComplianceFinding(BaseModel):
    """Itemized actionable finding for procurement officers and bidders."""
    finding_id: str = Field(..., description="Unique finding ID (e.g. FND_001)")
    rule_id: str = Field(..., description="Associated rule ID")
    severity: FindingSeverity = Field(..., description="Severity classification")
    title: str = Field(..., description="Finding title")
    description: str = Field(..., description="Detailed description of the issue or confirmation")
    remediation_guidance: str = Field(..., description="Actionable recommendation for resolution")
    linked_evidence: List[EvidenceItem] = Field(default_factory=list, description="Associated evidence citations")


# ==============================================================================
# Composite Verification Request & Response Schemas
# ==============================================================================

class BidMetadata(BaseModel):
    """Target bid/tender context metadata."""
    tender_ref_number: Optional[str] = Field(default=None, description="Tender / Bid reference number")
    expected_bidder_name: Optional[str] = Field(default=None, description="Expected legal name of the bidder")
    bid_submission_date: Optional[date] = Field(default=None, description="Bid submission date (defaults to today)")
    tender_state_code: Optional[str] = Field(default=None, description="Target tender 2-digit state code")


class CompositeVerificationRequest(BaseModel):
    """
    Request payload for composite compliance verification.
    Accepts extracted Task 2 document evidence, explicit statutory requests, or both.
    """
    documents: Optional[List[DocumentUploadResponse]] = Field(
        default=None, description="List of processed documents from Task 2 containing page-level extracted text"
    )
    explicit_gstin: Optional[GSTINValidationRequest] = Field(
        default=None, description="Explicit user-supplied GSTIN verification request"
    )
    explicit_pan: Optional[PANValidationRequest] = Field(
        default=None, description="Explicit user-supplied PAN verification request"
    )
    explicit_udyam: Optional[UdyamValidationRequest] = Field(
        default=None, description="Explicit user-supplied Udyam verification request"
    )
    explicit_oem: Optional[OEMValidationRequest] = Field(
        default=None, description="Explicit user-supplied OEM MAF verification request"
    )
    bid_metadata: Optional[BidMetadata] = Field(
        default=None, description="Tender context metadata for cross-matching"
    )
    scoring_policy: Optional[ScoringPolicy] = Field(
        default=None, description="Optional custom review-priority scoring policy overrides"
    )


class StatutoryVerificationsBundle(BaseModel):
    """Container for individual statutory verification responses (Task 3A outputs)."""
    gstin: Optional[GSTINValidationResponse] = Field(default=None, description="GSTIN verification output")
    pan: Optional[PANValidationResponse] = Field(default=None, description="PAN verification output")
    udyam: Optional[UdyamValidationResponse] = Field(default=None, description="Udyam verification output")
    oem: Optional[OEMValidationResponse] = Field(default=None, description="OEM MAF verification output")


class ExtractedEntitiesSummary(BaseModel):
    """Grouped collection of entities extracted from document evidence."""
    gstin_candidates: List[ExtractedEntityItem] = Field(default_factory=list)
    pan_candidates: List[ExtractedEntityItem] = Field(default_factory=list)
    udyam_candidates: List[ExtractedEntityItem] = Field(default_factory=list)
    legal_name_candidates: List[ExtractedEntityItem] = Field(default_factory=list)
    oem_name_candidates: List[ExtractedEntityItem] = Field(default_factory=list)
    maf_number_candidates: List[ExtractedEntityItem] = Field(default_factory=list)
    tender_ref_candidates: List[ExtractedEntityItem] = Field(default_factory=list)
    date_candidates: List[ExtractedEntityItem] = Field(default_factory=list)


# ==============================================
# Configurable Scoring Policy
# ==============================================

class ScoringPolicy(BaseModel):
    """
    Configurable review-priority scoring policy.
    Decouples deduction weights and risk thresholds from verification logic,
    allowing procurement authorities to configure tender evaluation priorities.
    """
    starting_score: int = Field(default=100, ge=1, le=1000, description="Baseline starting score")

    # Statutory Deductions
    gstin_format_penalty: int = Field(default=20, ge=0, description="Deduction for malformed GSTIN format")
    gstin_checksum_penalty: int = Field(default=15, ge=0, description="Deduction for corrupted GSTIN Luhn Mod-36 checksum")
    gstin_suspended_penalty: int = Field(default=30, ge=0, description="Deduction for suspended taxpayer status")
    gstin_cancelled_penalty: int = Field(default=35, ge=0, description="Deduction for cancelled taxpayer status")
    pan_format_penalty: int = Field(default=15, ge=0, description="Deduction for malformed PAN format")
    oem_expired_penalty: int = Field(default=25, ge=0, description="Deduction for expired Manufacturer Authorization Form (MAF)")

    # Relational Consistency Deductions (Rules R-01 to R-07)
    r01_pan_gstin_mismatch_penalty: int = Field(default=25, ge=0, description="Deduction for PAN ↔ GSTIN embedded mismatch")
    r02_legal_name_high_mismatch_penalty: int = Field(default=15, ge=0, description="Deduction for major legal name mismatch (<60%)")
    r02_legal_name_med_mismatch_penalty: int = Field(default=5, ge=0, description="Deduction for partial legal name mismatch (60-79%)")
    r03_bidder_oem_mismatch_penalty: int = Field(default=20, ge=0, description="Deduction for Bidder ↔ OEM partner mismatch")
    r04_tender_ref_mismatch_penalty: int = Field(default=10, ge=0, description="Deduction for MAF ↔ Tender reference mismatch")
    r05_maf_date_invalid_penalty: int = Field(default=25, ge=0, description="Deduction for MAF date window invalidity/expiry")
    r06_udyam_entity_incompatibility_penalty: int = Field(default=10, ge=0, description="Deduction for Udyam org type ↔ PAN entity conflict")
    r07_state_alignment_penalty: int = Field(default=0, ge=0, description="Deduction for state jurisdiction difference (Warning/Review only)")

    # Risk Thresholds
    low_risk_min_score: int = Field(default=85, ge=0, description="Minimum score to qualify for LOW_RISK tier")
    medium_risk_min_score: int = Field(default=60, ge=0, description="Minimum score to qualify for MEDIUM_RISK tier")

    # Risk Guidance Messages
    low_risk_guidance: str = Field(
        default="Low compliance risk detected; proceed to standard tender evaluation workflow.",
        description="Advisory guidance for LOW_RISK review queue",
    )
    medium_risk_guidance: str = Field(
        default="Moderate compliance risk or policy warnings detected; manual officer review recommended.",
        description="Advisory guidance for MEDIUM_RISK review queue",
    )
    high_risk_guidance: str = Field(
        default="Significant compliance risk or statutory inconsistency detected; manual officer review required.",
        description="Advisory guidance for HIGH_RISK review queue",
    )


class CompositeVerificationResponse(BaseModel):
    """Complete composite compliance intelligence report."""
    verification_id: str = Field(..., description="Unique generated verification session ID")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), description="UTC timestamp of analysis"
    )
    overall_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Decision-support Review Priority / Compliance Risk Score (0 - 100). Higher score indicates lower compliance risk.",
    )
    risk_level: RiskLevel = Field(..., description="Decision-support risk category")
    risk_level_guidance: str = Field(..., description="Decision-support advisory statement")
    overall_status: CompositeStatus = Field(..., description="Overall compliance verdict")
    extracted_entities: ExtractedEntitiesSummary = Field(..., description="Summary of entities extracted from documents")
    statutory_verifications: StatutoryVerificationsBundle = Field(..., description="Individual statutory verification outputs")
    consistency_checks: List[CrossConsistencyCheckResult] = Field(..., description="Cross-entity consistency rule evaluations")
    score_breakdown: List[ScoreContribution] = Field(..., description="Itemized explainable score deductions")
    findings: List[ComplianceFinding] = Field(..., description="Actionable findings with evidence citations")
    evidence_audit_trail: List[EvidenceItem] = Field(..., description="Complete traceable evidence audit trail")
    is_live_government_source: bool = Field(
        default=False, description="Always False for mock/sandbox provider; True only for live govt integrations"
    )
    disclaimer: str = Field(default=MOCK_REGISTRY_DISCLAIMER, description="Mandatory transparency disclaimer")
