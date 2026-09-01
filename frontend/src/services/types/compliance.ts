/**
 * Compliance Intelligence TypeScript Type Definitions
 * Exact frontend mapping of backend schemas in composite.py and statutory.py.
 */

import { DocumentUploadResponse } from "../api";

export type RiskLevel = "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK";

export type CompositeStatus =
  | "COMPLIANT"
  | "CONDITIONAL_COMPLIANCE"
  | "NON_COMPLIANT"
  | "REVIEW_REQUIRED";

export type FindingSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type CheckStatus =
  | "PASS"
  | "FAIL"
  | "WARNING"
  | "REVIEW_REQUIRED"
  | "NOT_APPLICABLE";

export type EntityType =
  | "GSTIN"
  | "PAN"
  | "UDYAM"
  | "LEGAL_NAME"
  | "OEM_NAME"
  | "MAF_NUMBER"
  | "TENDER_REF"
  | "DATE"
  | "OTHER";

export type EntitySource = "DOCUMENT_EXTRACTED" | "USER_SUPPLIED";

export type VerificationSource =
  | "deterministic_only"
  | "mock_registry"
  | "sandbox"
  | "live_external";

export type ValidationStatus =
  | "VALID"
  | "INVALID_FORMAT"
  | "INVALID_CHECKSUM"
  | "INVALID_STATE_CODE"
  | "EXPIRED"
  | "RECORD_NOT_FOUND"
  | "MISMATCH"
  | "UNVERIFIED";

export type TaxpayerStatus =
  | "ACTIVE"
  | "CANCELLED"
  | "SUSPENDED"
  | "INACTIVE"
  | "UNKNOWN";

export type PANEntityType =
  | "COMPANY"
  | "INDIVIDUAL"
  | "HUF"
  | "PARTNERSHIP_FIRM_LLP"
  | "AOP"
  | "TRUST"
  | "BOI"
  | "LOCAL_AUTHORITY"
  | "ARTIFICIAL_JURIDICAL_PERSON"
  | "GOVERNMENT"
  | "UNKNOWN";

export type EnterpriseType = "MICRO" | "SMALL" | "MEDIUM" | "UNKNOWN";

export type EnterpriseMajorActivity =
  | "MANUFACTURING"
  | "SERVICES"
  | "TRADING"
  | "UNKNOWN";

// ==========================================
// Extracted Entities & Traceable Evidence
// ==========================================

export interface ExtractedEntityItem {
  entity_type: EntityType;
  value: string;
  raw_match: string;
  document_id: string;
  filename: string;
  page_number: number;
  confidence: number;
  context_snippet: string;
  source_type: EntitySource;
  extraction_method: string;
  is_candidate_only: boolean;
}

export interface ExtractedEntitiesSummary {
  gstin_candidates: ExtractedEntityItem[];
  pan_candidates: ExtractedEntityItem[];
  udyam_candidates: ExtractedEntityItem[];
  legal_name_candidates: ExtractedEntityItem[];
  oem_name_candidates: ExtractedEntityItem[];
  maf_number_candidates: ExtractedEntityItem[];
  tender_ref_candidates: ExtractedEntityItem[];
  date_candidates: ExtractedEntityItem[];
}

export interface EvidenceItem {
  evidence_id: string;
  rule_id: string;
  field_name: string;
  extracted_value?: string | null;
  comparison_value?: string | null;
  document_id?: string | null;
  filename?: string | null;
  page_number?: number | null;
  context_snippet?: string | null;
  source_type: EntitySource;
  finding_description: string;
}

// ==========================================
// Cross-Consistency & Scoring Models
// ==========================================

export interface CrossConsistencyCheckResult {
  rule_id: string;
  rule_name: string;
  category: string;
  status: CheckStatus;
  severity: FindingSeverity;
  summary: string;
  details: Record<string, unknown>;
  evidence: EvidenceItem[];
}

export interface ScoreContribution {
  rule_id: string;
  rule_category: string;
  title: string;
  points_change: number;
  reason: string;
  severity: FindingSeverity;
  is_primary_penalty: boolean;
}

export interface ComplianceFinding {
  finding_id: string;
  rule_id: string;
  severity: FindingSeverity;
  title: string;
  description: string;
  remediation_guidance: string;
  linked_evidence: EvidenceItem[];
}

export interface BidMetadata {
  tender_ref_number?: string | null;
  expected_bidder_name?: string | null;
  bid_submission_date?: string | null;
  tender_state_code?: string | null;
}

export interface ScoringPolicy {
  starting_score?: number;
  gstin_format_penalty?: number;
  gstin_checksum_penalty?: number;
  gstin_suspended_penalty?: number;
  gstin_cancelled_penalty?: number;
  pan_format_penalty?: number;
  oem_expired_penalty?: number;
  r01_pan_gstin_mismatch_penalty?: number;
  r02_legal_name_high_mismatch_penalty?: number;
  r02_legal_name_med_mismatch_penalty?: number;
  r03_bidder_oem_mismatch_penalty?: number;
  r04_tender_ref_mismatch_penalty?: number;
  r05_maf_date_invalid_penalty?: number;
  r06_udyam_entity_incompatibility_penalty?: number;
  r07_state_alignment_penalty?: number;
  low_risk_min_score?: number;
  medium_risk_min_score?: number;
  low_risk_guidance?: string;
  medium_risk_guidance?: string;
  high_risk_guidance?: string;
}

// ==========================================
// Statutory Request & Response Models
// ==========================================

export interface GSTINSegmentItem {
  segment_name: string;
  characters: string;
  position_range: string;
  is_valid: boolean;
  description: string;
}

export interface GSTINStructureBreakdown {
  state_segment: GSTINSegmentItem;
  pan_segment: GSTINSegmentItem;
  entity_segment: GSTINSegmentItem;
  constant_segment: GSTINSegmentItem;
  checksum_segment: GSTINSegmentItem;
}

export interface GSTINNormalizationDetails {
  raw_input: string;
  normalized_value: string;
  is_normalized: boolean;
  normalization_notes: string[];
}

export interface GSTINValidationRequest {
  gstin: string;
  expected_legal_name?: string | null;
  expected_state_code?: string | null;
}

export interface GSTINDeterministicResult {
  is_format_valid: boolean;
  state_code?: string | null;
  state_name?: string | null;
  is_state_code_valid: boolean;
  extracted_pan?: string | null;
  entity_type: PANEntityType;
  entity_number?: string | null;
  z_character?: string | null;
  checksum_char?: string | null;
  calculated_checksum?: string | null;
  is_checksum_valid: boolean;
  validation_errors: string[];
  structure_breakdown?: GSTINStructureBreakdown | null;
  normalization?: GSTINNormalizationDetails | null;
}

export interface GSTINRegistryRecord {
  legal_name: string;
  trade_name?: string | null;
  status: TaxpayerStatus;
  taxpayer_type: string;
  registration_date?: string | null;
  principal_place_of_business?: string | null;
  state?: string | null;
  is_filing_up_to_date: boolean;
  last_updated?: string | null;
  is_composition_dealer?: boolean;
  composition_advisory_note?: string | null;
  filing_status_summary?: string | null;
}

export interface GSTINRegistryResult {
  registry_found: boolean;
  source: VerificationSource;
  record?: GSTINRegistryRecord | null;
  status_message: string;
}

export interface GSTINValidationResponse {
  gstin: string;
  deterministic: GSTINDeterministicResult;
  registry: GSTINRegistryResult;
  name_match_status?: string | null;
  overall_status: ValidationStatus;
  is_live_government_source: boolean;
  disclaimer: string;
}

export interface PANSegmentItem {
  segment_name: string;
  characters: string;
  position_range: string;
  is_valid: boolean;
  description: string;
}

export interface PANStructureBreakdown {
  series_segment: PANSegmentItem;
  entity_segment: PANSegmentItem;
  name_initial_segment: PANSegmentItem;
  sequential_segment: PANSegmentItem;
  suffix_segment: PANSegmentItem;
}

export interface PANNormalizationDetails {
  raw_input: string;
  normalized_value: string;
  is_normalized: boolean;
  normalization_notes: string[];
}

export interface PANValidationRequest {
  pan: string;
  expected_legal_name?: string | null;
}

export interface PANDeterministicResult {
  is_format_valid: boolean;
  entity_type_code?: string | null;
  entity_type: PANEntityType;
  entity_type_label?: string | null;
  fifth_character?: string | null;
  name_consistency_signal?: string | null;
  name_consistency_note?: string | null;
  validation_errors: string[];
  structure_breakdown?: PANStructureBreakdown | null;
  normalization?: PANNormalizationDetails | null;
}

export interface PANRegistryRecord {
  full_name: string;
  pan_status: string;
  entity_type: PANEntityType;
  aadhaar_seeding_status?: string | null;
  category: string;
  last_updated?: string | null;
}

export interface PANRegistryResult {
  registry_found: boolean;
  source: VerificationSource;
  record?: PANRegistryRecord | null;
  status_message: string;
}

export interface PANValidationResponse {
  pan: string;
  deterministic: PANDeterministicResult;
  registry: PANRegistryResult;
  name_match_status?: string | null;
  overall_status: ValidationStatus;
  is_live_government_source: boolean;
  disclaimer: string;
}

export interface UdyamSegmentItem {
  segment_name: string;
  characters: string;
  position_range: string;
  is_valid: boolean;
  description: string;
}

export interface UdyamStructureBreakdown {
  prefix_segment: UdyamSegmentItem;
  state_segment: UdyamSegmentItem;
  district_segment: UdyamSegmentItem;
  serial_segment: UdyamSegmentItem;
}

export interface UdyamNormalizationDetails {
  raw_input: string;
  normalized_value: string;
  is_normalized: boolean;
  normalization_notes: string[];
}

export interface UdyamValidationRequest {
  udyam_registration_number: string;
  expected_enterprise_name?: string | null;
}

export interface MSMEPolicyAdvisory {
  emd_exemption_eligible: boolean;
  emd_exemption_advisory?: string | null;
  prior_experience_turnover_relaxation_eligible: boolean;
  prior_experience_advisory?: string | null;
  purchase_preference_eligible: boolean;
  purchase_preference_advisory?: string | null;
  disclaimer?: string;
}

export interface UdyamDeterministicResult {
  is_format_valid: boolean;
  state_code?: string | null;
  state_name?: string | null;
  district_code?: string | null;
  sequential_id?: string | null;
  validation_errors: string[];
  structure_breakdown?: UdyamStructureBreakdown | null;
  normalization?: UdyamNormalizationDetails | null;
}

export interface UdyamRegistryRecord {
  enterprise_name: string;
  enterprise_tier: EnterpriseType;
  major_activity: EnterpriseMajorActivity;
  nic_codes: string[];
  dic_name?: string | null;
  date_of_registration?: string | null;
  date_of_incorporation?: string | null;
  organization_type?: string | null;
  state?: string | null;
  advisory_benefits: MSMEPolicyAdvisory;
}

export interface UdyamRegistryResult {
  registry_found: boolean;
  source: VerificationSource;
  record?: UdyamRegistryRecord | null;
  status_message: string;
}

export interface UdyamValidationResponse {
  udyam_registration_number: string;
  deterministic: UdyamDeterministicResult;
  registry: UdyamRegistryResult;
  overall_status: ValidationStatus;
  is_live_government_source: boolean;
  disclaimer: string;
}

export interface OEMValidationRequest {
  oem_name: string;
  authorized_partner_name: string;
  maf_number?: string | null;
  tender_ref_number?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  scope_of_authorization?: string | null;
  signatory_name?: string | null;
  signatory_designation?: string | null;
  signatory_email?: string | null;
  bid_submission_date?: string | null;
}

export interface OEMDeterministicResult {
  is_oem_name_provided: boolean;
  is_partner_name_provided: boolean;
  is_maf_number_provided: boolean;
  is_tender_ref_provided: boolean;
  is_date_range_valid: boolean;
  is_expired: boolean;
  is_valid_on_bid_date: boolean;
  days_until_expiry?: number | null;
  validation_errors: string[];
}

export interface OEMRegistryRecord {
  oem_name: string;
  authorized_partner_name: string;
  maf_number: string;
  is_officially_recognized_oem: boolean;
  is_partner_in_oem_database: boolean;
  authorization_status: string;
  product_categories: string[];
  notes?: string | null;
}

export interface OEMRegistryResult {
  registry_found: boolean;
  source: VerificationSource;
  record?: OEMRegistryRecord | null;
  status_message: string;
}

export interface OEMValidationResponse {
  oem_name: string;
  authorized_partner_name: string;
  maf_number?: string | null;
  deterministic: OEMDeterministicResult;
  registry: OEMRegistryResult;
  overall_status: ValidationStatus;
  is_live_government_source: boolean;
  disclaimer?: string;
}

export interface StatutoryVerificationsBundle {
  gstin?: GSTINValidationResponse | null;
  pan?: PANValidationResponse | null;
  udyam?: UdyamValidationResponse | null;
  oem?: OEMValidationResponse | null;
}

// ==========================================
// Preset Scenarios
// ==========================================

export interface PresetComplianceScenario {
  id: string;
  name: string;
  category: string;
  description: string;
  gstin_request?: GSTINValidationRequest | null;
  pan_request?: PANValidationRequest | null;
  udyam_request?: UdyamValidationRequest | null;
  oem_request?: OEMValidationRequest | null;
}

// ==========================================
// Master Composite Verification Request/Response
// ==========================================

export interface CompositeVerificationRequest {
  documents?: DocumentUploadResponse[] | null;
  explicit_gstin?: GSTINValidationRequest | null;
  explicit_pan?: PANValidationRequest | null;
  explicit_udyam?: UdyamValidationRequest | null;
  explicit_oem?: OEMValidationRequest | null;
  bid_metadata?: BidMetadata | null;
  scoring_policy?: ScoringPolicy | null;
}

export interface CompositeVerificationResponse {
  verification_id: string;
  timestamp: string;
  overall_score: number;
  risk_level: RiskLevel;
  risk_level_guidance: string;
  overall_status: CompositeStatus;
  extracted_entities: ExtractedEntitiesSummary;
  statutory_verifications: StatutoryVerificationsBundle;
  consistency_checks: CrossConsistencyCheckResult[];
  score_breakdown: ScoreContribution[];
  findings: ComplianceFinding[];
  evidence_audit_trail: EvidenceItem[];
  is_live_government_source: boolean;
  disclaimer: string;
}
