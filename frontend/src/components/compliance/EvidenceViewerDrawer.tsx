"use client";

import React from "react";
import {
  CheckCircle2,
  FileSearch,
  FileText,
  Info,
  Link2,
  ShieldCheck,
  X,
} from "lucide-react";
import type { EvidenceItem } from "@/services/types/compliance";

interface EvidenceViewerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  evidence?: EvidenceItem | null;
}

export default function EvidenceViewerDrawer({
  isOpen,
  onClose,
  evidence,
}: EvidenceViewerDrawerProps) {
  if (!isOpen || !evidence) return null;

  const renderSnippetWithHighlight = (snippet?: string | null, targetVal?: string | null) => {
    if (!snippet) {
      return (
        <div style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
          Context snippet was extracted from document structured text. Target value:{" "}
          <strong style={{ color: "#ffffff" }}>{targetVal || "Not specified"}</strong>
        </div>
      );
    }

    if (!targetVal || !snippet.includes(targetVal)) {
      return snippet;
    }

    const parts = snippet.split(targetVal);
    return (
      <>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
              <span className="evidence-target-tag">{targetVal}</span>
            )}
          </React.Fragment>
        ))}
      </>
    );
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <FileSearch size={16} color="var(--brand-blue)" />
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#ffffff" }}>
                Document Evidence Inspector
              </h3>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Page-level extracted text and verification rule linkage
            </p>
          </div>

          <button
            type="button"
            className="ent-btn ent-btn-secondary ent-btn-sm"
            onClick={onClose}
          >
            <X size={15} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Document Metadata Card */}
            <div className="ent-card" style={{ background: "var(--bg-surface)" }}>
              <div className="ent-section-title" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                <FileText size={15} color="var(--brand-blue)" />
                Source Document & Provenance
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.82rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Filename</span>
                  <span style={{ color: "#93c5fd", fontWeight: 600 }}>
                    {evidence.filename || "Bid Submission Document"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Page Number</span>
                  <span style={{ color: "#ffffff", fontWeight: 600 }}>
                    {evidence.page_number ? `Page ${evidence.page_number}` : "User Supplied / Header"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Target Field</span>
                  <span style={{ color: "#ffffff", fontWeight: 600 }}>{evidence.field_name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Provenance Type</span>
                  <span className="ent-badge ent-badge-neutral">{evidence.source_type}</span>
                </div>
              </div>
            </div>

            {/* Extracted Document Text Excerpt */}
            <div>
              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "#ffffff",
                  marginBottom: "0.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Document Text Excerpt:</span>
                {evidence.page_number && (
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Source: Page {evidence.page_number}
                  </span>
                )}
              </div>

              <div className="evidence-highlight-box">
                {renderSnippetWithHighlight(
                  evidence.context_snippet,
                  evidence.extracted_value
                )}
              </div>
            </div>

            {/* Rule Citation & Finding Details */}
            <div className="ent-card" style={{ background: "var(--bg-surface)" }}>
              <div className="ent-section-title" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                <Link2 size={15} color="var(--brand-blue)" />
                Linked Verification Rule & Finding
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.82rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Rule Code</span>
                  <span className="ent-badge ent-badge-blue">{evidence.rule_id}</span>
                </div>
                <div>
                  <div style={{ color: "var(--text-secondary)", marginBottom: "2px" }}>Audit Observation:</div>
                  <div style={{ color: "#ffffff", fontWeight: 500 }}>{evidence.finding_description}</div>
                </div>

                {evidence.extracted_value && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Extracted Match</span>
                    <code style={{ color: "#93c5fd" }}>{evidence.extracted_value}</code>
                  </div>
                )}

                {evidence.comparison_value && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Comparison Value</span>
                    <code style={{ color: "#cbd5e1" }}>{evidence.comparison_value}</code>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="drawer-footer">
          <button type="button" className="ent-btn ent-btn-secondary" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
