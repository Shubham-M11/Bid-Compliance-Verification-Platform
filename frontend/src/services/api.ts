/**
 * API Service Abstraction
 * Handles communication between the Next.js frontend and the FastAPI backend.
 */

import type {
  CompositeVerificationRequest,
  CompositeVerificationResponse,
  GSTINValidationRequest,
  GSTINValidationResponse,
  OEMValidationRequest,
  OEMValidationResponse,
  PANValidationRequest,
  PANValidationResponse,
  PresetComplianceScenario,
  UdyamValidationRequest,
  UdyamValidationResponse,
} from "./types/compliance";

export interface HealthResponse {
  status: string;
  app_name: string;
  version: string;
  environment: string;
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
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
      return "Backend service unavailable. Please ensure the backend server is running at http://localhost:8000.";
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
      signal: AbortSignal.timeout(6000),
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
 * Calls POST /api/v1/statutory/pan/verify
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
 * Validate Udyam MSME and retrieve policy advisories.
 * Calls POST /api/v1/statutory/udyam/verify
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
 * Validate OEM MAF metadata and partner standing.
 * Calls POST /api/v1/statutory/oem/verify
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

export { API_BASE_URL };
