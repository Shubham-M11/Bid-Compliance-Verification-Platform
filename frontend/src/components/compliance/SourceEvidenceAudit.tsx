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
      (item.extracted_value && item.extracted_value.toLowerCase().includes(term))
    );
  });

  return (
    <div id="evidence-section" className="ent-card" style={{ marginBottom: "1.75rem" }}>
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
            Source Evidence & Document Provenance
          </div>
          <p className="ent-section-subtitle">
            Every statutory finding is anchored to verifiable document filenames, page numbers, and contextual excerpts.
          </p>
        </div>

        <div style={{ position: "relative", minWidth: "240px" }}>
          <Search
            size={14}
            color="var(--text-muted)"
            style={{ position: "absolute", left: "10px", top: "10px" }}
          />
          <input
            type="text"
            className="ent-input"
            placeholder="Filter evidence or document..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: "2rem", marginTop: 0, fontSize: "0.8rem" }}
          />
        </div>
      </div>

      {filteredList.length === 0 ? (
        <div
          style={{
            padding: "2rem 0",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: "0.85rem",
          }}
        >
          No evidence records found matching the active filter.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="consistency-table">
            <thead>
              <tr>
                <th>Target Field</th>
                <th>Source Document & Page</th>
                <th>Extracted Value / Observation</th>
                <th style={{ textAlign: "right" }}>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((ev, idx) => (
                <tr key={ev.evidence_id || idx}>
                  <td style={{ fontWeight: 600, color: "#ffffff", width: "160px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <FileCheck2 size={14} color="var(--brand-blue)" />
                      {ev.field_name}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                      Rule: {ev.rule_id}
                    </div>
                  </td>
                  <td style={{ width: "200px" }}>
                    <div style={{ color: "#93c5fd", fontWeight: 500 }}>
                      {ev.filename || "Bid Submission Document"}
                    </div>
                    {ev.page_number && (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        Page {ev.page_number}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ color: "#cbd5e1" }}>{ev.finding_description}</div>
                    {ev.extracted_value && (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "3px" }}>
                        Extracted: <code style={{ color: "#ffffff" }}>{ev.extracted_value}</code>
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: "right", width: "110px" }}>
                    <button
                      type="button"
                      className="ent-btn ent-btn-secondary ent-btn-sm"
                      onClick={() => onInspectEvidence(ev)}
                    >
                      <FileSearch size={12} /> Inspect
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
