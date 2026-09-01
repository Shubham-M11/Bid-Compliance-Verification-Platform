"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileCheck2,
  FileSearch,
  FileText,
  FolderOpen,
  HelpCircle,
  Info,
  Layers,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  X,
  XCircle,
} from "lucide-react";
import type {
  PresetComplianceScenario,
  SampleBidMetadata,
} from "@/services/types/compliance";

interface EvaluationDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: PresetComplianceScenario[];
  sampleBids: SampleBidMetadata[];
  onSelectPreset: (preset: PresetComplianceScenario) => void;
  onSelectSampleBid: (sample: SampleBidMetadata) => void;
  isLoading?: boolean;
}

export default function EvaluationDemoModal({
  isOpen,
  onClose,
  presets,
  sampleBids,
  onSelectPreset,
  onSelectSampleBid,
  isLoading = false,
}: EvaluationDemoModalProps) {
  const [activeTab, setActiveTab] = useState<"featured" | "samples" | "presets">(
    "featured"
  );

  if (!isOpen) return null;

  const getScoreBadge = (score: number, risk: string) => {
    let badgeClass = "ent-badge-success";
    if (score < 85 && score >= 60) badgeClass = "ent-badge-warning";
    if (score < 60) badgeClass = "ent-badge-critical";

    return (
      <span className={`ent-badge ${badgeClass}`} style={{ fontSize: "0.7rem" }}>
        {score} / 100 · {risk.replace("_", " ")}
      </span>
    );
  };

  // Find sample bids for featured demonstration
  const compliantSample =
    sampleBids.find((s) => s.sample_id.includes("01") || s.expected_score === 100) ||
    sampleBids[0];
  const expiredSample =
    sampleBids.find((s) => s.sample_id.includes("05") || s.sample_id.includes("expired")) ||
    sampleBids[4];
  const ocrSample =
    sampleBids.find((s) => s.sample_id.includes("08") || s.sample_id.includes("ocr")) ||
    sampleBids[7];

  return (
    <div className="ent-modal-overlay" onClick={onClose}>
      <div
        className="ent-modal-content"
        style={{ maxWidth: "800px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: "1rem",
            borderBottom: "1px solid var(--border-subtle)",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Layers size={18} color="var(--brand-blue)" />
              <h3
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                Demo / Evaluation Scenarios
              </h3>
            </div>
            <p
              style={{
                fontSize: "0.78rem",
                color: "var(--text-secondary)",
                marginTop: "2px",
              }}
            >
              Controlled evaluation scenarios for committee demonstration and testing.
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

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className={`ent-btn ${
              activeTab === "featured" ? "ent-btn-primary" : "ent-btn-secondary"
            } ent-btn-sm`}
            onClick={() => setActiveTab("featured")}
          >
            <Star size={13} /> Recommended Judge Scenarios
          </button>
          <button
            type="button"
            className={`ent-btn ${
              activeTab === "samples" ? "ent-btn-primary" : "ent-btn-secondary"
            } ent-btn-sm`}
            onClick={() => setActiveTab("samples")}
          >
            <FolderOpen size={13} /> All Sample PDF Documents ({sampleBids.length || 8})
          </button>
          <button
            type="button"
            className={`ent-btn ${
              activeTab === "presets" ? "ent-btn-primary" : "ent-btn-secondary"
            } ent-btn-sm`}
            onClick={() => setActiveTab("presets")}
          >
            <Sparkles size={13} /> Structured Entity Presets ({presets.length || 6})
          </button>
        </div>

        {/* Informational Guidance Notice */}
        <div
          style={{
            padding: "0.65rem 0.85rem",
            background: "var(--bg-app)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.78rem",
            color: "var(--text-secondary)",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Info size={14} color="var(--brand-blue)" style={{ flexShrink: 0 }} />
          <span>
            Selecting a scenario loads the controlled submission into the normal Review Workspace. Resetting at any time restores the clean empty state.
          </span>
        </div>

        {/* Tab 1: Recommended Judge Demonstrations */}
        {activeTab === "featured" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {/* Scenario A: Clean Compliant */}
            {compliantSample && (
              <div
                className="ent-card"
                style={{
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-subtle)",
                  padding: "1rem 1.25rem",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "border-color 0.15s ease",
                }}
                onClick={() => {
                  onSelectSampleBid(compliantSample);
                  onClose();
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.35rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <span className="ent-badge ent-badge-success" style={{ fontSize: "0.7rem", padding: "1px 6px" }}>
                      ★ Primary Scenario A
                    </span>
                    <strong style={{ fontSize: "0.92rem", color: "var(--text-primary)" }}>
                      Clean & Fully Compliant Submission
                    </strong>
                  </div>
                  {getScoreBadge(compliantSample.expected_score, compliantSample.expected_risk)}
                </div>

                <div style={{ fontSize: "0.78rem", color: "var(--brand-blue)", marginBottom: "0.3rem" }}>
                  {compliantSample.bidder_name} · <span style={{ color: "var(--text-muted)" }}>{compliantSample.tender_ref}</span>
                </div>

                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.45, margin: 0 }}>
                  Active GSTIN in Maharashtra, valid Mod-36 checksum, matching corporate PAN, and verified active HPE OEM authorization. Demonstrates full statutory verification and clean audit record.
                </p>
              </div>
            )}

            {/* Scenario B: Material Compliance Defect */}
            {expiredSample && (
              <div
                className="ent-card"
                style={{
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-subtle)",
                  padding: "1rem 1.25rem",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "border-color 0.15s ease",
                }}
                onClick={() => {
                  onSelectSampleBid(expiredSample);
                  onClose();
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.35rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <span className="ent-badge ent-badge-critical" style={{ fontSize: "0.7rem", padding: "1px 6px" }}>
                      ★ Primary Scenario B
                    </span>
                    <strong style={{ fontSize: "0.92rem", color: "var(--text-primary)" }}>
                      Expired OEM Authorization (Rule R-05 Deduction)
                    </strong>
                  </div>
                  {getScoreBadge(expiredSample.expected_score, expiredSample.expected_risk)}
                </div>

                <div style={{ fontSize: "0.78rem", color: "var(--brand-blue)", marginBottom: "0.3rem" }}>
                  {expiredSample.bidder_name} · <span style={{ color: "var(--text-muted)" }}>{expiredSample.tender_ref}</span>
                </div>

                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.45, margin: 0 }}>
                  Deterministic detection of an expired MAF validity window relative to the bid submission date. Demonstrates plain-English finding, deduction waterfall, and human officer recommendation workflow.
                </p>
              </div>
            )}

            {/* Scenario C: Scanned Document OCR Extraction */}
            {ocrSample && (
              <div
                className="ent-card"
                style={{
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-subtle)",
                  padding: "1rem 1.25rem",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "border-color 0.15s ease",
                }}
                onClick={() => {
                  onSelectSampleBid(ocrSample);
                  onClose();
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.35rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <span className="ent-badge ent-badge-blue" style={{ fontSize: "0.7rem", padding: "1px 6px" }}>
                      ★ Primary Scenario C
                    </span>
                    <strong style={{ fontSize: "0.92rem", color: "var(--text-primary)" }}>
                      Scanned Document & OCR Extraction
                    </strong>
                  </div>
                  {getScoreBadge(ocrSample.expected_score, ocrSample.expected_risk)}
                </div>

                <div style={{ fontSize: "0.78rem", color: "var(--brand-blue)", marginBottom: "0.3rem" }}>
                  {ocrSample.bidder_name} · <span style={{ color: "var(--text-muted)" }}>{ocrSample.tender_ref}</span>
                </div>

                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.45, margin: 0 }}>
                  Real scanned image document processed through the OCR extraction pipeline. Demonstrates optical character recognition, extracted credential regex parsing, and page-level provenance.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: All 8 Sample Bids */}
        {activeTab === "samples" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: "0.75rem",
              maxHeight: "420px",
              overflowY: "auto",
              paddingRight: "4px",
            }}
          >
            {sampleBids.map((sample) => (
              <button
                key={sample.sample_id}
                type="button"
                onClick={() => {
                  onSelectSampleBid(sample);
                  onClose();
                }}
                disabled={isLoading}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  padding: "0.85rem 1rem",
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
                className="ent-card-hover"
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    alignItems: "center",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    {sample.name}
                  </span>
                  {getScoreBadge(sample.expected_score, sample.expected_risk)}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--brand-blue)",
                    marginBottom: "3px",
                  }}
                >
                  {sample.bidder_name} ·{" "}
                  <span style={{ color: "var(--text-muted)" }}>
                    {sample.tender_ref}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.74rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.4,
                    margin: 0,
                  }}
                >
                  {sample.description}
                </p>
                {sample.primary_rule && (
                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "0.68rem",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Rule: {sample.primary_rule}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Tab 3: Structured Entity Presets */}
        {activeTab === "presets" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: "0.75rem",
              maxHeight: "420px",
              overflowY: "auto",
              paddingRight: "4px",
            }}
          >
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  onSelectPreset(preset);
                  onClose();
                }}
                disabled={isLoading}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  padding: "0.85rem 1rem",
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
                className="ent-card-hover"
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    alignItems: "center",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    {preset.name}
                  </span>
                  <span className="ent-badge ent-badge-neutral" style={{ fontSize: "0.68rem" }}>
                    {preset.category}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.74rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.4,
                    margin: 0,
                  }}
                >
                  {preset.description}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
