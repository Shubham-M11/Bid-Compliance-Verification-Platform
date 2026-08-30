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
      // Ensure we don't cache health checks
      cache: "no-store",
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

export { API_BASE_URL };
