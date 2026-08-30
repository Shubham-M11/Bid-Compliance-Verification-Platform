"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Server,
} from "lucide-react";
import { API_BASE_URL, getHealthStatus, HealthResponse } from "@/services/api";

export default function HealthStatusCard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHealthStatus();
      setHealth(data);
      setLastChecked(new Date());
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Unable to reach backend service";
      setError(errorMsg);
      setHealth(null);
      setLastChecked(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1rem",
        }}
      >
        <div>
          <div className="section-title" style={{ marginBottom: "0.25rem" }}>
            <Server size={20} color="var(--accent-blue)" />
            Backend System Health
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Real-time async connectivity with FastAPI service
          </p>
        </div>

        {/* Status Badge */}
        {loading ? (
          <span className="badge badge-neutral">
            <span className="status-dot status-dot-amber" /> Checking...
          </span>
        ) : error ? (
          <span className="badge badge-danger">
            <span className="status-dot status-dot-red" /> Backend Offline
          </span>
        ) : (
          <span className="badge badge-success">
            <span className="status-dot status-dot-green" /> Backend Status: Online
          </span>
        )}
      </div>

      {/* Main Status Display */}
      {loading && !health && (
        <div
          style={{
            padding: "2rem 1rem",
            textAlign: "center",
            color: "var(--text-secondary)",
          }}
        >
          <RefreshCw
            size={24}
            style={{
              animation: "spin 1s linear infinite",
              marginBottom: "0.5rem",
              display: "inline-block",
            }}
          />
          <p style={{ fontSize: "0.875rem" }}>
            Connecting to <code>{API_BASE_URL}/api/health</code>...
          </p>
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            padding: "1rem",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "var(--radius-sm)",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#f87171",
              fontWeight: 600,
              fontSize: "0.875rem",
              marginBottom: "0.4rem",
            }}
          >
            <AlertTriangle size={16} /> Connection Failed
          </div>
          <p style={{ fontSize: "0.8rem", color: "#fca5a5" }}>{error}</p>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              marginTop: "0.5rem",
            }}
          >
            Verify that FastAPI is running on <code>http://localhost:8000</code>.
          </p>
        </div>
      )}

      {health && (
        <div className="meta-list">
          <div className="meta-item">
            <span className="meta-label">App Name</span>
            <span className="meta-value">{health.app_name}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">API Version</span>
            <span className="meta-value">{health.version}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Environment</span>
            <span className="meta-value">{health.environment}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Server Timestamp</span>
            <span className="meta-value">
              {new Date(health.timestamp).toLocaleTimeString()} UTC
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Endpoint URL</span>
            <span className="meta-value">{API_BASE_URL}/api/health</span>
          </div>
        </div>
      )}

      {/* Action Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "1.25rem",
          paddingTop: "1rem",
          borderTop: "1px solid var(--border-color)",
        }}
      >
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
          }}
        >
          <Clock size={12} />
          {lastChecked
            ? `Checked: ${lastChecked.toLocaleTimeString()}`
            : "Not checked yet"}
        </span>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <a
            href={`${API_BASE_URL}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
            style={{ padding: "0.45rem 0.75rem", fontSize: "0.8rem" }}
          >
            <ExternalLink size={14} /> FastAPI Docs
          </a>

          <button
            onClick={checkHealth}
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: "0.45rem 0.85rem", fontSize: "0.8rem" }}
          >
            <RefreshCw
              size={14}
              style={{
                animation: loading ? "spin 1s linear infinite" : "none",
              }}
            />
            {error ? "Retry Connection" : "Refresh Status"}
          </button>
        </div>
      </div>
    </div>
  );
}
