"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCheck,
  FileSearch,
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
  const warnCount = checks.filter((c) => c.status === "WARNING" || c.status === "REVIEW_REQUIRED").length;
  const failCount = checks.filter((c) => c.status === "FAIL").length;

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
            <AlertTriangle size={11} /> Review
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
            <HelpCircle size={11} /> N/A
          </span>
        );
      default:
        return <span className="ent-badge ent-badge-neutral">{status}</span>;
    }
  };

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
            <Link2 size={18} color="var(--brand-blue)" />
            Cross-Entity Relational Consistency
          </div>
          <p className="ent-section-subtitle">
            Automated cross-document identity, temporal validity, and tender linkage verification.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <span className="ent-badge ent-badge-success">{passCount} Passed</span>
          {warnCount > 0 && <span className="ent-badge ent-badge-warning">{warnCount} Review</span>}
          {failCount > 0 && <span className="ent-badge ent-badge-critical">{failCount} Failed</span>}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="consistency-table">
          <thead>
            <tr>
              <th>Verification Check</th>
              <th>Category</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Details</th>
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
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: "#ffffff" }}>
                        {check.rule_name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1px" }}>
                        {check.summary}
                      </div>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>
                      {check.category}
                    </td>
                    <td>{getStatusBadge(check.status)}</td>
                    <td style={{ textAlign: "right", color: "var(--text-muted)" }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={4} style={{ background: "var(--bg-app)", padding: "1rem 1.25rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.78rem", color: "var(--brand-blue)", fontWeight: 600 }}>
                              Rule Citation: {check.rule_id}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              Severity: {check.severity}
                            </span>
                          </div>

                          <p style={{ fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.45 }}>
                            {check.summary}
                          </p>

                          {check.evidence && check.evidence.length > 0 && (
                            <div style={{ marginTop: "0.4rem" }}>
                              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                                Linked Audit Evidence:
                              </div>
                              {check.evidence.map((ev, evIdx) => (
                                <div
                                  key={ev.evidence_id || evIdx}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    background: "var(--bg-surface)",
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: "var(--radius-xs)",
                                    fontSize: "0.78rem",
                                    marginBottom: "0.35rem",
                                  }}
                                >
                                  <div>
                                    <span style={{ color: "#ffffff", fontWeight: 500 }}>{ev.field_name}: </span>
                                    <span style={{ color: "var(--text-secondary)" }}>{ev.finding_description}</span>
                                    {ev.filename && (
                                      <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                                        ({ev.filename}{ev.page_number ? ` · p.${ev.page_number}` : ""})
                                      </span>
                                    )}
                                  </div>
                                  {onInspectEvidence && (
                                    <button
                                      type="button"
                                      className="ent-btn ent-btn-ghost ent-btn-sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onInspectEvidence(ev);
                                      }}
                                    >
                                      <FileSearch size={12} /> Inspect
                                    </button>
                                  )}
                                </div>
                              ))}
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
