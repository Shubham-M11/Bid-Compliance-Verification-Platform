"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  FileCheck,
  FileText,
  Filter,
  History,
  Printer,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  XCircle,
} from "lucide-react";
import type {
  OfficerActionType,
  OfficerDecisionResponse,
} from "@/services/types/compliance";

export interface StoredAuditRecord extends OfficerDecisionResponse {
  bidder_name?: string;
  tender_ref?: string;
  score?: number;
}

export default function AuditHistoryWorkspace() {
  const [auditRecords, setAuditRecords] = useState<StoredAuditRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<StoredAuditRecord | null>(null);

  const refreshRecords = () => {
    try {
      const stored = localStorage.getItem("gem_audit_history");
      if (stored) {
        const parsed: StoredAuditRecord[] = JSON.parse(stored);
        setAuditRecords(parsed);
        if (parsed.length > 0 && !selectedRecord) {
          setSelectedRecord(parsed[0]);
        }
      }
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    refreshRecords();
    window.addEventListener("storage", refreshRecords);
    const interval = setInterval(refreshRecords, 2000);
    return () => {
      window.removeEventListener("storage", refreshRecords);
      clearInterval(interval);
    };
  }, [selectedRecord]);

  const getActionBadge = (action: OfficerActionType) => {
    switch (action) {
      case "RECOMMEND_ACCEPTANCE":
        return (
          <span className="ent-badge ent-badge-success">
            <CheckCircle2 size={11} /> RECOMMEND ACCEPTANCE
          </span>
        );
      case "EVIDENCE_CONFIRMED":
        return (
          <span className="ent-badge ent-badge-success">
            <FileCheck size={11} /> EVIDENCE CONFIRMED
          </span>
        );
      case "CLARIFICATION_REQUESTED":
        return (
          <span className="ent-badge ent-badge-warning">
            <AlertTriangle size={11} /> CLARIFICATION REQUESTED
          </span>
        );
      case "ESCALATED_FOR_MANUAL_REVIEW":
        return (
          <span className="ent-badge ent-badge-warning">
            <ShieldAlert size={11} /> ESCALATED FOR REVIEW
          </span>
        );
      case "RECOMMEND_REJECTION":
        return (
          <span className="ent-badge ent-badge-critical">
            <XCircle size={11} /> RECOMMEND DISQUALIFICATION
          </span>
        );
      default:
        return <span className="ent-badge ent-badge-blue">{action}</span>;
    }
  };

  const filteredRecords = auditRecords.filter(
    (r) =>
      r.decision_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.officer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.bidder_name && r.bidder_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.tender_ref && r.tender_ref.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            Procurement Audit History
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Official log of human officer compliance decisions, acknowledged findings, and audit trails.
          </p>
        </div>

        {auditRecords.length > 0 && (
          <button
            type="button"
            className="ent-btn ent-btn-secondary"
            onClick={handlePrint}
          >
            <Printer size={14} />
            <span>Print Audit Summary</span>
          </button>
        )}
      </div>

      {auditRecords.length === 0 ? (
        /* Clean Empty State */
        <div
          className="ent-card"
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            background: "var(--bg-surface)",
            border: "1px dashed var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            marginTop: "1.5rem",
          }}
        >
          <History size={44} color="var(--brand-blue)" style={{ margin: "0 auto 1rem auto" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
            No audit records yet.
          </h3>
          <p
            style={{
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
              maxWidth: "520px",
              margin: "0 auto",
              lineHeight: 1.5,
            }}
          >
            Officer compliance evaluations and decision sign-offs recorded during reviews will be permanently tracked here for tender committee inspection and compliance audit.
          </p>
        </div>
      ) : (
        /* Audit Records Master-Detail View */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "360px 1fr",
            gap: "1.5rem",
          }}
        >
          {/* Left Column: Decision List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search audit records..."
                className="ent-input"
                style={{ paddingLeft: "2.2rem" }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "55%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
            </div>

            {/* List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {filteredRecords.map((rec) => {
                const isSelected = selectedRecord?.decision_id === rec.decision_id;
                return (
                  <div
                    key={rec.decision_id}
                    onClick={() => setSelectedRecord(rec)}
                    style={{
                      padding: "1rem",
                      background: isSelected ? "var(--bg-surface)" : "var(--bg-primary)",
                      border: isSelected ? "1px solid var(--brand-blue)" : "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    className="ent-card-hover"
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--brand-blue)", fontFamily: "var(--font-mono)" }}>
                        {rec.decision_id}
                      </span>
                      {getActionBadge(rec.action)}
                    </div>

                    <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                      {rec.bidder_name || "Bidder Submission"}
                    </div>

                    <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
                      <span>{rec.officer_name}</span>
                      <span>{new Date(rec.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Record Detail View */}
          <div>
            {selectedRecord && (
              <div className="ent-card" style={{ borderLeft: "4px solid var(--brand-blue)" }}>
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    paddingBottom: "1.25rem",
                    borderBottom: "1px solid var(--border-subtle)",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                      Official Decision Record
                    </div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                      {selectedRecord.decision_id}
                    </h3>
                  </div>

                  <div>{getActionBadge(selectedRecord.action)}</div>
                </div>

                {/* Metadata Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                    fontSize: "0.82rem",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.74rem", display: "block" }}>Tender Reference</span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{selectedRecord.tender_ref || "GEM/2026/B/890123"}</span>
                  </div>

                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.74rem", display: "block" }}>Bidder Legal Name</span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{selectedRecord.bidder_name || "Tech Mahindra Limited"}</span>
                  </div>

                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.74rem", display: "block" }}>Reviewing Officer</span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{selectedRecord.officer_name} ({selectedRecord.officer_designation})</span>
                  </div>

                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.74rem", display: "block" }}>Recorded Timestamp</span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{new Date(selectedRecord.timestamp).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Status Summary Statement */}
                <div
                  style={{
                    padding: "0.85rem 1rem",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "0.2rem" }}>
                    Executive Summary Statement
                  </div>
                  <div style={{ fontSize: "0.84rem", color: "var(--text-primary)", fontWeight: 500 }}>
                    {selectedRecord.status_summary}
                  </div>
                </div>

                {/* Officer Notes */}
                {selectedRecord.officer_notes && (
                  <div style={{ marginBottom: "1.25rem" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                      Officer Evaluation Notes & Committee Rationale
                    </div>
                    <div
                      style={{
                        padding: "0.85rem 1rem",
                        background: "var(--bg-app)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.82rem",
                        color: "var(--text-primary)",
                        lineHeight: 1.5,
                      }}
                    >
                      {selectedRecord.officer_notes}
                    </div>
                  </div>
                )}

                {/* Acknowledged Findings */}
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                    Reviewed & Acknowledged Findings ({selectedRecord.findings_reviewed.length})
                  </div>
                  {selectedRecord.findings_reviewed.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                      {selectedRecord.findings_reviewed.map((fId) => (
                        <span
                          key={fId}
                          className="ent-badge ent-badge-neutral"
                          style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}
                        >
                          {fId}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      No adverse findings flagged for this submission.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
