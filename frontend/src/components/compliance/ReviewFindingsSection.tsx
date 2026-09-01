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
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type {
  ComplianceFinding,
  EvidenceItem,
  FindingSeverity,
  ScoreContribution,
} from "@/services/types/compliance";

interface ReviewFindingsSectionProps {
  findings: ComplianceFinding[];
  scoreBreakdown?: ScoreContribution[];
  onInspectEvidence: (evidence: EvidenceItem) => void;
}

export default function ReviewFindingsSection({
  findings,
  scoreBreakdown,
  onInspectEvidence,
}: ReviewFindingsSectionProps) {
  const getSeverityBadge = (severity: FindingSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return (
          <span className="ent-badge ent-badge-critical">
            <XCircle size={11} /> CRITICAL PRIORITY
          </span>
        );
      case "HIGH":
        return (
          <span className="ent-badge ent-badge-critical">
            <ShieldAlert size={11} /> HIGH PRIORITY
          </span>
        );
      case "MEDIUM":
        return (
          <span className="ent-badge ent-badge-warning">
            <AlertTriangle size={11} /> MEDIUM RISK
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
        return <ShieldAlert size={18} color="var(--status-critical-text)" style={{ flexShrink: 0 }} />;
      case "MEDIUM":
        return <AlertTriangle size={18} color="var(--status-warning-text)" style={{ flexShrink: 0 }} />;
      default:
        return <Info size={18} color="var(--brand-blue)" style={{ flexShrink: 0 }} />;
    }
  };

  return (
    <div id="findings-section" className="ent-card" style={{ marginBottom: "1.75rem" }}>
      {/* Header */}
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
            <span>Review Findings & Action Items</span>
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
            <CheckCircle2 size={12} /> Clean Review
          </span>
        )}
      </div>

      {/* Clean Review State vs Itemized Findings */}
      {findings.length === 0 ? (
        <div
          style={{
            padding: "1.5rem 1.75rem",
            background: "var(--status-success-surface)",
            border: "1px solid var(--status-success-border)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <CheckCircle2 size={22} color="var(--status-success-text)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              ✓ No compliance issues identified
            </div>
          </div>

          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5, marginLeft: "2.1rem" }}>
            All available verification checks passed based on the submitted documentation. No statutory checksum errors, identity discrepancies, or authorization defaults were detected.
          </p>

          <div
            style={{
              fontSize: "0.74rem",
              color: "var(--text-muted)",
              marginTop: "0.25rem",
              marginLeft: "2.1rem",
              borderTop: "1px solid var(--status-success-border)",
              paddingTop: "0.5rem",
            }}
          >
            <strong>Decision Support Note: </strong>
            This verification assessment assists manual procurement committee evaluation and does not constitute official statutory certification or automatic tender qualification.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {findings.map((f, idx) => {
            const matchingContribution = scoreBreakdown?.find(
              (sc) => sc.rule_id === f.rule_id
            );
            const procurementImpact =
              matchingContribution?.procurement_impact ||
              matchingContribution?.policy_rationale;

            return (
              <div
                key={f.finding_id || idx}
                className="finding-item"
                style={{
                  borderLeft:
                    f.severity === "CRITICAL" || f.severity === "HIGH"
                      ? "4px solid var(--status-critical)"
                      : f.severity === "MEDIUM"
                      ? "4px solid var(--status-warning)"
                      : "4px solid var(--brand-blue)",
                }}
              >
                {/* Finding Header */}
                <div className="finding-header">
                  <div className="finding-title">
                    {getSeverityIcon(f.severity)}
                    <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {f.title}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      Rule: {f.rule_id}
                    </span>
                    {getSeverityBadge(f.severity)}
                  </div>
                </div>

                {/* What Was Detected (Plain English Explanation) */}
                <div style={{ marginBottom: "0.75rem" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "2px" }}>
                    What was detected:
                  </div>
                  <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                    {f.description}
                  </p>
                </div>

                {/* Procurement Impact (Why it matters) */}
                {procurementImpact && (
                  <div
                    style={{
                      padding: "0.6rem 0.85rem",
                      background: "var(--bg-app)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      marginBottom: "0.75rem",
                      fontSize: "0.8rem",
                      lineHeight: 1.45,
                    }}
                  >
                    <strong style={{ color: "var(--text-primary)" }}>Procurement impact: </strong>
                    <span style={{ color: "var(--text-secondary)" }}>{procurementImpact}</span>
                  </div>
                )}

                {/* Remediation & Action Guidance */}
                {f.remediation_guidance && (
                  <div className="finding-subbox">
                    <strong style={{ color: "var(--text-primary)" }}>Action guidance: </strong>
                    <span style={{ color: "var(--text-secondary)" }}>{f.remediation_guidance}</span>
                  </div>
                )}

                {/* Evidence Citation & Source Link */}
                {f.linked_evidence && f.linked_evidence.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "0.85rem",
                      paddingTop: "0.65rem",
                      borderTop: "1px solid var(--border-subtle)",
                      fontSize: "0.78rem",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        Evidence source:
                      </span>
                      {f.linked_evidence.map((ev, evIdx) => (
                        <span
                          key={evIdx}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            padding: "2px 8px",
                            background: "var(--bg-app)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-xs)",
                            fontSize: "0.74rem",
                            color: "var(--brand-blue)",
                          }}
                        >
                          <FileText size={12} />
                          <span>
                            {ev.filename || "Bid Submission Document"} {ev.page_number ? `— Page ${ev.page_number}` : ""}
                          </span>
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="ent-btn ent-btn-secondary ent-btn-sm"
                      onClick={() => onInspectEvidence(f.linked_evidence[0])}
                    >
                      <FileSearch size={13} color="var(--brand-blue)" />
                      <span>View Evidence</span>
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
