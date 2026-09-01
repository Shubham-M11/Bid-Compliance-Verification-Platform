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

  return (
    <div className="ent-card" style={{ marginBottom: "1.75rem" }}>
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
            <Calculator size={18} color="var(--brand-blue)" />
            Explainable Score Calculation & Deduction Waterfall
          </div>
          <p className="ent-section-subtitle">
            Itemized math and policy justifications explaining point adjustments from the 100-point review baseline.
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
            {showMethodology ? "Hide Scoring Policy" : "How Scoring Works"}
          </button>
          <span className="ent-badge ent-badge-neutral">100-Pt Baseline</span>
        </div>
      </div>

      {/* Progressive Disclosure: How Scoring Works */}
      {showMethodology && (
        <div
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "1rem 1.25rem",
            marginBottom: "1.25rem",
            fontSize: "0.8rem",
            lineHeight: 1.55,
          }}
        >
          <h4 style={{ fontSize: "0.88rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.4rem" }}>
            Platform Scoring Methodology & Transparency Policy
          </h4>
          <p style={{ color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            This score is a <strong>platform-defined review priority score</strong> designed to help procurement officers
            triage bids efficiently. It is <strong>NOT</strong> an official government-issued compliance score and does
            not automatically accept, reject, or award any tender.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.65rem",
              marginTop: "0.5rem",
            }}
          >
            <div style={{ background: "var(--bg-surface)", padding: "0.6rem 0.75rem", borderRadius: "var(--radius-sm)" }}>
              <strong style={{ color: "var(--brand-blue)", display: "block", fontSize: "0.76rem" }}>
                1. Statutory Facts
              </strong>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Deterministic syntax, Luhn Mod-36 checksum, and date boundary evaluations.
              </span>
            </div>
            <div style={{ background: "var(--bg-surface)", padding: "0.6rem 0.75rem", borderRadius: "var(--radius-sm)" }}>
              <strong style={{ color: "#38bdf8", display: "block", fontSize: "0.76rem" }}>
                2. Platform Risk Weights
              </strong>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Configurable point deductions calibrated for tender review triage.
              </span>
            </div>
            <div style={{ background: "var(--bg-surface)", padding: "0.6rem 0.75rem", borderRadius: "var(--radius-sm)" }}>
              <strong style={{ color: "#fbbf24", display: "block", fontSize: "0.76rem" }}>
                3. Anti-Double-Counting
              </strong>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Single primary penalty per root cause; secondary citations receive 0 points.
              </span>
            </div>
            <div style={{ background: "var(--bg-surface)", padding: "0.6rem 0.75rem", borderRadius: "var(--radius-sm)" }}>
              <strong style={{ color: "#34d399", display: "block", fontSize: "0.76rem" }}>
                4. Human Officer Decision
              </strong>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Final qualification judgment remains exclusively with the human officer.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Waterfall Deduction Table */}
      <div style={{ background: "var(--bg-surface)", padding: "1.25rem", borderRadius: "var(--radius-md)" }}>
        <table className="waterfall-table" style={{ width: "100%" }}>
          <tbody>
            <tr>
              <td style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                Base Review Priority Score (Clean Submission)
              </td>
              <td style={{ textAlign: "right", color: "#ffffff", fontWeight: 700 }}>
                100 pts
              </td>
            </tr>

            {breakdown.length === 0 ? (
              <tr>
                <td style={{ color: "var(--status-success-text)", padding: "0.75rem 0" }}>
                  ✓ No statutory deductions applied (Clean Audit)
                </td>
                <td style={{ textAlign: "right", color: "var(--status-success-text)", fontWeight: 600 }}>
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
                      borderBottom: expandedIndex === idx ? "none" : "1px solid var(--border-subtle)",
                      background: expandedIndex === idx ? "rgba(59, 130, 246, 0.05)" : "transparent",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "0.75rem 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ color: "#ffffff", fontWeight: 600, fontSize: "0.85rem" }}>
                          {item.title}
                        </span>
                        {item.is_primary_penalty ? (
                          <span className="ent-badge ent-badge-critical" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>
                            Rule {item.rule_id} · Primary
                          </span>
                        ) : (
                          <span className="ent-badge ent-badge-neutral" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>
                            Rule {item.rule_id} · Deduplicated
                          </span>
                        )}
                        <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: "0.72rem" }}>
                          {expandedIndex === idx ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "3px" }}>
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
                      {item.points_change === 0 ? "0 pts" : `${item.points_change} pts`}
                    </td>
                  </tr>

                  {/* Expanded "Why this weight?" Accordion */}
                  {expandedIndex === idx && (
                    <tr style={{ background: "rgba(15, 23, 42, 0.45)", borderBottom: "1px solid var(--border-subtle)" }}>
                      <td colSpan={2} style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.76rem" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div>
                              <span style={{ color: "var(--text-muted)", fontWeight: 600, display: "block" }}>
                                Procurement Impact
                              </span>
                              <span style={{ color: "#cbd5e1" }}>
                                {item.procurement_impact || "Requires procurement committee review before qualification."}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: "var(--text-muted)", fontWeight: 600, display: "block" }}>
                                Platform Policy Rationale
                              </span>
                              <span style={{ color: "#cbd5e1" }}>
                                {item.policy_rationale || `Platform-defined risk weighting of ${item.points_change} pts.`}
                              </span>
                            </div>
                          </div>

                          {item.triggering_condition && (
                            <div>
                              <span style={{ color: "var(--text-muted)", fontWeight: 600, display: "block" }}>
                                Triggering Condition
                              </span>
                              <span style={{ color: "#94a3b8" }}>{item.triggering_condition}</span>
                            </div>
                          )}

                          {item.is_deduplicated && item.deduplication_reason && (
                            <div
                              style={{
                                background: "rgba(59, 130, 246, 0.08)",
                                padding: "0.4rem 0.6rem",
                                borderRadius: "var(--radius-sm)",
                                borderLeft: "3px solid var(--brand-blue)",
                                color: "#93c5fd",
                              }}
                            >
                              <strong>Anti-Double-Counting Note:</strong> {item.deduplication_reason}
                            </div>
                          )}

                          {item.linked_evidence && item.linked_evidence.length > 0 && (
                            <div>
                              <span style={{ color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "3px" }}>
                                Cited Evidence
                              </span>
                              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                {item.linked_evidence.map((ev, evIdx) => (
                                  <span
                                    key={evIdx}
                                    style={{
                                      background: "var(--bg-surface)",
                                      border: "1px solid var(--border-subtle)",
                                      padding: "2px 8px",
                                      borderRadius: "var(--radius-sm)",
                                      color: "#e2e8f0",
                                      fontSize: "0.72rem",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                    }}
                                  >
                                    <FileText size={11} color="var(--brand-blue)" />
                                    {ev.filename || "Document"} (p. {ev.page_number}) · {ev.extracted_value}
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
              <td style={{ fontSize: "0.92rem", fontWeight: 700, color: "#ffffff", paddingTop: "0.85rem" }}>
                Final Review Priority Score
              </td>
              <td
                style={{
                  textAlign: "right",
                  fontSize: "1.15rem",
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

      {/* Footer Info */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          marginTop: "0.85rem",
        }}
      >
        <Info size={13} color="var(--brand-blue)" />
        <span>
          Click any deduction to inspect its procurement impact, platform weight justification, and cited document evidence.
        </span>
      </div>
    </div>
  );
}
