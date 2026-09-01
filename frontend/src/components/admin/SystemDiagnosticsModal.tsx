"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  ExternalLink,
  RefreshCw,
  Server,
  ShieldCheck,
  X,
} from "lucide-react";
import { API_BASE_URL, getHealthStatus, HealthResponse } from "@/services/api";

interface SystemDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SystemDiagnosticsModal({
  isOpen,
  onClose,
}: SystemDiagnosticsModalProps) {
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
    if (isOpen) {
      checkHealth();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="ent-modal-overlay" onClick={onClose}>
      <div
        className="ent-modal-content"
        style={{ maxWidth: "720px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: "1rem",
            borderBottom: "1px solid var(--border-subtle)",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Server size={18} color="var(--brand-blue)" />
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
                System Diagnostics & Technical Specifications
              </h3>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Backend service connectivity, OCR engine runtime, and deterministic verification architecture.
            </p>
          </div>
          <button
            type="button"
            className="ent-btn ent-btn-secondary ent-btn-sm"
            onClick={onClose}
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Health Summary Card */}
          <div
            className="ent-card"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              padding: "1.2rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.85rem",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                Backend REST API Connectivity
              </div>
              <div>
                {loading ? (
                  <span className="ent-badge ent-badge-neutral">
                    <RefreshCw size={11} className="spin" /> Checking...
                  </span>
                ) : error ? (
                  <span className="ent-badge ent-badge-critical">
                    <AlertTriangle size={11} /> Service Offline
                  </span>
                ) : (
                  <span className="ent-badge ent-badge-success">
                    <CheckCircle2 size={11} /> Healthy ({health?.status || "OK"})
                  </span>
                )}
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: "0.75rem",
                  background: "var(--status-critical-surface)",
                  border: "1px solid var(--status-critical-border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--status-critical-text)",
                  fontSize: "0.8rem",
                  marginBottom: "0.75rem",
                }}
              >
                {error}
              </div>
            )}

            {health && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "0.65rem",
                  fontSize: "0.8rem",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>App Name</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{health.app_name}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>API Version</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{health.version}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Environment</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{health.environment}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>OCR Status</span>
                  <span style={{ fontWeight: 600, color: health.ocr_available ? "var(--status-success-text)" : "var(--status-warning-text)" }}>
                    {health.ocr_available ? "Tesseract OCR Active" : "Digital Parser (OCR Fallback)"}
                  </span>
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "1rem",
                paddingTop: "0.75rem",
                borderTop: "1px solid var(--border-subtle)",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
              }}
            >
              <span>
                {lastChecked ? `Checked: ${lastChecked.toLocaleTimeString()}` : "Pending check"}
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <a
                  href={`${API_BASE_URL}/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ent-btn ent-btn-secondary ent-btn-sm"
                >
                  <ExternalLink size={12} /> API Swagger Docs
                </a>
                <button
                  type="button"
                  className="ent-btn ent-btn-primary ent-btn-sm"
                  onClick={checkHealth}
                  disabled={loading}
                >
                  <RefreshCw size={12} className={loading ? "spin" : ""} /> Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Architecture Specifications */}
          <div
            className="ent-card"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              padding: "1.2rem",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: "0.75rem" }}>
              Deterministic Verification Principles
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <CheckCircle2 size={15} color="var(--status-success-text)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>Luhn Mod-36 Algorithmic Validation: </strong>
                  Offline mathematical validation for 15-character Indian GSTINs with zero API latency.
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <CheckCircle2 size={15} color="var(--status-success-text)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>Zero-Fabrication Policy: </strong>
                  Sandbox registries never invent fake names or penalize unregistered authentic credentials arbitrarily.
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <CheckCircle2 size={15} color="var(--status-success-text)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>Human Officer Authority Guardrail: </strong>
                  The system produces explainable priority scores for evaluation assistance; procurement awards require human officer sign-off.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "1.25rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <button
            type="button"
            className="ent-btn ent-btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
