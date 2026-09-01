"use client";

import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Cpu,
  CreditCard,
  Database,
  Factory,
  FileCheck2,
  Info,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import type {
  GSTINValidationResponse,
  OEMValidationResponse,
  PANValidationResponse,
  StatutoryVerificationsBundle,
  UdyamValidationResponse,
} from "@/services/types/compliance";

interface StatutoryDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "gstin" | "pan" | "udyam" | "oem";
  bundle?: StatutoryVerificationsBundle | null;
}

export default function StatutoryDetailsDrawer({
  isOpen,
  onClose,
  initialTab = "gstin",
  bundle,
}: StatutoryDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<"gstin" | "pan" | "udyam" | "oem">(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const gstin = bundle?.gstin;
  const pan = bundle?.pan;
  const udyam = bundle?.udyam;
  const oem = bundle?.oem;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#ffffff" }}>
              Statutory Verification Details
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Deterministic validation and registry verification records
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
        <div style={{ display: "flex", gap: "0.25rem", padding: "0.75rem 1.5rem", background: "var(--bg-app)", borderBottom: "1px solid var(--border-subtle)" }}>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === "gstin" ? "active" : ""}`}
            onClick={() => setActiveTab("gstin")}
          >
            <Building size={13} /> GSTIN
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === "pan" ? "active" : ""}`}
            onClick={() => setActiveTab("pan")}
          >
            <CreditCard size={13} /> PAN
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === "udyam" ? "active" : ""}`}
            onClick={() => setActiveTab("udyam")}
          >
            <Factory size={13} /> Udyam MSME
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === "oem" ? "active" : ""}`}
            onClick={() => setActiveTab("oem")}
          >
            <FileCheck2 size={13} /> OEM MAF
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {/* GSTIN View */}
          {activeTab === "gstin" && (
            <div>
              {!gstin ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "2rem 0" }}>
                  No GSTIN data submitted for this evaluation.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* Visual 5-Segment GSTIN Breakdown */}
                  <div className="ent-card" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                    <div className="ent-section-title" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      <Cpu size={15} color="var(--brand-blue)" />
                      15-Character GSTIN Structure Breakdown
                    </div>

                    {/* Segment Badges */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.4rem",
                        padding: "0.75rem",
                        background: "var(--bg-app)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-subtle)",
                        marginBottom: "0.85rem",
                        fontFamily: "monospace",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                      }}
                    >
                      <div style={{ padding: "0.35rem 0.55rem", background: "rgba(59, 130, 246, 0.15)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: "var(--radius-sm)", color: "#93c5fd", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>State (1-2)</div>
                        <div>{gstin.gstin.slice(0, 2)}</div>
                      </div>
                      <div style={{ padding: "0.35rem 0.55rem", background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.3)", borderRadius: "var(--radius-sm)", color: "#c084fc", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>PAN (3-12)</div>
                        <div>{gstin.gstin.slice(2, 12)}</div>
                      </div>
                      <div style={{ padding: "0.35rem 0.55rem", background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "var(--radius-sm)", color: "#86efac", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>Entity (13)</div>
                        <div>{gstin.gstin[12] || "—"}</div>
                      </div>
                      <div style={{ padding: "0.35rem 0.55rem", background: "rgba(234, 179, 8, 0.15)", border: "1px solid rgba(234, 179, 8, 0.3)", borderRadius: "var(--radius-sm)", color: "#fde047", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>Const (14)</div>
                        <div>{gstin.gstin[13] || "—"}</div>
                      </div>
                      <div style={{ padding: "0.35rem 0.55rem", background: gstin.deterministic.is_checksum_valid ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)", border: gstin.deterministic.is_checksum_valid ? "1px solid rgba(34, 197, 94, 0.4)" : "1px solid rgba(239, 68, 68, 0.4)", borderRadius: "var(--radius-sm)", color: gstin.deterministic.is_checksum_valid ? "#86efac" : "#fca5a5", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>Checksum (15)</div>
                        <div>{gstin.gstin[14] || "—"}</div>
                      </div>
                    </div>

                    {/* Segment Details Table */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.8rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>1-2: State Jurisdiction</span>
                        <span style={{ color: "#cbd5e1", fontWeight: 500 }}>
                          {gstin.deterministic.state_name || "Unknown"} (Code: {gstin.deterministic.state_code || "—"})
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>3-12: Embedded PAN</span>
                        <span style={{ color: "#93c5fd", fontWeight: 600 }}>
                          {gstin.deterministic.extracted_pan || "—"} ({gstin.deterministic.entity_type})
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>13: Entity Counter</span>
                        <span style={{ color: "#cbd5e1" }}>
                          Registration serial #{gstin.deterministic.entity_number || "1"} in state
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>14: Default Constant</span>
                        <span>
                          {gstin.deterministic.z_character === "Z" ? (
                            <span className="ent-badge ent-badge-success">'Z' (Statutory Default)</span>
                          ) : (
                            <span className="ent-badge ent-badge-critical">'{gstin.deterministic.z_character}' (Expected 'Z')</span>
                          )}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                        <span style={{ color: "var(--text-secondary)" }}>15: Luhn Mod-36 Checksum</span>
                        <span>
                          {gstin.deterministic.is_checksum_valid ? (
                            <span className="ent-badge ent-badge-success">
                              Verified (Char '{gstin.deterministic.checksum_char}')
                            </span>
                          ) : (
                            <span className="ent-badge ent-badge-critical">
                              Mismatch (Actual: '{gstin.deterministic.checksum_char}', Expected: '{gstin.deterministic.calculated_checksum}')
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Normalization Provenance Notice if applied */}
                    {gstin.deterministic.normalization?.is_normalized && (
                      <div
                        style={{
                          marginTop: "0.75rem",
                          padding: "0.5rem 0.75rem",
                          background: "rgba(59, 130, 246, 0.08)",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.76rem",
                          color: "#93c5fd",
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>Auditable Input Normalization:</div>
                        <div style={{ color: "var(--text-secondary)" }}>Raw Match: <code>{gstin.deterministic.normalization.raw_input}</code></div>
                        <ul style={{ margin: "0.25rem 0 0 1rem", padding: 0 }}>
                          {gstin.deterministic.normalization.normalization_notes.map((note, idx) => (
                            <li key={idx}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Registry Lookup & Standing Section */}
                  <div className="ent-card" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                    <div className="ent-section-title" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      <Database size={15} color="var(--brand-blue)" />
                      Simulated Registry Standing & Health
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Registry Provider</span>
                        <span style={{ color: "#cbd5e1" }}>Simulated GSTN Sandbox</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Record Status</span>
                        <span>
                          {gstin.registry.registry_found ? (
                            <span className="ent-badge ent-badge-success">Record Found</span>
                          ) : (
                            <span className="ent-badge ent-badge-neutral">Record Not Found (0-pt)</span>
                          )}
                        </span>
                      </div>
                      {gstin.registry.record && (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Registered Legal Name</span>
                            <span style={{ color: "#93c5fd", fontWeight: 600, textAlign: "right" }}>
                              {gstin.registry.record.legal_name}
                            </span>
                          </div>
                          {gstin.registry.record.trade_name && (
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "var(--text-secondary)" }}>Trade Name</span>
                              <span style={{ color: "#cbd5e1" }}>{gstin.registry.record.trade_name}</span>
                            </div>
                          )}
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Taxpayer Standing</span>
                            <span>
                              {gstin.registry.record.status === "ACTIVE" ? (
                                <span className="ent-badge ent-badge-success">Active</span>
                              ) : (
                                <span className="ent-badge ent-badge-critical">{gstin.registry.record.status}</span>
                              )}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Taxpayer Category</span>
                            <span style={{ color: "#cbd5e1" }}>
                              {gstin.registry.record.taxpayer_type || "Regular"}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Return Filing Status</span>
                            <span>
                              {gstin.registry.record.is_filing_up_to_date ? (
                                <span className="ent-badge ent-badge-success">Up to Date</span>
                              ) : (
                                <span className="ent-badge ent-badge-critical">Defaults Flagged</span>
                              )}
                            </span>
                          </div>
                          {gstin.registry.record.filing_status_summary && (
                            <div
                              style={{
                                padding: "0.5rem 0.75rem",
                                background: gstin.registry.record.is_filing_up_to_date
                                  ? "rgba(34, 197, 94, 0.08)"
                                  : "rgba(239, 68, 68, 0.08)",
                                border: gstin.registry.record.is_filing_up_to_date
                                  ? "1px solid rgba(34, 197, 94, 0.2)"
                                  : "1px solid rgba(239, 68, 68, 0.2)",
                                borderRadius: "var(--radius-sm)",
                                fontSize: "0.76rem",
                                color: gstin.registry.record.is_filing_up_to_date ? "#86efac" : "#fca5a5",
                                marginTop: "0.25rem",
                              }}
                            >
                              <strong>Compliance Record: </strong>
                              {gstin.registry.record.filing_status_summary}
                            </div>
                          )}
                          {gstin.registry.record.is_composition_dealer && (
                            <div
                              style={{
                                padding: "0.5rem 0.75rem",
                                background: "rgba(234, 179, 8, 0.08)",
                                border: "1px solid rgba(234, 179, 8, 0.25)",
                                borderRadius: "var(--radius-sm)",
                                fontSize: "0.76rem",
                                color: "#fde047",
                                marginTop: "0.25rem",
                              }}
                            >
                              <strong>Composition Scheme Advisory: </strong>
                              {gstin.registry.record.composition_advisory_note}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PAN View */}
          {activeTab === "pan" && (
            <div>
              {!pan ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "2rem 0" }}>
                  No PAN data submitted.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* Visual 5-Segment PAN Breakdown */}
                  <div className="ent-card" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                    <div className="ent-section-title" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      <Cpu size={15} color="var(--brand-blue)" />
                      10-Character PAN Structure Breakdown
                    </div>

                    {/* Segment Badges */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.4rem",
                        padding: "0.75rem",
                        background: "var(--bg-app)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-subtle)",
                        marginBottom: "0.85rem",
                        fontFamily: "monospace",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                      }}
                    >
                      <div style={{ padding: "0.35rem 0.55rem", background: "rgba(59, 130, 246, 0.15)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: "var(--radius-sm)", color: "#93c5fd", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>Series (1-3)</div>
                        <div>{pan.pan.slice(0, 3)}</div>
                      </div>
                      <div style={{ padding: "0.35rem 0.55rem", background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.3)", borderRadius: "var(--radius-sm)", color: "#c084fc", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>Entity (4)</div>
                        <div>{pan.pan[3] || "—"}</div>
                      </div>
                      <div style={{ padding: "0.35rem 0.55rem", background: "rgba(234, 179, 8, 0.15)", border: "1px solid rgba(234, 179, 8, 0.3)", borderRadius: "var(--radius-sm)", color: "#fde047", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>Initial (5)</div>
                        <div>{pan.pan[4] || "—"}</div>
                      </div>
                      <div style={{ padding: "0.35rem 0.55rem", background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "var(--radius-sm)", color: "#86efac", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>Serial (6-9)</div>
                        <div>{pan.pan.slice(5, 9)}</div>
                      </div>
                      <div style={{ padding: "0.35rem 0.55rem", background: "rgba(148, 163, 184, 0.15)", border: "1px solid rgba(148, 163, 184, 0.3)", borderRadius: "var(--radius-sm)", color: "#cbd5e1", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>Suffix (10)</div>
                        <div>{pan.pan[9] || "—"}</div>
                      </div>
                    </div>

                    {/* Segment Details Table */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.8rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>1-3: Alphabetic Series</span>
                        <span style={{ color: "#cbd5e1", fontWeight: 500 }}>{pan.pan.slice(0, 3)} (Sequence prefix)</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>4: Entity Classification</span>
                        <span style={{ color: "#c084fc", fontWeight: 600 }}>
                          {pan.deterministic.entity_type} ({pan.deterministic.entity_type_label || pan.deterministic.entity_type})
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>5: Name Initial Signal</span>
                        <span>
                          {pan.deterministic.name_consistency_signal === "MATCH" ? (
                            <span className="ent-badge ent-badge-success">'{pan.deterministic.fifth_character}' Consistent</span>
                          ) : pan.deterministic.name_consistency_signal === "MISMATCH" ? (
                            <span className="ent-badge ent-badge-warning">'{pan.deterministic.fifth_character}' Mismatch</span>
                          ) : (
                            <span className="ent-badge ent-badge-neutral">'{pan.deterministic.fifth_character || "—"}' (Not Evaluated)</span>
                          )}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>6-9: Sequential Number</span>
                        <span style={{ color: "#cbd5e1" }}>{pan.pan.slice(5, 9)} (Numeric sequence)</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                        <span style={{ color: "var(--text-secondary)" }}>10: Final Character / Suffix</span>
                        <span style={{ color: "#94a3b8" }}>
                          '{pan.pan[9] || "—"}' (Alphabetic Identifier Suffix — No Checksum per ITD Spec)
                        </span>
                      </div>
                    </div>

                    {/* Normalization Provenance Notice if applied */}
                    {pan.deterministic.normalization?.is_normalized && (
                      <div
                        style={{
                          marginTop: "0.75rem",
                          padding: "0.5rem 0.75rem",
                          background: "rgba(59, 130, 246, 0.08)",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.76rem",
                          color: "#93c5fd",
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>Auditable Input Normalization:</div>
                        <div style={{ color: "var(--text-secondary)" }}>Raw Match: <code>{pan.deterministic.normalization.raw_input}</code></div>
                        <ul style={{ margin: "0.25rem 0 0 1rem", padding: 0 }}>
                          {pan.deterministic.normalization.normalization_notes.map((note, idx) => (
                            <li key={idx}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Registry Lookup Section */}
                  <div className="ent-card" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                    <div className="ent-section-title" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      <Database size={15} color="var(--brand-blue)" />
                      Simulated PAN Registry Record
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Record Status</span>
                        <span>
                          {pan.registry.registry_found ? (
                            <span className="ent-badge ent-badge-success">Record Found</span>
                          ) : (
                            <span className="ent-badge ent-badge-neutral">Record Not Found (0-pt)</span>
                          )}
                        </span>
                      </div>
                      {pan.registry.record && (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Registered Legal Name</span>
                            <span style={{ color: "#93c5fd", fontWeight: 600 }}>{pan.registry.record.full_name}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Operational Status</span>
                            <span>
                              {pan.registry.record.pan_status.toLowerCase() === "active" ? (
                                <span className="ent-badge ent-badge-success">Active</span>
                              ) : (
                                <span className="ent-badge ent-badge-critical">{pan.registry.record.pan_status}</span>
                              )}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Taxpayer Category</span>
                            <span style={{ color: "#cbd5e1" }}>{pan.registry.record.category}</span>
                          </div>
                          {pan.registry.record.aadhaar_seeding_status && (
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "var(--text-secondary)" }}>Aadhaar Seeding Status</span>
                              <span style={{ color: "#cbd5e1" }}>{pan.registry.record.aadhaar_seeding_status}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Udyam View */}
          {activeTab === "udyam" && (
            <div>
              {!udyam ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "2rem 0" }}>
                  No Udyam MSME certificate submitted for this bid.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* Visual 4-Segment Udyam Breakdown */}
                  <div className="ent-card" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                    <div className="ent-section-title" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      <Cpu size={15} color="var(--brand-blue)" />
                      Udyam Registration Number Structure Breakdown
                    </div>

                    {/* Segment Badges */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.4rem",
                        padding: "0.75rem",
                        background: "var(--bg-app)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-subtle)",
                        marginBottom: "0.85rem",
                        fontFamily: "monospace",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                      }}
                    >
                      <div style={{ padding: "0.35rem 0.55rem", background: "rgba(59, 130, 246, 0.15)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: "var(--radius-sm)", color: "#93c5fd", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>Scheme</div>
                        <div>UDYAM</div>
                      </div>
                      <div style={{ padding: "0.35rem 0.55rem", background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.3)", borderRadius: "var(--radius-sm)", color: "#c084fc", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>State</div>
                        <div>{udyam.deterministic.state_code || udyam.udyam_registration_number.split("-")[1] || "—"}</div>
                      </div>
                      <div style={{ padding: "0.35rem 0.55rem", background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "var(--radius-sm)", color: "#86efac", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>District (Parsed)</div>
                        <div>{udyam.deterministic.district_code || udyam.udyam_registration_number.split("-")[2] || "—"}</div>
                      </div>
                      <div style={{ padding: "0.35rem 0.55rem", background: "rgba(234, 179, 8, 0.15)", border: "1px solid rgba(234, 179, 8, 0.3)", borderRadius: "var(--radius-sm)", color: "#fde047", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>Serial Number</div>
                        <div>{udyam.deterministic.sequential_id || udyam.udyam_registration_number.split("-")[3] || "—"}</div>
                      </div>
                    </div>

                    {/* Segment Details Table */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.8rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Scheme Prefix</span>
                        <span style={{ color: "#93c5fd", fontWeight: 600 }}>Ministry of MSME (Udyam)</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>State / UT Jurisdiction</span>
                        <span style={{ color: "#cbd5e1", fontWeight: 500 }}>
                          {udyam.deterministic.state_name || "—"} (Code: {udyam.deterministic.state_code || "—"})
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>District Identifier</span>
                        <span style={{ color: "#cbd5e1" }}>
                          Parsed registration component (District Code: {udyam.deterministic.district_code || "—"})
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Sequential Registration ID</span>
                        <span style={{ color: "#cbd5e1" }}>
                          Enterprise Serial #{udyam.deterministic.sequential_id || "—"}
                        </span>
                      </div>
                    </div>

                    {/* Normalization Provenance Notice if applied */}
                    {udyam.deterministic.normalization?.is_normalized && (
                      <div
                        style={{
                          marginTop: "0.75rem",
                          padding: "0.5rem 0.75rem",
                          background: "rgba(59, 130, 246, 0.08)",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.76rem",
                          color: "#93c5fd",
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>Auditable Input Normalization:</div>
                        <div style={{ color: "var(--text-secondary)" }}>Raw Match: <code>{udyam.deterministic.normalization.raw_input}</code></div>
                        <ul style={{ margin: "0.25rem 0 0 1rem", padding: 0 }}>
                          {udyam.deterministic.normalization.normalization_notes.map((note, idx) => (
                            <li key={idx}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Registry Record & Policy Advisories */}
                  <div className="ent-card" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                    <div className="ent-section-title" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      <Database size={15} color="var(--brand-blue)" />
                      Simulated MSME Standing & Policy Advisories
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Record Status</span>
                        <span>
                          {udyam.registry.registry_found ? (
                            <span className="ent-badge ent-badge-success">Record Found</span>
                          ) : (
                            <span className="ent-badge ent-badge-neutral">Record Not Found (0-pt)</span>
                          )}
                        </span>
                      </div>
                      {udyam.registry.record && (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Enterprise Name</span>
                            <span style={{ color: "#93c5fd", fontWeight: 600 }}>
                              {udyam.registry.record.enterprise_name}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Enterprise Classification</span>
                            <span style={{ color: "#cbd5e1" }}>
                              {udyam.registry.record.enterprise_tier} • {udyam.registry.record.major_activity}
                            </span>
                          </div>
                          {udyam.registry.record.organization_type && (
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "var(--text-secondary)" }}>Organization Type</span>
                              <span style={{ color: "#cbd5e1" }}>{udyam.registry.record.organization_type}</span>
                            </div>
                          )}
                          {udyam.registry.record.nic_codes && udyam.registry.record.nic_codes.length > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "var(--text-secondary)" }}>Registered NIC Codes</span>
                              <span style={{ color: "#cbd5e1" }}>{udyam.registry.record.nic_codes.join(", ")}</span>
                            </div>
                          )}

                          {/* Tender-Dependent MSME Benefits Advisory Card */}
                          <div
                            style={{
                              marginTop: "0.5rem",
                              padding: "0.75rem",
                              background: "rgba(59, 130, 246, 0.06)",
                              border: "1px solid rgba(59, 130, 246, 0.2)",
                              borderRadius: "var(--radius-sm)",
                              fontSize: "0.76rem",
                            }}
                          >
                            <div style={{ fontWeight: 600, color: "#93c5fd", marginBottom: "0.4rem" }}>
                              Tender-Dependent MSME Procurement Advisories:
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", color: "var(--text-secondary)" }}>
                              <div>
                                <strong style={{ color: "#cbd5e1" }}>EMD Exemption: </strong>
                                {udyam.registry.record.advisory_benefits.emd_exemption_eligible ? (
                                  <span style={{ color: "#86efac" }}>Indicative Eligibility (Subject to Tender Terms)</span>
                                ) : (
                                  <span style={{ color: "#fca5a5" }}>Generally Ineligible for Pure Trading/Resale</span>
                                )}
                                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
                                  {udyam.registry.record.advisory_benefits.emd_exemption_advisory}
                                </div>
                              </div>
                              <div>
                                <strong style={{ color: "#cbd5e1" }}>Prior Turnover / Experience: </strong>
                                <span style={{ color: "#cbd5e1" }}>Clause-Dependent under GFR Rule 173(i)</span>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
                                  {udyam.registry.record.advisory_benefits.prior_experience_advisory}
                                </div>
                              </div>
                              <div>
                                <strong style={{ color: "#cbd5e1" }}>Purchase Preference: </strong>
                                <span style={{ color: "#cbd5e1" }}>L1+15% Band (Applicable if Tender Permits)</span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OEM MAF View */}
          {activeTab === "oem" && (
            <div>
              {!oem ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "2rem 0" }}>
                  No OEM Authorization Form submitted for this bid.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* Visual 6-Part MAF Breakdown */}
                  <div className="ent-card" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                    <div className="ent-section-title" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      <Cpu size={15} color="var(--brand-blue)" />
                      Manufacturer Authorization Form (MAF) Breakdown
                    </div>

                    {/* Segment Badges */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.4rem",
                        padding: "0.75rem",
                        background: "var(--bg-app)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-subtle)",
                        marginBottom: "0.85rem",
                        fontFamily: "monospace",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                      }}
                    >
                      <div style={{ padding: "0.35rem 0.55rem", background: "rgba(59, 130, 246, 0.15)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: "var(--radius-sm)", color: "#93c5fd", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>MAF Ref</div>
                        <div>{oem.maf_number || "NOT_SPECIFIED"}</div>
                      </div>
                      <div style={{ padding: "0.35rem 0.55rem", background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.3)", borderRadius: "var(--radius-sm)", color: "#c084fc", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>Manufacturer</div>
                        <div>{oem.oem_name.split(" ")[0] || "OEM"}</div>
                      </div>
                      <div style={{ padding: "0.35rem 0.55rem", background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "var(--radius-sm)", color: "#86efac", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>Partner / Bidder</div>
                        <div>{oem.authorized_partner_name.split(" ")[0] || "Partner"}</div>
                      </div>
                      <div style={{ padding: "0.35rem 0.55rem", background: "rgba(234, 179, 8, 0.15)", border: "1px solid rgba(234, 179, 8, 0.3)", borderRadius: "var(--radius-sm)", color: "#fde047", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>Validity Standing</div>
                        <div>
                          {oem.deterministic.is_expired
                            ? "EXPIRED"
                            : oem.deterministic.is_valid_on_bid_date
                            ? "ACTIVE"
                            : "INVALID"}
                        </div>
                      </div>
                    </div>

                    {/* Segment Details Table */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.8rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Manufacturer / OEM Entity</span>
                        <span style={{ color: "#ffffff", fontWeight: 600 }}>{oem.oem_name}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Authorized Partner / Bidder</span>
                        <span style={{ color: "#93c5fd", fontWeight: 600 }}>{oem.authorized_partner_name}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>MAF Certificate Reference</span>
                        <code style={{ color: "#cbd5e1" }}>{oem.maf_number || "Not Specified in Document"}</code>
                      </div>
                      {oem.deterministic.structure_breakdown?.tender_reference && (
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                          <span style={{ color: "var(--text-secondary)" }}>Linked Tender Reference</span>
                          <span style={{ color: "#cbd5e1" }}>{oem.deterministic.structure_breakdown.tender_reference}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Temporal Window Status</span>
                        <span>
                          {oem.deterministic.is_expired ? (
                            <span className="ent-badge ent-badge-critical">
                              Expired ({oem.deterministic.days_until_expiry}d ago)
                            </span>
                          ) : oem.deterministic.is_valid_on_bid_date ? (
                            <span className="ent-badge ent-badge-success">
                              Valid on Bid Date ({oem.deterministic.days_until_expiry ?? "Active"}d remaining)
                            </span>
                          ) : (
                            <span className="ent-badge ent-badge-warning">Not Effective on Bid Date</span>
                          )}
                        </span>
                      </div>
                      {oem.deterministic.structure_breakdown?.scope_of_authorization && (
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                          <span style={{ color: "var(--text-secondary)" }}>Scope of Authorization</span>
                          <span style={{ color: "#cbd5e1" }}>{oem.deterministic.structure_breakdown.scope_of_authorization}</span>
                        </div>
                      )}
                      {oem.deterministic.structure_breakdown?.signatory_name && (
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                          <span style={{ color: "var(--text-secondary)" }}>Authorised Signatory</span>
                          <span style={{ color: "#cbd5e1" }}>
                            {oem.deterministic.structure_breakdown.signatory_name}
                            {oem.deterministic.structure_breakdown.signatory_designation
                              ? ` (${oem.deterministic.structure_breakdown.signatory_designation})`
                              : ""}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Normalization Provenance Notice if applied */}
                    {oem.deterministic.normalization?.is_normalized && (
                      <div
                        style={{
                          marginTop: "0.75rem",
                          padding: "0.5rem 0.75rem",
                          background: "rgba(59, 130, 246, 0.08)",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.76rem",
                          color: "#93c5fd",
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>Auditable Input Normalization:</div>
                        <div style={{ color: "var(--text-secondary)" }}>Raw Match: <code>{oem.deterministic.normalization.raw_input}</code></div>
                        <ul style={{ margin: "0.25rem 0 0 1rem", padding: 0 }}>
                          {oem.deterministic.normalization.normalization_notes.map((note, idx) => (
                            <li key={idx}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Registry Record & Partner Standing Section */}
                  <div className="ent-card" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                    <div className="ent-section-title" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      <Database size={15} color="var(--brand-blue)" />
                      Simulated OEM Partner Standing Database
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Partner Standing</span>
                        <span>
                          {oem.registry.record?.is_partner_in_oem_database ? (
                            <span className="ent-badge ent-badge-success">Verified Active Partner</span>
                          ) : oem.registry.registry_found ? (
                            <span className="ent-badge ent-badge-critical">Revoked / Non-Compliant</span>
                          ) : (
                            <span className="ent-badge ent-badge-neutral">Unlisted in Mock DB (0-pt)</span>
                          )}
                        </span>
                      </div>
                      {oem.registry.record && (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Tier / Authorization Status</span>
                            <span style={{ color: "#cbd5e1", fontWeight: 600 }}>
                              {oem.registry.record.authorization_status}
                            </span>
                          </div>
                          {oem.registry.record.product_categories && oem.registry.record.product_categories.length > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "var(--text-secondary)" }}>Authorized Product Lines</span>
                              <span style={{ color: "#cbd5e1" }}>{oem.registry.record.product_categories.join(", ")}</span>
                            </div>
                          )}
                          {oem.registry.record.notes && (
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "var(--text-secondary)" }}>Program Scope Notes</span>
                              <span style={{ color: "#94a3b8" }}>{oem.registry.record.notes}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          <button type="button" className="ent-btn ent-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
