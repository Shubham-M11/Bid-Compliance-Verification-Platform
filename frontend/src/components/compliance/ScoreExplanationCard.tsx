"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Calculator,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  Info,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { ScoreContribution } from "@/services/types/compliance";

interface ScoreExplanationCardProps {
  score: number;
  breakdown: ScoreContribution[];
}

export default function ScoreExplanationCard({
  score,
  breakdown,
}: ScoreExplanationCardProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  const getPriorityTier = (s: number) => {
    if (s >= 85) return { label: "LOW REVIEW PRIORITY", class: "ent-badge-success" };
    if (s >= 60) return { label: "MODERATE REVIEW PRIORITY", class: "ent-badge-warning" };
    return { label: "HIGH REVIEW PRIORITY", class: "ent-badge-critical" };
  };

  const priorityTier = getPriorityTier(score);

  return (
    <div className="ent-card" style={{ marginBottom: "1.75rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div>
          <div className="ent-section-title">
            <Calculator size={18} color="var(--brand-blue)" />
            <span>Score Explanation & Deduction Waterfall</span>
          </div>
          <p className="ent-section-subtitle">
            Itemized point adjustments and policy justifications from the 100-point review priority baseline.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            type="button"
            className="ent-btn ent-btn-secondary ent-btn-sm"
            onClick={() => setShowMethodology(!showMethodology)}
            style={{ fontSize: "0.74rem" }}
          >
            <HelpCircle size={13} color="var(--brand-blue)" />
            {showMethodology ? "Hide Policy" : "How Scoring Works"}
          </button>
          <span className={`ent-badge ${priorityTier.class}`}>
            {priorityTier.label}
          </span>
        </div>
      </div>

      {/* Progressive Disclosure: How Scoring Works */}
      {showMethodology && (
        <div
          style={{
            background: "var(--bg-app)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "1rem 1.25rem",
            marginBottom: "1.25rem",
            fontSize: "0.8rem",
            lineHeight: 1.55,
          }}
        >
          <h4
            style={{
              fontSize: "0.88rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "0.4rem",
            }}
          >
            Review Priority Scoring Methodology
          </h4>
          <p style={{ color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            This score prioritizes officer review based on detected verification issues. It is a <strong>platform-defined triage indicator</strong> and does <strong>NOT</strong> replace the tender&apos;s statutory qualification criteria or the evaluation committee&apos;s final decision.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.65rem",
              marginTop: "0.5rem",
            }}
          >
            <div
              style={{
                background: "var(--bg-surface)",
                padding: "0.6rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <strong
                style={{
                  color: "var(--brand-blue)",
                  display: "block",
                  fontSize: "0.76rem",
                  marginBottom: "2px",
                }}
              >
                1. Statutory Facts
              </strong>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                Deterministic format checks, checksum validation, and date boundary evaluations.
              </span>
            </div>
            <div
              style={{
                background: "var(--bg-surface)",
                padding: "0.6rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <strong
                style={{
                  color: "var(--brand-blue)",
                  display: "block",
                  fontSize: "0.76rem",
                  marginBottom: "2px",
                }}
              >
                2. Risk-Calibrated Weights
              </strong>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                Configurable point deductions calibrated to highlight serious statutory defaults.
              </span>
            </div>
            <div
              style={{
                background: "var(--bg-surface)",
                padding: "0.6rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <strong
                style={{
                  color: "var(--brand-blue)",
                  display: "block",
                  fontSize: "0.76rem",
                  marginBottom: "2px",
                }}
              >
                3. Anti-Double-Counting
              </strong>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                Single primary penalty per root cause; secondary duplicate citations receive 0 points.
              </span>
            </div>
            <div
              style={{
                background: "var(--bg-surface)",
                padding: "0.6rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <strong
                style={{
                  color: "var(--brand-blue)",
                  display: "block",
                  fontSize: "0.76rem",
                  marginBottom: "2px",
                }}
              >
                4. Human Committee Decision
              </strong>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                Final qualification judgment remains exclusively with the human procurement officer.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Waterfall Deduction Table */}
      <div
        style={{
          background: "var(--bg-app)",
          border: "1px solid var(--border-subtle)",
          padding: "1.1rem 1.25rem",
          borderRadius: "var(--radius-md)",
        }}
      >
        <table className="waterfall-table" style={{ width: "100%" }}>
          <tbody>
            <tr>
              <td style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                Starting Review Baseline Score
              </td>
              <td
                style={{
                  textAlign: "right",
                  color: "var(--text-primary)",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                }}
              >
                100 pts
              </td>
            </tr>

            {breakdown.length === 0 ? (
              <tr>
                <td style={{ color: "var(--status-success-text)", padding: "0.75rem 0" }}>
                  ✓ No statutory deductions applied (Clean Submission)
                </td>
                <td
                  style={{
                    textAlign: "right",
                    color: "var(--status-success-text)",
                    fontWeight: 600,
                  }}
                >
                  0 pts
                </td>
              </tr>
            ) : (
              breakdown.map((item, idx) => (
                <React.Fragment key={`${item.rule_id}_${idx}`}>
                  <tr
                    onClick={() => toggleExpand(idx)}
                    style={{
                      cursor: "pointer",
                      borderBottom:
                        expandedIndex === idx
                          ? "none"
                          : "1px solid var(--border-subtle)",
                      background:
                        expandedIndex === idx
                          ? "var(--bg-surface)"
                          : "transparent",
                    }}
                  >
                    <td style={{ padding: "0.75rem 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: 600,
                            fontSize: "0.85rem",
                          }}
                        >
                          {item.title}
                        </span>
                        {item.is_primary_penalty ? (
                          <span
                            className="ent-badge ent-badge-critical"
                            style={{ fontSize: "0.68rem", padding: "1px 6px" }}
                          >
                            Rule {item.rule_id} · Primary
                          </span>
                        ) : (
                          <span
                            className="ent-badge ent-badge-neutral"
                            style={{ fontSize: "0.68rem", padding: "1px 6px" }}
                          >
                            Rule {item.rule_id} · Deduplicated
                          </span>
                        )}
                        <span
                          style={{
                            marginLeft: "auto",
                            color: "var(--text-muted)",
                            fontSize: "0.72rem",
                          }}
                        >
                          {expandedIndex === idx ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "0.76rem",
                          color: "var(--text-secondary)",
                          marginTop: "3px",
                        }}
                      >
                        {item.reason}
                      </div>
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: 700,
                        verticalAlign: "middle",
                        color:
                          item.points_change < 0
                            ? "var(--status-critical-text)"
                            : "var(--text-secondary)",
                      }}
                    >
                      {item.points_change === 0
                        ? "0 pts"
                        : `${item.points_change} pts`}
                    </td>
                  </tr>

                  {/* Expanded Accordion: Policy & Evidence Details */}
                  {expandedIndex === idx && (
                    <tr
                      style={{
                        background: "var(--bg-surface)",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      <td colSpan={2} style={{ padding: "0.85rem 1rem" }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.55rem",
                            fontSize: "0.76rem",
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "0.75rem",
                            }}
                          >
                            <div>
                              <span
                                style={{
                                  color: "var(--text-muted)",
                                  fontWeight: 600,
                                  display: "block",
                                }}
                              >
                                Procurement Impact
                              </span>
                              <span style={{ color: "var(--text-secondary)" }}>
                                {item.procurement_impact ||
                                  "Requires evaluation committee review before technical qualification."}
                              </span>
                            </div>
                            <div>
                              <span
                                style={{
                                  color: "var(--text-muted)",
                                  fontWeight: 600,
                                  display: "block",
                                }}
                              >
                                Policy Rationale
                              </span>
                              <span style={{ color: "var(--text-secondary)" }}>
                                {item.policy_rationale ||
                                  `Risk deduction of ${item.points_change} pts.`}
                              </span>
                            </div>
                          </div>

                          {item.is_deduplicated && item.deduplication_reason && (
                            <div
                              style={{
                                background: "var(--bg-app)",
                                padding: "0.45rem 0.65rem",
                                borderRadius: "var(--radius-sm)",
                                borderLeft: "3px solid var(--brand-blue)",
                                color: "var(--text-primary)",
                              }}
                            >
                              <strong>Anti-Double-Counting:</strong>{" "}
                              {item.deduplication_reason}
                            </div>
                          )}

                          {item.linked_evidence &&
                            item.linked_evidence.length > 0 && (
                              <div>
                                <span
                                  style={{
                                    color: "var(--text-muted)",
                                    fontWeight: 600,
                                    display: "block",
                                    marginBottom: "3px",
                                  }}
                                >
                                  Cited Evidence
                                </span>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "0.5rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {item.linked_evidence.map((ev, evIdx) => (
                                    <span
                                      key={evIdx}
                                      style={{
                                        background: "var(--bg-app)",
                                        border: "1px solid var(--border-subtle)",
                                        padding: "2px 8px",
                                        borderRadius: "var(--radius-sm)",
                                        color: "var(--text-primary)",
                                        fontSize: "0.72rem",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                      }}
                                    >
                                      <FileText
                                        size={11}
                                        color="var(--brand-blue)"
                                      />
                                      {ev.filename || "Document"} (p.{" "}
                                      {ev.page_number}) · {ev.extracted_value}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}

            {/* Final Score Row */}
            <tr style={{ borderTop: "2px solid var(--border-subtle)" }}>
              <td
                style={{
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  paddingTop: "0.85rem",
                }}
              >
                Final Review Priority Score
              </td>
              <td
                style={{
                  textAlign: "right",
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  paddingTop: "0.85rem",
                  color:
                    score >= 85
                      ? "var(--status-success-text)"
                      : score >= 60
                      ? "var(--status-warning-text)"
                      : "var(--status-critical-text)",
                }}
              >
                {score} / 100
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Decision-Support Disclosure */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.45rem",
          fontSize: "0.74rem",
          color: "var(--text-muted)",
          marginTop: "0.85rem",
          lineHeight: 1.45,
        }}
      >
        <Info size={13} color="var(--brand-blue)" style={{ flexShrink: 0 }} />
        <span>
          <strong>Decision Support Note: </strong>
          This score prioritizes officer review based on detected verification issues. It does not replace the tender&apos;s qualification criteria or the committee&apos;s final decision.
        </span>
      </div>
    </div>
  );
}
