"use client";

import React, { useState } from "react";
import {
  FileCheck2,
  FileSearch,
  FileText,
  Filter,
  Search,
} from "lucide-react";
import type { EvidenceItem } from "@/services/types/compliance";

interface SourceEvidenceAuditProps {
  evidenceList: EvidenceItem[];
  onInspectEvidence: (evidence: EvidenceItem) => void;
}

export default function SourceEvidenceAudit({
  evidenceList,
  onInspectEvidence,
}: SourceEvidenceAuditProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredList = evidenceList.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      searchTerm === "" ||
      item.field_name.toLowerCase().includes(term) ||
      item.finding_description.toLowerCase().includes(term) ||
      (item.filename && item.filename.toLowerCase().includes(term)) ||
      (item.extracted_value && item.extracted_value.toLowerCase().includes(term)) ||
      (item.rule_id && item.rule_id.toLowerCase().includes(term))
    );
  });

  const getVerificationPurpose = (ruleId?: string, fieldName?: string) => {
    if (ruleId === "R-01" || fieldName?.includes("PAN") || fieldName?.includes("GSTIN")) {
      return "PAN ↔ GSTIN statutory identity linkage";
    }
    if (ruleId === "R-02" || fieldName?.includes("LEGAL_NAME")) {
      return "Cross-certificate legal name consistency";
    }
    if (ruleId === "R-03" || fieldName?.includes("OEM") || fieldName?.includes("MAF")) {
      return "Bidder ↔ OEM authorized partner standing";
    }
    if (ruleId === "R-04" || fieldName?.includes("TENDER")) {
      return "Tender reference alignment check";
    }
    if (ruleId === "R-05" || fieldName?.includes("DATE")) {
      return "OEM MAF temporal validity window check";
    }
    if (ruleId === "R-06" || fieldName?.includes("UDYAM")) {
      return "Udyam enterprise tier & EMD waiver eligibility";
    }
    if (ruleId === "R-07" || fieldName?.includes("STATE")) {
      return "State jurisdiction alignment check";
    }
    return "Statutory document verification";
  };

  return (
    <div id="evidence-section" className="ent-card" style={{ marginBottom: "1.75rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <div>
          <div className="ent-section-title">
            <FileText size={18} color="var(--brand-blue)" />
            <span>Source Evidence & Document Provenance</span>
          </div>
          <p className="ent-section-subtitle">
            Every statutory finding is anchored to verifiable document filenames, page numbers, and contextual excerpts.
          </p>
        </div>

        {/* Filter Input */}
        <div style={{ position: "relative", minWidth: "260px" }}>
          <Search
            size={14}
            color="var(--text-muted)"
            style={{ position: "absolute", left: "10px", top: "10px" }}
          />
          <input
            type="text"
            className="ent-input"
            placeholder="Search document, field, or value..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: "2rem", marginTop: 0, fontSize: "0.8rem" }}
          />
        </div>
      </div>

      {filteredList.length === 0 ? (
        <div
          style={{
            padding: "2.5rem 0",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: "0.85rem",
          }}
        >
          No evidence records found matching the active search.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="consistency-table">
            <thead>
              <tr>
                <th style={{ width: "200px" }}>Document & Page</th>
                <th style={{ width: "160px" }}>Evidence Field</th>
                <th>Extracted Value & Purpose</th>
                <th style={{ textAlign: "right", width: "100px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((ev, idx) => (
                <tr key={ev.evidence_id || idx}>
                  {/* Document & Page */}
                  <td>
                    <div style={{ color: "var(--brand-blue)", fontWeight: 600, fontSize: "0.82rem" }}>
                      {ev.filename || "Bid Submission Document"}
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      {ev.page_number ? `Page ${ev.page_number}` : "Document Header"}
                    </div>
                  </td>

                  {/* Target Field */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontWeight: 600, color: "var(--text-primary)", fontSize: "0.82rem" }}>
                      <FileCheck2 size={13} color="var(--brand-blue)" />
                      <span>{ev.field_name}</span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                      Rule: {ev.rule_id}
                    </div>
                  </td>

                  {/* Extracted Value & Verification Purpose */}
                  <td>
                    <div style={{ color: "var(--text-primary)", fontSize: "0.82rem", lineHeight: 1.4 }}>
                      {ev.finding_description}
                    </div>
                    {ev.extracted_value && (
                      <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "3px" }}>
                        Extracted text: <code style={{ color: "var(--text-primary)", background: "var(--bg-app)", padding: "1px 5px", borderRadius: "3px" }}>{ev.extracted_value}</code>
                      </div>
                    )}
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      Purpose: {getVerificationPurpose(ev.rule_id, ev.field_name)}
                    </div>
                  </td>

                  {/* Action */}
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="ent-btn ent-btn-secondary ent-btn-sm"
                      onClick={() => onInspectEvidence(ev)}
                    >
                      <FileSearch size={12} color="var(--brand-blue)" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
