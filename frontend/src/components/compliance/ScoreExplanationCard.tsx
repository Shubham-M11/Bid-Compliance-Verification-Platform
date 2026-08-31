"use client";

import React from "react";
import { Calculator, CheckCircle2, HelpCircle, Info } from "lucide-react";
import type { ScoreContribution } from "@/services/types/compliance";

interface ScoreExplanationCardProps {
  score: number;
  breakdown: ScoreContribution[];
}

export default function ScoreExplanationCard({
  score,
  breakdown,
}: ScoreExplanationCardProps) {
  return (
    <div className="ent-card" style={{ marginBottom: "1.75rem" }}>
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
            Score Calculation & Deduction Waterfall
          </div>
          <p className="ent-section-subtitle">
            Itemized math explaining why points were deducted from the 100-point review baseline.
          </p>
        </div>

        <span className="ent-badge ent-badge-neutral">100-Pt Baseline</span>
      </div>

      <div style={{ background: "var(--bg-surface)", padding: "1.25rem", borderRadius: "var(--radius-md)" }}>
        <table className="waterfall-table">
          <tbody>
            <tr>
              <td style={{ color: "var(--text-secondary)" }}>Base Compliance Score (Clean Submission)</td>
              <td style={{ textAlign: "right", color: "#ffffff", fontWeight: 600 }}>100 pts</td>
            </tr>

            {breakdown.length === 0 ? (
              <tr>
                <td style={{ color: "var(--status-success-text)", padding: "0.75rem 0" }}>
                  ✓ No statutory deductions applied
                </td>
                <td style={{ textAlign: "right", color: "var(--status-success-text)", fontWeight: 600 }}>
                  0 pts
                </td>
              </tr>
            ) : (
              breakdown.map((item, idx) => (
                <tr key={`${item.rule_id}_${idx}`}>
                  <td>
                    <div style={{ color: "#ffffff", fontWeight: 500 }}>{item.title}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      {item.is_primary_penalty ? (
                        <span>Primary root deduction · Rule {item.rule_id}</span>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>
                          Related finding (Deduplicated — 0-pt impact to prevent double penalty)
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: 700,
                      color:
                        item.points_change < 0
                          ? "var(--status-critical-text)"
                          : "var(--status-success-text)",
                    }}
                  >
                    {item.points_change === 0 ? "0 pts" : `${item.points_change} pts`}
                  </td>
                </tr>
              ))
            )}

            <tr>
              <td style={{ fontSize: "0.92rem" }}>Final Review Priority Score</td>
              <td
                style={{
                  textAlign: "right",
                  fontSize: "1.1rem",
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

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          fontSize: "0.76rem",
          color: "var(--text-muted)",
          marginTop: "0.85rem",
        }}
      >
        <Info size={13} color="var(--brand-blue)" />
        <span>
          Deductions follow standard tender evaluation weights. Expiries and format defects receive a single primary deduction.
        </span>
      </div>
    </div>
  );
}
