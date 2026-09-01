"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCheck,
  FileSearch,
  FileText,
  HelpCircle,
  Link2,
  XCircle,
} from "lucide-react";
import type {
  CheckStatus,
  CrossConsistencyCheckResult,
  EvidenceItem,
} from "@/services/types/compliance";

interface CrossEntityTableProps {
  checks: CrossConsistencyCheckResult[];
  onInspectEvidence?: (evidence: EvidenceItem) => void;
}

export default function CrossEntityTable({
  checks,
  onInspectEvidence,
}: CrossEntityTableProps) {
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  const toggleRow = (ruleId: string) => {
    setExpandedRule(expandedRule === ruleId ? null : ruleId);
  };

  const passCount = checks.filter((c) => c.status === "PASS").length;
  const warnCount = checks.filter(
    (c) => c.status === "WARNING" || c.status === "REVIEW_REQUIRED"
  ).length;
  const failCount = checks.filter((c) => c.status === "FAIL").length;
  const naCount = checks.filter((c) => c.status === "NOT_APPLICABLE").length;

  const getStatusBadge = (status: CheckStatus) => {
    switch (status) {
      case "PASS":
        return (
          <span className="ent-badge ent-badge-success">
            <CheckCircle2 size={11} /> Passed
          </span>
        );
      case "WARNING":
      case "REVIEW_REQUIRED":
        return (
          <span className="ent-badge ent-badge-warning">
            <AlertTriangle size={11} /> Needs Review
          </span>
        );
      case "FAIL":
        return (
          <span className="ent-badge ent-badge-critical">
            <XCircle size={11} /> Failed
          </span>
        );
      case "NOT_APPLICABLE":
        return (
          <span className="ent-badge ent-badge-neutral">
            <HelpCircle size={11} /> Not Applicable
          </span>
        );
      default:
        return <span className="ent-badge ent-badge-neutral">{status}</span>;
    }
  };

  return (
    <div className="ent-card" style={{ marginBottom: "1.75rem" }}>
      {/* Section Header */}
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
            <Link2 size={18} color="var(--brand-blue)" />
            <span>Cross-Document Consistency Checks</span>
          </div>
          <p className="ent-section-subtitle">
            Relational verification across PAN, GSTIN, legal names, OEM authorizations, and tender validity.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <span className="ent-badge ent-badge-success">{passCount} Passed</span>
          {warnCount > 0 && (
            <span className="ent-badge ent-badge-warning">{warnCount} Needs Review</span>
          )}
          {failCount > 0 && (
            <span className="ent-badge ent-badge-critical">{failCount} Failed</span>
          )}
          {naCount > 0 && (
            <span className="ent-badge ent-badge-neutral">{naCount} N/A</span>
          )}
        </div>
      </div>

      {/* Rules Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="consistency-table">
          <thead>
            <tr>
              <th style={{ width: "90px" }}>Rule ID</th>
              <th>Consistency Check</th>
              <th style={{ width: "160px" }}>Result</th>
              <th style={{ textAlign: "right", width: "80px" }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((check) => {
              const isExpanded = expandedRule === check.rule_id;

              return (
                <React.Fragment key={check.rule_id}>
                  <tr
                    className="consistency-row"
                    onClick={() => toggleRow(check.rule_id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          color: "var(--brand-blue)",
                        }}
                      >
                        {check.rule_id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {check.rule_name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--text-secondary)",
                          marginTop: "2px",
                          lineHeight: 1.4,
                        }}
                      >
                        {check.summary}
                      </div>
                    </td>
                    <td>{getStatusBadge(check.status)}</td>
                    <td style={{ textAlign: "right", color: "var(--text-muted)" }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          background: "var(--bg-app)",
                          padding: "1.1rem 1.4rem",
                          borderTop: "1px solid var(--border-subtle)",
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "0.5rem",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.8rem",
                                color: "var(--text-primary)",
                                fontWeight: 700,
                              }}
                            >
                              Verification Rule: {check.rule_id} — {check.rule_name}
                            </span>
                            <span
                              style={{
                                fontSize: "0.74rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              Category: {check.category}
                            </span>
                          </div>

                          <p
                            style={{
                              fontSize: "0.82rem",
                              color: "var(--text-secondary)",
                              lineHeight: 1.5,
                              margin: 0,
                            }}
                          >
                            {check.summary}
                          </p>

                          {/* Linked Evidence Citation */}
                          {check.evidence && check.evidence.length > 0 && onInspectEvidence && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginTop: "0.4rem",
                                paddingTop: "0.6rem",
                                borderTop: "1px solid var(--border-subtle)",
                                flexWrap: "wrap",
                                gap: "0.5rem",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.4rem",
                                  fontSize: "0.75rem",
                                  color: "var(--text-muted)",
                                }}
                              >
                                <FileText size={13} color="var(--brand-blue)" />
                                <span>Evidence:</span>
                                {check.evidence.map((ev, evIdx) => (
                                  <span
                                    key={evIdx}
                                    style={{
                                      color: "var(--text-primary)",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {ev.filename || "Bid Document"} {ev.page_number ? `(p. ${ev.page_number})` : ""}
                                    {evIdx < check.evidence.length - 1 ? ", " : ""}
                                  </span>
                                ))}
                              </div>

                              <button
                                type="button"
                                className="ent-btn ent-btn-secondary ent-btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onInspectEvidence(check.evidence[0]);
                                }}
                              >
                                <FileSearch size={12} color="var(--brand-blue)" />
                                <span>Inspect Evidence</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
