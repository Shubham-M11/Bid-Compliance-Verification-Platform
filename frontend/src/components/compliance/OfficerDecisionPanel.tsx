"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  CheckCircle2,
  FileCheck,
  HelpCircle,
  History,
  Info,
  Loader2,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  XCircle,
} from "lucide-react";
import { recordOfficerDecision } from "@/services/api";
import type {
  ComplianceFinding,
  OfficerActionType,
  OfficerDecisionRequest,
  OfficerDecisionResponse,
} from "@/services/types/compliance";

interface OfficerDecisionPanelProps {
  verificationId: string;
  findings: ComplianceFinding[];
  score: number;
}

export default function OfficerDecisionPanel({
  verificationId,
  findings,
  score,
}: OfficerDecisionPanelProps) {
  const [officerName, setOfficerName] = useState("S. K. Verma");
  const [officerDesignation, setOfficerDesignation] = useState("Senior Procurement Evaluation Officer");
  const [selectedAction, setSelectedAction] = useState<OfficerActionType>("REVIEW_IN_PROGRESS");
  const [officerNotes, setOfficerNotes] = useState("");
  const [reviewedFindings, setReviewedFindings] = useState<string[]>(
    findings.map((f) => f.finding_id)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordedDecision, setRecordedDecision] = useState<OfficerDecisionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleFindingReview = (findingId: string) => {
    if (reviewedFindings.includes(findingId)) {
      setReviewedFindings(reviewedFindings.filter((id) => id !== findingId));
    } else {
      setReviewedFindings([...reviewedFindings, findingId]);
    }
  };

  const handleRecordDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerName.trim() || !officerDesignation.trim()) {
      setErrorMessage("Please provide officer name and designation.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: OfficerDecisionRequest = {
      verification_id: verificationId || "VERIF-DEMO-2026",
      officer_name: officerName.trim(),
      officer_designation: officerDesignation.trim(),
      action: selectedAction,
      officer_notes: officerNotes.trim() || undefined,
      findings_reviewed: reviewedFindings,
    };

    try {
      const response = await recordOfficerDecision(payload);
      setRecordedDecision(response);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to record decision");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ent-card" style={{ marginBottom: "1.75rem", borderLeft: "4px solid var(--brand-blue)" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          paddingBottom: "0.75rem",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div>
          <div className="ent-section-title">
            <UserCheck size={18} color="var(--brand-blue)" />
            Procurement Officer Decision Support
          </div>
          <p className="ent-section-subtitle">
            Record human procurement evaluation actions, bidder clarification requests, and committee review notes.
          </p>
        </div>

        <span className="ent-badge ent-badge-neutral">
          <ShieldCheck size={12} /> Human-in-the-Loop Decision
        </span>
      </div>

      {/* Mandatory Disclaimer Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.75rem",
          background: "rgba(59, 130, 246, 0.08)",
          border: "1px solid rgba(59, 130, 246, 0.25)",
          borderRadius: "var(--radius-md)",
          padding: "0.85rem 1rem",
          marginBottom: "1.25rem",
        }}
      >
        <Info size={18} color="var(--brand-blue)" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div style={{ fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.5 }}>
          <strong style={{ color: "#ffffff" }}>DECISION-SUPPORT DISCLOSURE:</strong> The compliance score and risk tier
          are platform-defined prioritization aids. The platform does <strong>NOT</strong> automatically accept, reject, or award bids.
          Final statutory eligibility remains strictly with the authorized procurement committee.
        </div>
      </div>

      {recordedDecision ? (
        /* Recorded Decision Confirmation Card */
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--status-success-border)",
            borderRadius: "var(--radius-md)",
            padding: "1.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.85rem" }}>
            <CheckCircle2 size={20} color="var(--status-success-text)" />
            <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>
              Officer Decision Audit Record Generated
            </h4>
            <span className="ent-badge ent-badge-success" style={{ marginLeft: "auto" }}>
              {recordedDecision.decision_id}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.75rem",
              fontSize: "0.8rem",
              background: "rgba(15, 23, 42, 0.6)",
              padding: "0.85rem",
              borderRadius: "var(--radius-sm)",
              marginBottom: "0.85rem",
            }}
          >
            <div>
              <span style={{ color: "var(--text-muted)", display: "block" }}>Evaluating Officer</span>
              <strong style={{ color: "#ffffff" }}>{recordedDecision.officer_name}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block" }}>Role / Designation</span>
              <span style={{ color: "#cbd5e1" }}>{recordedDecision.officer_designation}</span>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block" }}>Action Selected</span>
              <strong style={{ color: "var(--brand-blue)" }}>{recordedDecision.action}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block" }}>Recorded Timestamp</span>
              <span style={{ color: "#cbd5e1" }}>{new Date(recordedDecision.timestamp).toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div style={{ fontSize: "0.82rem", color: "#e2e8f0", marginBottom: "0.85rem" }}>
            <strong>Summary:</strong> {recordedDecision.status_summary}
          </div>

          {recordedDecision.officer_notes && (
            <div
              style={{
                fontSize: "0.78rem",
                color: "#94a3b8",
                background: "rgba(0,0,0,0.2)",
                padding: "0.6rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                borderLeft: "3px solid var(--border-focus)",
                marginBottom: "1rem",
              }}
            >
              <strong>Officer Notes:</strong> &ldquo;{recordedDecision.officer_notes}&rdquo;
            </div>
          )}

          <button
            type="button"
            className="ent-btn ent-btn-secondary ent-btn-sm"
            onClick={() => setRecordedDecision(null)}
          >
            <History size={13} /> Update / Record Another Decision
          </button>
        </div>
      ) : (
        /* Decision Entry Form */
        <form onSubmit={handleRecordDecision}>
          {errorMessage && (
            <div
              style={{
                padding: "0.65rem 0.85rem",
                background: "var(--status-critical-surface)",
                border: "1px solid var(--status-critical-border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--status-critical-text)",
                fontSize: "0.78rem",
                marginBottom: "1rem",
              }}
            >
              {errorMessage}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Officer Details Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
              <div>
                <label style={{ fontSize: "0.76rem", color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                  Officer Name *
                </label>
                <input
                  type="text"
                  className="ent-input"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  placeholder="e.g. S. K. Verma"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "0.76rem", color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                  Designation / Role *
                </label>
                <input
                  type="text"
                  className="ent-input"
                  value={officerDesignation}
                  onChange={(e) => setOfficerDesignation(e.target.value)}
                  placeholder="e.g. Senior Procurement Officer"
                  required
                />
              </div>
            </div>

            {/* Action Buttons Grid */}
            <div>
              <label style={{ fontSize: "0.76rem", color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                Select Review Action *
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0.6rem",
                }}
              >
                {[
                  {
                    type: "REVIEW_IN_PROGRESS" as OfficerActionType,
                    label: "Review In Progress",
                    desc: "Initiate evaluation workflow",
                    icon: <History size={14} />,
                  },
                  {
                    type: "EVIDENCE_CONFIRMED" as OfficerActionType,
                    label: "Confirm Evidence",
                    desc: "Statutory evidence verified",
                    icon: <FileCheck size={14} />,
                  },
                  {
                    type: "CLARIFICATION_REQUESTED" as OfficerActionType,
                    label: "Request Clarification",
                    desc: "Issue inquiry to bidder",
                    icon: <HelpCircle size={14} />,
                  },
                  {
                    type: "ESCALATED_FOR_MANUAL_REVIEW" as OfficerActionType,
                    label: "Escalate for Review",
                    desc: "Refer to tender committee",
                    icon: <AlertTriangle size={14} />,
                  },
                  {
                    type: "RECOMMEND_ACCEPTANCE" as OfficerActionType,
                    label: "Recommend Acceptance",
                    desc: "Technical qualification",
                    icon: <CheckCircle2 size={14} color="var(--status-success-text)" />,
                  },
                  {
                    type: "RECOMMEND_REJECTION" as OfficerActionType,
                    label: "Recommend Rejection",
                    desc: "Statutory disqualification",
                    icon: <XCircle size={14} color="var(--status-critical-text)" />,
                  },
                ].map((actionItem) => (
                  <button
                    key={actionItem.type}
                    type="button"
                    onClick={() => setSelectedAction(actionItem.type)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "var(--radius-sm)",
                      border:
                        selectedAction === actionItem.type
                          ? "2px solid var(--brand-blue)"
                          : "1px solid var(--border-subtle)",
                      background:
                        selectedAction === actionItem.type
                          ? "rgba(59, 130, 246, 0.12)"
                          : "var(--bg-surface)",
                      color: "#ffffff",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600, fontSize: "0.82rem" }}>
                      {actionItem.icon}
                      <span>{actionItem.label}</span>
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      {actionItem.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Findings Acknowledgment Checklist */}
            {findings.length > 0 && (
              <div>
                <label style={{ fontSize: "0.76rem", color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                  Acknowledge Findings Reviewed ({reviewedFindings.length} / {findings.length})
                </label>
                <div
                  style={{
                    maxHeight: "140px",
                    overflowY: "auto",
                    background: "var(--bg-surface)",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                  }}
                >
                  {findings.map((f) => (
                    <label
                      key={f.finding_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.76rem",
                        color: reviewedFindings.includes(f.finding_id) ? "#ffffff" : "var(--text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={reviewedFindings.includes(f.finding_id)}
                        onChange={() => toggleFindingReview(f.finding_id)}
                        style={{ cursor: "pointer" }}
                      />
                      <span>
                        <strong style={{ color: "var(--brand-blue)" }}>[{f.rule_id}]</strong> {f.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Officer Notes */}
            <div>
              <label style={{ fontSize: "0.76rem", color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                Officer Notes / Procurement Justification
              </label>
              <textarea
                className="ent-input"
                rows={2}
                value={officerNotes}
                onChange={(e) => setOfficerNotes(e.target.value)}
                placeholder="Enter formal justification, verification notes, or bidder clarification points..."
                style={{ resize: "vertical" }}
              />
            </div>

            {/* Submit Button */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                className="ent-btn ent-btn-primary"
                disabled={isSubmitting}
                style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Recording Decision...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Record Official Decision
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
