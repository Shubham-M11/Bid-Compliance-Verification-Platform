"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  ExternalLink,
  Info,
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
        err instanceof Error ? err.message : "Unable to reach backend verification service";
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
                System Status & Environment Information
              </h3>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Operational status of verification services, document extraction pipeline, and OCR subsystems.
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
              background: "var(--bg-app)",
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
                Compliance Verification Service Status
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
                    <CheckCircle2 size={11} /> Operational ({health?.status || "OK"})
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
                  marginBottom: "0.85rem",
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
                fontSize: "0.8rem",
              }}
            >
              <div style={{ color: "var(--text-secondary)" }}>
                Service Version:{" "}
                <strong style={{ color: "var(--text-primary)" }}>{health?.version || "1.0.0"}</strong>
              </div>
              <div style={{ color: "var(--text-secondary)" }}>
                Environment Mode:{" "}
                <strong style={{ color: "var(--text-primary)" }}>{health?.environment || "production"}</strong>
              </div>
              <div style={{ color: "var(--text-secondary)" }}>
                OCR Subsystem:{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {health?.ocr_available ? "Enabled & Available" : "Standard Fallback Active"}
                </strong>
              </div>
              <div style={{ color: "var(--text-secondary)" }}>
                Last Verified:{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {lastChecked ? lastChecked.toLocaleTimeString("en-IN") : "Never"}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="ent-btn ent-btn-secondary ent-btn-sm"
                onClick={checkHealth}
                disabled={loading}
              >
                <RefreshCw size={12} className={loading ? "spin" : ""} />
                <span>Refresh Status</span>
              </button>
            </div>
          </div>

          {/* Architecture & Provider Transparency Disclosure */}
          <div
            className="ent-card"
            style={{
              padding: "1.2rem",
              background: "var(--bg-app)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.65rem" }}>
              <Info size={16} color="var(--brand-blue)" />
              <h4 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Verification System Architecture & Data Policy
              </h4>
            </div>

            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
              The platform executes mathematical verification rules (such as ISO/IEC 7064 Mod-36 checksums), document text extraction, temporal validity windows, and entity cross-referencing. In this evaluation deployment, statutory checks reference deterministic validation rules and controlled test registries. All evaluations remain advisory to assist authorized procurement officers and evaluation committees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
