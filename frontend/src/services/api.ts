/**
 * API Service Abstraction
 * Handles communication between the Next.js frontend and the FastAPI backend.
 */

import type {
  CompositeVerificationRequest,
  CompositeVerificationResponse,
  ExtractedEntitiesSummary,
  GSTINValidationRequest,
  GSTINValidationResponse,
  OEMValidationRequest,
  OEMValidationResponse,
  OfficerDecisionRequest,
  OfficerDecisionResponse,
  PANValidationRequest,
  PANValidationResponse,
  PresetComplianceScenario,
  SampleBidMetadata,
  ScoringPolicy,
  UdyamValidationRequest,
  UdyamValidationResponse,
} from "./types/compliance";

export interface HealthResponse {
  status: string;
  app_name: string;
  version: string;
  environment: string;
  ocr_available?: boolean;
  ocr_engine?: string;
  timestamp: string;
}

export type ExtractionMethod = "digital" | "ocr" | "ocr_unavailable";

export type DocumentProcessingStatus =
  | "processed"
  | "ocr_processed"
  | "no_text_detected"
  | "failed";

export interface PageTextEvidence {
  page_number: number;
  text: string;
  character_count: number;
  has_text: boolean;
  extraction_method?: ExtractionMethod;
  ocr_confidence?: number | null;
}

export interface DocumentUploadResponse {
  document_id: string;
  filename: string;
  content_type: string;
  file_size: number;
  page_count: number;
  status: DocumentProcessingStatus;
  pages: PageTextEvidence[];
  message?: string;
  created_at: string;
}

export interface ApiError {
  message: string;
  status?: number;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bid-compliance-verification-platform.onrender.com";

/**
 * Format network / connection errors into helpful actionable messages
 */
function formatNetworkError(error: unknown, defaultMessage: string): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("econnrefused") ||
      msg.includes("load failed") ||
      msg.includes("aborted")
    ) {
      return `Backend service unavailable (${API_BASE_URL}). If using Render free tier, please allow 30-50s for server cold start.`;
    }
    return error.message;
  }
  return defaultMessage;
}

/**
 * Fetch the health status of the backend service.
 * Calls GET /api/health
 */
export async function getHealthStatus(): Promise<HealthResponse> {
  const url = `${API_BASE_URL}/api/health`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data: HealthResponse = await res.json();
    return data;
  } catch (error: unknown) {
    throw new Error(formatNetworkError(error, "Failed to connect to backend service"));
  }
}

/**
 * Upload a PDF document and extract page-by-page text evidence.
 * Calls POST /api/v1/documents/upload
 */
export async function uploadDocument(file: File): Promise<DocumentUploadResponse> {
  const url = `${API_BASE_URL}/api/v1/documents/upload`;
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      const errorDetail = data?.detail || `HTTP ${res.status}: ${res.statusText}`;
      throw new Error(errorDetail);
    }

    return data as DocumentUploadResponse;
  } catch (error: unknown) {
    throw new Error(formatNetworkError(error, "Failed to upload document"));
  }
}

/**
 * Extract candidate statutory and tender entities from document evidence.
 * Calls POST /api/v1/compliance/extract-entities
 */
export async function extractEntitiesFromDocuments(
  documents: DocumentUploadResponse[]
): Promise<ExtractedEntitiesSummary> {
  const url = `${API_BASE_URL}/api/v1/compliance/extract-entities`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(documents),
    });

    const data = await res.json();
    if (!res.ok) {
      const errorDetail = data?.detail || `HTTP ${res.status}: ${res.statusText}`;
      throw new Error(errorDetail);
    }
    return data as ExtractedEntitiesSummary;
  } catch (error: unknown) {
    throw new Error(formatNetworkError(error, "Failed to extract statutory entities from document"));
  }
}

/**
 * Execute full composite compliance verification & risk assessment.
 * Calls POST /api/v1/compliance/verify
 */
export async function verifyCompliance(
  request: CompositeVerificationRequest
): Promise<CompositeVerificationResponse> {
  const url = `${API_BASE_URL}/api/v1/compliance/verify`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(request),
    });

    const data = await res.json();

    if (!res.ok) {
      const errorDetail =
        data?.detail || `HTTP ${res.status}: ${res.statusText}`;
      throw new Error(errorDetail);
    }

    return data as CompositeVerificationResponse;
  } catch (error: unknown) {
    throw new Error(
      formatNetworkError(error, "Failed to execute compliance verification")
    );
  }
}

/**
 * Retrieve curated demonstration presets.
 * Calls GET /api/v1/statutory/presets
 */
export async function getCompliancePresets(): Promise<
  PresetComplianceScenario[]
> {
  const url = `${API_BASE_URL}/api/v1/statutory/presets`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      const errorDetail =
        data?.detail || `HTTP ${res.status}: ${res.statusText}`;
      throw new Error(errorDetail);
    }

    return data as PresetComplianceScenario[];
  } catch (error: unknown) {
    throw new Error(
      formatNetworkError(error, "Failed to load compliance presets")
    );
  }
}

/**
 * Validate GSTIN and query registry.
 * Calls POST /api/v1/statutory/gstin/verify (or /api/v1/gst/verify)
 */
export async function verifyGSTIN(
  request: GSTINValidationRequest
): Promise<GSTINValidationResponse> {
  const url = `${API_BASE_URL}/api/v1/statutory/gstin/verify`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
    return data as GSTINValidationResponse;
  } catch (error: unknown) {
    throw new Error(formatNetworkError(error, "Failed to verify GSTIN"));
  }
}

/**
 * Deterministically analyze 5-part character structure of GSTIN.
 * Calls POST /api/v1/gst/analyze-structure
 */
export async function analyzeGSTINStructure(
  gstin: string,
  expectedStateCode?: string
) {
  const url = `${API_BASE_URL}/api/v1/gst/analyze-structure`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gstin,
        expected_state_code: expectedStateCode || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
    return data;
  } catch (error: unknown) {
    throw new Error(formatNetworkError(error, "Failed to analyze GSTIN structure"));
  }
}

/**
 * Retrieve reference list of official Indian State and UT codes.
 * Calls GET /api/v1/gst/state-codes
 */
export async function getGSTStateCodes(): Promise<
  Array<{ state_code: string; state_name: string }>
> {
  const url = `${API_BASE_URL}/api/v1/gst/state-codes`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
    return data;
  } catch (error: unknown) {
    throw new Error(formatNetworkError(error, "Failed to fetch state codes"));
  }
}

/**
 * Validate PAN and evaluate entity type.
 * Calls POST /api/v1/statutory/pan/verify (or /api/v1/pan/verify)
 */
export async function verifyPAN(
  request: PANValidationRequest
): Promise<PANValidationResponse> {
  const url = `${API_BASE_URL}/api/v1/statutory/pan/verify`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
    return data as PANValidationResponse;
  } catch (error: unknown) {
    throw new Error(formatNetworkError(error, "Failed to verify PAN"));
  }
}

/**
 * Deterministically analyze 5-part character structure and entity classification of PAN.
 * Calls POST /api/v1/pan/analyze-structure
 */
export async function analyzePANStructure(
  pan: string,
  expectedLegalName?: string
) {
  const url = `${API_BASE_URL}/api/v1/pan/analyze-structure`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pan,
        expected_legal_name: expectedLegalName || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
    return data;
  } catch (error: unknown) {
    throw new Error(formatNetworkError(error, "Failed to analyze PAN structure"));
  }
}

/**
 * Retrieve reference list of Indian PAN entity classifications.
 * Calls GET /api/v1/pan/entity-types
 */
export async function getPANEntityTypes(): Promise<
  Array<{ code: string; enum_key: string; description: string }>
> {
  const url = `${API_BASE_URL}/api/v1/pan/entity-types`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
    return data;
  } catch (error: unknown) {
    throw new Error(formatNetworkError(error, "Failed to fetch PAN entity types"));
  }
}

/**
 * Validate Udyam MSME and retrieve policy advisories.
 * Calls POST /api/v1/statutory/udyam/verify (or /api/v1/udyam/verify)
 */
export async function verifyUdyam(
  request: UdyamValidationRequest
): Promise<UdyamValidationResponse> {
  const url = `${API_BASE_URL}/api/v1/statutory/udyam/verify`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
    return data as UdyamValidationResponse;
  } catch (error: unknown) {
    throw new Error(formatNetworkError(error, "Failed to verify Udyam"));
  }
}

/**
 * Deterministically analyze 4-part segment structure of Udyam registration number.
 * Calls POST /api/v1/udyam/analyze-structure
 */
export async function analyzeUdyamStructure(
  udyamRegistrationNumber: string
) {
  const url = `${API_BASE_URL}/api/v1/udyam/analyze-structure`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        udyam_registration_number: udyamRegistrationNumber,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
    return data;
  } catch (error: unknown) {
    throw new Error(formatNetworkError(error, "Failed to analyze Udyam structure"));
  }
}

/**
 * Retrieve reference list of 2-letter Udyam State and UT codes.
 * Calls GET /api/v1/udyam/state-codes
 */
export async function getUdyamStateCodes(): Promise<
  Array<{ state_code: string; state_name: string }>
> {
  const url = `${API_BASE_URL}/api/v1/udyam/state-codes`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
    return data;
  } catch (error: unknown) {
    throw new Error(formatNetworkError(error, "Failed to fetch Udyam state codes"));
  }
}

/**
 * Validate OEM MAF metadata and partner standing.
 * Calls POST /api/v1/statutory/oem/verify (or /api/v1/oem/verify)
 */
export async function verifyOEM(
  request: OEMValidationRequest
): Promise<OEMValidationResponse> {
  const url = `${API_BASE_URL}/api/v1/statutory/oem/verify`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
    return data as OEMValidationResponse;
  } catch (error: unknown) {
    throw new Error(formatNetworkError(error, "Failed to verify OEM authorization"));
  }
}

/**
 * Deterministically analyze 6-part metadata structure and temporal validity of OEM MAF.
 * Calls POST /api/v1/oem/analyze-structure
 */
export async function analyzeOEMStructure(
  request: {
    oem_name: string;
    authorized_partner_name: string;
    maf_number?: string | null;
    tender_ref_number?: string | null;
    valid_from?: string | null;
    valid_until?: string | null;
    bid_submission_date?: string | null;
    scope_of_authorization?: string | null;
    signatory_name?: string | null;
    signatory_designation?: string | null;
  }
) {
  const url = `${API_BASE_URL}/api/v1/oem/analyze-structure`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
    return data;
  } catch (error: unknown) {
    throw new Error(formatNetworkError(error, "Failed to analyze OEM MAF structure"));
  }
}

/**
 * Retrieve reference list of recognized OEMs in the database.
 * Calls GET /api/v1/oem/manufacturers
 */
export async function getOEMManufacturers(): Promise<
  Array<{
    oem_name: string;
    program_name: string;
    supported_product_lines: string[];
    active_partners_count: number;
  }>
> {
  const url = `${API_BASE_URL}/api/v1/oem/manufacturers`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
    return data;
  } catch (error: unknown) {
    throw new Error(formatNetworkError(error, "Failed to fetch OEM manufacturers"));
  }
}

/**
 * Retrieve active platform review-priority scoring policy.
 * Calls GET /api/v1/scoring/policy
 */
export async function getScoringPolicy(): Promise<ScoringPolicy> {
  const url = `${API_BASE_URL}/api/v1/scoring/policy`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
    return data as ScoringPolicy;
  } catch (error: unknown) {
    throw new Error(formatNetworkError(error, "Failed to fetch scoring policy"));
  }
}

/**
 * Record human procurement officer review decision.
 * Calls POST /api/v1/review/decision
 */
export async function recordOfficerDecision(
  request: OfficerDecisionRequest
): Promise<OfficerDecisionResponse> {
  const url = `${API_BASE_URL}/api/v1/review/decision`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
    return data as OfficerDecisionResponse;
  } catch (error: unknown) {
    throw new Error(formatNetworkError(error, "Failed to record officer decision"));
  }
}

/**
 * Upload PDF and execute end-to-end composite verification.
 * Calls POST /api/v1/compliance/verify-document
 */
export async function verifyDocument(
  file: File,
  expectedBidderName?: string,
  tenderRefNumber?: string
): Promise<CompositeVerificationResponse> {
  const url = `${API_BASE_URL}/api/v1/compliance/verify-document`;
  const formData = new FormData();
  formData.append("file", file);
  if (expectedBidderName) {
    formData.append("expected_bidder_name", expectedBidderName);
  }
  if (tenderRefNumber) {
    formData.append("tender_ref_number", tenderRefNumber);
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      const errorDetail =
        data?.detail || `HTTP ${res.status}: ${res.statusText}`;
      throw new Error(errorDetail);
    }

    return data as CompositeVerificationResponse;
  } catch (error: unknown) {
    throw new Error(formatNetworkError(error, "Failed to verify document"));
  }
}

/**
 * Retrieve list of pre-configured sample bid PDF scenarios.
 * Calls GET /api/v1/compliance/sample-bids
 */
export async function getSampleBids(): Promise<SampleBidMetadata[]> {
  const url = `${API_BASE_URL}/api/v1/compliance/sample-bids`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
    return data as SampleBidMetadata[];
  } catch (error: unknown) {
    throw new Error(formatNetworkError(error, "Failed to fetch sample bids"));
  }
}

/**
 * Execute end-to-end verification on a pre-loaded sample bid PDF.
 * Calls POST /api/v1/compliance/verify-sample/{sample_id}
 */
export async function verifySampleBid(
  sampleId: string
): Promise<CompositeVerificationResponse> {
  const url = `${API_BASE_URL}/api/v1/compliance/verify-sample/${encodeURIComponent(sampleId)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
    return data as CompositeVerificationResponse;
  } catch (error: unknown) {
    throw new Error(formatNetworkError(error, `Failed to verify sample bid '${sampleId}'`));
  }
}

export { API_BASE_URL };

