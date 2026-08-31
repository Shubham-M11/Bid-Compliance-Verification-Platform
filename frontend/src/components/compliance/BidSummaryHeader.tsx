"use client";

import React from "react";
import {
  AlertTriangle,
  ArrowDown,
  Building2,
  CheckCircle2,
  FileText,
  Info,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type {
  CompositeStatus,
  RiskLevel,
} from "@/services/types/compliance";

interface BidSummaryHeaderProps {
  bidderName: string;
  tenderRefNumber: string;
  score: number;
  riskLevel: RiskLevel;
  riskGuidance: string;
  overallStatus: CompositeStatus;
  disclaimer: string;
  issueCount: number;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export default function BidSummaryHeader({
  bidderName,
  tenderRefNumber,
  score,
  riskLevel,
  riskGuidance,
  overallStatus,
  disclaimer,
  issueCount,
  onRefresh,
  isLoading = false,
}: BidSummaryHeaderProps) {
  const getStatusBadge = (status: CompositeStatus) => {
    switch (status) {
      case "COMPLIANT":
        return (
          <span className="ent-badge ent-badge-success">
            <CheckCircle2 size={13} /> COMPLIANT
          </span>
        );
      case "CONDITIONAL_COMPLIANCE":
        return (
          <span className="ent-badge ent-badge-warning">
            <AlertTriangle size={13} /> CONDITIONAL COMPLIANCE
          </span>
        );
      case "REVIEW_REQUIRED":
        return (
          <span className="ent-badge ent-badge-warning">
            <AlertTriangle size={13} /> REVIEW REQUIRED
          </span>
        );
      case "NON_COMPLIANT":
        return (
          <span className="ent-badge ent-badge-critical">
            <XCircle size={13} /> NON-COMPLIANT
          </span>
        );
      default:
        return <span className="ent-badge ent-badge-neutral">{status}</span>;
    }
  };

  const getRiskLabel = (risk: RiskLevel) => {
    switch (risk) {
      case "LOW_RISK":
        return "Low Compliance Risk";
      case "MEDIUM_RISK":
        return "Moderate Compliance Risk";
      case "HIGH_RISK":
        return "High Compliance Risk";
      default:
        return risk;
    }
  };

  const getRiskBadge = (risk: RiskLevel) => {
    switch (risk) {
      case "LOW_RISK":
        return (
          <span className="ent-badge ent-badge-success">
            <ShieldCheck size={13} /> {getRiskLabel(risk)}
          </span>
        );
      case "MEDIUM_RISK":
        return (
          <span className="ent-badge ent-badge-warning">
            <AlertTriangle size={13} /> {getRiskLabel(risk)}
          </span>
        );
      case "HIGH_RISK":
        return (
          <span className="ent-badge ent-badge-critical">
            <ShieldAlert size={13} /> {getRiskLabel(risk)}
          </span>
        );
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="ent-card" style={{ marginBottom: "1.5rem", borderLeft: "4px solid var(--brand-blue)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1.25rem",
          paddingBottom: "1.25rem",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {/* Bid Details */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <Building2 size={18} color="var(--brand-blue)" />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em" }}>
              {bidderName || "Bidder Submission"}
            </h2>
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <span>
              Tender: <strong style={{ color: "#cbd5e1" }}>{tenderRefNumber || "GEM/2026/B/890123"}</strong>
            </span>
            <span>•</span>
            <span>Evaluation Date: <strong style={{ color: "#cbd5e1" }}>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong></span>
          </div>
        </div>

        {/* Status & Priority Badge Group */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {getStatusBadge(overallStatus)}
          {getRiskBadge(riskLevel)}
          {onRefresh && (
            <button
              type="button"
              className="ent-btn ent-btn-secondary ent-btn-sm"
              onClick={onRefresh}
              disabled={isLoading}
              title="Re-run compliance evaluation"
            >
              <RefreshCw size={13} className={isLoading ? "spin" : ""} />
            </button>
          )}
        </div>
      </div>

      {/* Score & Evaluation Guidance */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          gap: "2rem",
          alignItems: "center",
          paddingTop: "1.25rem",
        }}
      >
        {/* Score Block */}
        <div style={{ borderRight: "1px solid var(--border-subtle)", paddingRight: "2rem" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" }}>
            Review Priority Score
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem", marginTop: "0.2rem" }}>
            <span
              style={{
                fontSize: "2.25rem",
                fontWeight: 800,
                color:
                  score >= 85
                    ? "var(--status-success-text)"
                    : score >= 60
                    ? "var(--status-warning-text)"
                    : "var(--status-critical-text)",
                lineHeight: 1,
              }}
            >
              {score}
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
              / 100
            </span>
          </div>
        </div>

        {/* Guidance Text */}
        <div>
          <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.25rem" }}>
            Officer Evaluation Guidance
          </div>
          <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
            {riskGuidance}
          </p>
        </div>

        {/* Jump Action Links */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="ent-btn ent-btn-secondary ent-btn-sm"
            onClick={() => scrollToSection("findings-section")}
          >
            <ArrowDown size={13} />
            {issueCount > 0 ? `Issues (${issueCount})` : "Findings"}
          </button>
          <button
            type="button"
            className="ent-btn ent-btn-secondary ent-btn-sm"
            onClick={() => scrollToSection("evidence-section")}
          >
            <FileText size={13} />
            Evidence
          </button>
        </div>
      </div>

      {/* Subtle Transparency Disclaimer */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.5rem",
          marginTop: "1.25rem",
          paddingTop: "0.85rem",
          borderTop: "1px solid var(--border-subtle)",
          fontSize: "0.76rem",
          color: "var(--text-muted)",
          lineHeight: 1.4,
        }}
      >
        <Info size={14} color="var(--brand-blue)" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div>
          <strong>Decision Support Notice: </strong>
          {disclaimer} This algorithmic priority score assists manual tender evaluation and does not constitute statutory qualification or disqualification.
        </div>
      </div>
    </div>
  );
}
