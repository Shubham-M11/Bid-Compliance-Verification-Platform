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
  Printer,
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
  bidderName?: string;
  tenderRefNumber?: string;
}

const ACTION_OPTIONS: Array<{
  type: OfficerActionType;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    type: "REVIEW_IN_PROGRESS",
    label: "Review In Progress",
    desc: "Initiate manual evaluation workflow",
    icon: <History size={14} />,
  },
  {
    type: "EVIDENCE_CONFIRMED",
    label: "Confirm Evidence",
    desc: "Statutory documents & facts verified",
    icon: <FileCheck size={14} />,
  },
  {
    type: "CLARIFICATION_REQUESTED",
    label: "Request Clarification",
    desc: "Issue inquiry to bidder for missing details",
    icon: <HelpCircle size={14} />,
  },
  {
    type: "ESCALATED_FOR_MANUAL_REVIEW",
    label: "Escalate for Review",
    desc: "Refer complex findings to tender committee",
    icon: <AlertTriangle size={14} />,
  },
  {
    type: "RECOMMEND_ACCEPTANCE",
    label: "Recommend Acceptance",
    desc: "Advisory recommendation for technical qualification",
    icon: <CheckCircle2 size={14} color="var(--status-success-text)" />,
  },
  {
    type: "RECOMMEND_REJECTION",
    label: "Recommend Rejection",
    desc: "Advisory recommendation due to statutory default",
    icon: <XCircle size={14} color="var(--status-critical-text)" />,
  },
];

export default function OfficerDecisionPanel({
  verificationId,
  findings,
  score,
  bidderName,
  tenderRefNumber,
}: OfficerDecisionPanelProps) {
  const [officerName, setOfficerName] = useState("");
  const [officerDesignation, setOfficerDesignation] = useState("");
  const [selectedAction, setSelectedAction] = useState<OfficerActionType>("REVIEW_IN_PROGRESS");
  const [officerNotes, setOfficerNotes] = useState("");
  const [reviewedFindings, setReviewedFindings] = useState<string[]>(
    findings.map((f) => f.finding_id)
  );

  // Confirmation state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
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

  const handleOpenConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerName.trim() || !officerDesignation.trim()) {
      setErrorMessage("Please provide evaluating officer name and designation.");
      return;
    }
    setErrorMessage(null);
    setShowConfirmModal(true);
  };

  const handleExecuteRecord = async () => {
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
      setShowConfirmModal(false);

      try {
        const stored = JSON.parse(localStorage.getItem("gem_audit_history") || "[]");
        const storedRecord = {
          ...response,
          bidder_name: bidderName || "Bidder Submission",
          tender_ref: tenderRefNumber || "GEM/2026/B/890123",
          score: score,
        };
        const updated = [
          storedRecord,
          ...stored.filter(
            (item: { decision_id: string }) => item.decision_id !== response.decision_id
          ),
        ];
        localStorage.setItem("gem_audit_history", JSON.stringify(updated));
      } catch {
        // LocalStorage fallback
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to record officer decision");
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedActionMeta = ACTION_OPTIONS.find((a) => a.type === selectedAction);

  return (
    <div
      className="ent-card"
      style={{
        marginBottom: "1.75rem",
        borderLeft: "4px solid var(--brand-blue)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          paddingBottom: "0.75rem",
          borderBottom: "1px solid var(--border-subtle)",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div>
          <div className="ent-section-title">
            <UserCheck size={18} color="var(--brand-blue)" />
            <span>Procurement Officer Decision Support</span>
          </div>
          <p className="ent-section-subtitle">
            Record human procurement evaluation actions, bidder clarification requests, and committee review notes.
          </p>
        </div>

        <span className="ent-badge ent-badge-neutral">
          <ShieldCheck size={12} /> Human-in-the-Loop Decision
        </span>
      </div>

      {/* Human Oversight Disclosure */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.75rem",
          background: "var(--brand-blue-surface)",
          border: "1px solid var(--brand-blue-border)",
          borderRadius: "var(--radius-md)",
          padding: "0.85rem 1rem",
          marginBottom: "1.25rem",
        }}
      >
        <Info
          size={18}
          color="var(--brand-blue)"
          style={{ flexShrink: 0, marginTop: "2px" }}
        />
        <div
          style={{
            fontSize: "0.78rem",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: "var(--text-primary)" }}>HUMAN OVERSIGHT NOTICE: </strong>
          Automated verification supports officer review. The final procurement decision remains with the authorized officer / evaluation committee.
        </div>
      </div>

      {recordedDecision ? (
        /* Recorded Decision Confirmation Card */
        <div
          style={{
            background: "var(--bg-app)",
            border: "1px solid var(--status-success-border)",
            borderRadius: "var(--radius-md)",
            padding: "1.25rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              marginBottom: "0.85rem",
              flexWrap: "wrap",
            }}
          >
            <CheckCircle2 size={20} color="var(--status-success-text)" />
            <h4
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              ✓ Officer action recorded
            </h4>
            <span
              className="ent-badge ent-badge-success"
              style={{ marginLeft: "auto" }}
            >
              Decision ID: {recordedDecision.decision_id}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.75rem",
              fontSize: "0.8rem",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              padding: "0.85rem",
              borderRadius: "var(--radius-sm)",
              marginBottom: "0.85rem",
            }}
          >
            <div>
              <span style={{ color: "var(--text-muted)", display: "block" }}>
                Evaluating Officer
              </span>
              <strong style={{ color: "var(--text-primary)" }}>
                {recordedDecision.officer_name}
              </strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block" }}>
                Role / Designation
              </span>
              <span style={{ color: "var(--text-secondary)" }}>
                {recordedDecision.officer_designation}
              </span>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block" }}>
                Action Recorded
              </span>
              <strong style={{ color: "var(--brand-blue)" }}>
                {recordedDecision.action}
              </strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block" }}>
                Recorded Timestamp
              </span>
              <span style={{ color: "var(--text-secondary)" }}>
                {new Date(recordedDecision.timestamp).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div
            style={{
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
              marginBottom: "0.85rem",
            }}
          >
            <strong style={{ color: "var(--text-primary)" }}>Summary: </strong>
            {recordedDecision.status_summary}
          </div>

          {recordedDecision.officer_notes && (
            <div
              style={{
                fontSize: "0.78rem",
                color: "var(--text-secondary)",
                background: "var(--bg-surface)",
                padding: "0.6rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                borderLeft: "3px solid var(--border-focus)",
                marginBottom: "1rem",
              }}
            >
              <strong style={{ color: "var(--text-primary)" }}>Officer Notes: </strong>
              &ldquo;{recordedDecision.officer_notes}&rdquo;
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="ent-btn ent-btn-secondary ent-btn-sm"
              onClick={() => setRecordedDecision(null)}
            >
              <History size={13} /> Record Another Action
            </button>
            <button
              type="button"
              className="ent-btn ent-btn-primary ent-btn-sm"
              onClick={() => window.print()}
              title="Print official decision audit summary sheet"
            >
              <Printer size={13} /> Print / Export Audit Summary
            </button>
          </div>
        </div>
      ) : (
        /* Decision Entry Form */
        <form onSubmit={handleOpenConfirmation}>
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "0.85rem",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: "0.76rem",
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Evaluating Officer Name *
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
                <label
                  style={{
                    fontSize: "0.76rem",
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Designation / Role *
                </label>
                <input
                  type="text"
                  className="ent-input"
                  value={officerDesignation}
                  onChange={(e) => setOfficerDesignation(e.target.value)}
                  placeholder="e.g. Senior Procurement Evaluation Officer"
                  required
                />
              </div>
            </div>

            {/* Action Buttons Grid */}
            <div>
              <label
                style={{
                  fontSize: "0.76rem",
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Officer Review Action *
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: "0.6rem",
                }}
              >
                {ACTION_OPTIONS.map((actionItem) => (
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
                          ? "var(--brand-blue-surface)"
                          : "var(--bg-app)",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        fontWeight: 600,
                        fontSize: "0.82rem",
                      }}
                    >
                      {actionItem.icon}
                      <span>{actionItem.label}</span>
                    </div>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                        marginTop: "2px",
                      }}
                    >
                      {actionItem.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Findings Acknowledgment Checklist */}
            {findings.length > 0 && (
              <div>
                <label
                  style={{
                    fontSize: "0.76rem",
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Acknowledge Findings Reviewed ({reviewedFindings.length} /{" "}
                  {findings.length})
                </label>
                <div
                  style={{
                    maxHeight: "140px",
                    overflowY: "auto",
                    background: "var(--bg-app)",
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
                        color: reviewedFindings.includes(f.finding_id)
                          ? "var(--text-primary)"
                          : "var(--text-muted)",
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
                        <strong style={{ color: "var(--brand-blue)" }}>
                          [{f.rule_id}]
                        </strong>{" "}
                        {f.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Officer Notes */}
            <div>
              <label
                style={{
                  fontSize: "0.76rem",
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Officer Notes / Procurement Justification
              </label>
              <textarea
                className="ent-input"
                rows={2}
                value={officerNotes}
                onChange={(e) => setOfficerNotes(e.target.value)}
                placeholder="Enter review notes, verification findings justification, or clarification points..."
                style={{ resize: "vertical" }}
              />
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                  marginTop: "3px",
                  display: "block",
                }}
              >
                These notes will be included in the review audit record.
              </span>
            </div>

            {/* Submit Button */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                className="ent-btn ent-btn-primary"
                disabled={isSubmitting}
                style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}
              >
                <Send size={14} />
                <span>Review & Confirm Action</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="drawer-backdrop" style={{ zIndex: 1000 }}>
          <div
            className="ent-card"
            style={{
              maxWidth: "520px",
              width: "90%",
              margin: "auto",
              padding: "1.5rem",
              background: "var(--bg-surface)",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4)",
            }}
          >
            <h3
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: "0.75rem",
              }}
            >
              Confirm Officer Review Action
            </h3>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
                fontSize: "0.82rem",
                background: "var(--bg-app)",
                padding: "0.85rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                marginBottom: "1rem",
              }}
            >
              <div>
                <span style={{ color: "var(--text-muted)" }}>Officer: </span>
                <strong style={{ color: "var(--text-primary)" }}>
                  {officerName} ({officerDesignation})
                </strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Action: </span>
                <strong style={{ color: "var(--brand-blue)" }}>
                  {selectedActionMeta?.label}
                </strong>
              </div>
              {officerNotes && (
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Notes: </span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    &ldquo;{officerNotes}&rdquo;
                  </span>
                </div>
              )}
            </div>

            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginBottom: "1.25rem",
                lineHeight: 1.45,
              }}
            >
              Recording this action will create a permanent timestamped audit record in the local procurement audit trail.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <button
                type="button"
                className="ent-btn ent-btn-secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ent-btn ent-btn-primary"
                onClick={handleExecuteRecord}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="spin" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <span>Record Action</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
