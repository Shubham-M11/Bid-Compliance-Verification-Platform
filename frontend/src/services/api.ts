/**
 * API Service Abstraction
 * Handles communication between the Next.js frontend and the FastAPI backend.
 */

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
    const errorMessage =
      error instanceof Error ? error.message : "Failed to connect to backend service";
    throw new Error(errorMessage);
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
    const errorMessage =
      error instanceof Error ? error.message : "Failed to upload document";
    throw new Error(errorMessage);
  }
}

export { API_BASE_URL };
