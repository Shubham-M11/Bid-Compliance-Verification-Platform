"use client";

import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  FileText,
  Info,
  ShieldAlert,
} from "lucide-react";
import type {
  ComplianceFinding,
  EvidenceItem,
  FindingSeverity,
} from "@/services/types/compliance";

interface ReviewFindingsSectionProps {
  findings: ComplianceFinding[];
  onInspectEvidence: (evidence: EvidenceItem) => void;
}

export default function ReviewFindingsSection({
  findings,
  onInspectEvidence,
}: ReviewFindingsSectionProps) {
  const getSeverityBadge = (severity: FindingSeverity) => {
    switch (severity) {
      case "CRITICAL":
      case "HIGH":
        return (
          <span className="ent-badge ent-badge-critical">
            <ShieldAlert size={11} /> {severity} PRIORITY
          </span>
        );
      case "MEDIUM":
        return (
          <span className="ent-badge ent-badge-warning">
            <AlertTriangle size={11} /> {severity} RISK
          </span>
        );
      case "LOW":
        return (
          <span className="ent-badge ent-badge-neutral">
            <Info size={11} /> LOW RISK
          </span>
        );
      case "INFO":
        return (
          <span className="ent-badge ent-badge-blue">
            <CheckCircle2 size={11} /> ADVISORY
          </span>
        );
      default:
        return <span className="ent-badge ent-badge-neutral">{severity}</span>;
    }
  };

  const getSeverityIcon = (severity: FindingSeverity) => {
    switch (severity) {
      case "CRITICAL":
      case "HIGH":
        return <ShieldAlert size={18} color="var(--status-critical-text)" />;
      case "MEDIUM":
        return <AlertTriangle size={18} color="var(--status-warning-text)" />;
      default:
        return <Info size={18} color="var(--brand-blue)" />;
    }
  };

  return (
    <div id="findings-section" className="ent-card" style={{ marginBottom: "1.75rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <div>
          <div className="ent-section-title">
            <AlertCircle size={18} color="var(--brand-blue)" />
            Review Findings & Officer Action Items
          </div>
          <p className="ent-section-subtitle">
            Plain-English audit observations with procurement impact and required bidder remediation.
          </p>
        </div>

        {findings.length > 0 ? (
          <span className="ent-badge ent-badge-warning">
            {findings.length} {findings.length === 1 ? "Issue Flagged" : "Issues Flagged"}
          </span>
        ) : (
          <span className="ent-badge ent-badge-success">
            <CheckCircle2 size={12} /> Clean Audit
          </span>
        )}
      </div>

      {findings.length === 0 ? (
        <div
          style={{
            padding: "1.5rem",
            background: "var(--status-success-surface)",
            border: "1px solid var(--status-success-border)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
          }}
        >
          <CheckCircle2 size={22} color="var(--status-success-text)" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#ffffff" }}>
              No Compliance Issues Detected
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              All statutory credentials, cross-entity relational checks, and authorization windows passed verification.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {findings.map((f, idx) => {
            const firstEvidence = f.linked_evidence && f.linked_evidence.length > 0 ? f.linked_evidence[0] : null;

            return (
              <div key={f.finding_id || idx} className="finding-item">
                <div className="finding-header">
                  <div className="finding-title">
                    {getSeverityIcon(f.severity)}
                    {f.title}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      Rule: {f.rule_id}
                    </span>
                    {getSeverityBadge(f.severity)}
                  </div>
                </div>

                <p className="finding-desc">{f.description}</p>

                {/* Why this matters & Remediation box */}
                <div className="finding-subbox">
                  <strong style={{ color: "#ffffff" }}>Actionable Remediation: </strong>
                  {f.remediation_guidance}
                </div>

                {/* Evidence citation footer */}
                {firstEvidence && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "0.85rem",
                      paddingTop: "0.65rem",
                      borderTop: "1px solid var(--border-subtle)",
                      fontSize: "0.78rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-secondary)" }}>
                      <FileText size={13} color="var(--brand-blue)" />
                      <span>
                        Evidence: <strong style={{ color: "#cbd5e1" }}>{firstEvidence.filename || "Bid Submission"}</strong>
                        {firstEvidence.page_number && ` · Page ${firstEvidence.page_number}`}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="ent-btn ent-btn-ghost ent-btn-sm"
                      onClick={() => onInspectEvidence(firstEvidence)}
                    >
                      <FileSearch size={13} /> Inspect Evidence
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
