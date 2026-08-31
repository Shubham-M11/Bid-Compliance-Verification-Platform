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
                  {/* Deterministic Section */}
                  <div className="ent-card" style={{ background: "var(--bg-surface)" }}>
                    <div className="ent-section-title" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      <Cpu size={15} color="var(--brand-blue)" />
                      Deterministic Algorithmic Validation
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Input GSTIN</span>
                        <code style={{ color: "#ffffff", fontWeight: 600 }}>{gstin.gstin}</code>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>15-Character Syntax</span>
                        <span>
                          {gstin.deterministic.is_format_valid ? (
                            <span className="ent-badge ent-badge-success">Valid Regex</span>
                          ) : (
                            <span className="ent-badge ent-badge-critical">Invalid Format</span>
                          )}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>State Code / Territory</span>
                        <span style={{ color: "#cbd5e1" }}>
                          {gstin.deterministic.state_code || "—"} ({gstin.deterministic.state_name || "Unknown"})
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Embedded 10-char PAN</span>
                        <code style={{ color: "#93c5fd" }}>{gstin.deterministic.extracted_pan || "—"}</code>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Luhn Mod-36 Checksum</span>
                        <span>
                          {gstin.deterministic.is_checksum_valid ? (
                            <span className="ent-badge ent-badge-success">
                              Char: {gstin.deterministic.checksum_char} (Verified)
                            </span>
                          ) : (
                            <span className="ent-badge ent-badge-critical">
                              Mismatch (Expected: {gstin.deterministic.calculated_checksum})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Registry Lookup Section */}
                  <div className="ent-card" style={{ background: "var(--bg-surface)" }}>
                    <div className="ent-section-title" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      <Database size={15} color="var(--brand-blue)" />
                      Simulated Registry Record
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
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Taxpayer Status</span>
                            <span>
                              {gstin.registry.record.status === "ACTIVE" ? (
                                <span className="ent-badge ent-badge-success">Active</span>
                              ) : (
                                <span className="ent-badge ent-badge-critical">{gstin.registry.record.status}</span>
                              )}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Return Filing Compliant</span>
                            <span>
                              {gstin.registry.record.is_filing_up_to_date ? (
                                <span className="ent-badge ent-badge-success">Up to Date</span>
                              ) : (
                                <span className="ent-badge ent-badge-critical">Defaults Flagged</span>
                              )}
                            </span>
                          </div>
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
                  <div className="ent-card" style={{ background: "var(--bg-surface)" }}>
                    <div className="ent-section-title" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      <Cpu size={15} color="var(--brand-blue)" />
                      Deterministic PAN Decoding
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Input PAN</span>
                        <code style={{ color: "#ffffff", fontWeight: 600 }}>{pan.pan}</code>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>10-Character Structure</span>
                        <span>
                          {pan.deterministic.is_format_valid ? (
                            <span className="ent-badge ent-badge-success">Valid Regex</span>
                          ) : (
                            <span className="ent-badge ent-badge-critical">Invalid Format</span>
                          )}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>4th Character Entity Type</span>
                        <span style={{ color: "#cbd5e1" }}>
                          {pan.deterministic.entity_type} ({pan.deterministic.entity_type_description || "Decoded"})
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>5th Char Name Consistency</span>
                        <span>
                          {pan.deterministic.name_matches_fifth_char === true ? (
                            <span className="ent-badge ent-badge-success">Consistent</span>
                          ) : pan.deterministic.name_matches_fifth_char === false ? (
                            <span className="ent-badge ent-badge-warning">Mismatch</span>
                          ) : (
                            <span className="ent-badge ent-badge-neutral">Not Evaluated</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="ent-card" style={{ background: "var(--bg-surface)" }}>
                    <div className="ent-section-title" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      <Database size={15} color="var(--brand-blue)" />
                      Simulated PAN Registry
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Record Status</span>
                        <span>
                          {pan.registry.registry_found ? (
                            <span className="ent-badge ent-badge-success">Record Found</span>
                          ) : (
                            <span className="ent-badge ent-badge-neutral">Not in Mock DB</span>
                          )}
                        </span>
                      </div>
                      {pan.registry.record && (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Registered Name</span>
                            <span style={{ color: "#93c5fd", fontWeight: 600 }}>{pan.registry.record.full_name}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Aadhaar Seeding Status</span>
                            <span style={{ color: "#cbd5e1" }}>{pan.registry.record.aadhaar_seeding_status}</span>
                          </div>
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
                  <div className="ent-card" style={{ background: "var(--bg-surface)" }}>
                    <div className="ent-section-title" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      <Cpu size={15} color="var(--brand-blue)" />
                      Udyam Format & Geographic Decoding
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Udyam Number</span>
                        <code style={{ color: "#ffffff", fontWeight: 600 }}>{udyam.udyam_registration_number}</code>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Syntax Structure</span>
                        <span>
                          {udyam.deterministic.is_format_valid ? (
                            <span className="ent-badge ent-badge-success">Valid Regex</span>
                          ) : (
                            <span className="ent-badge ent-badge-critical">Invalid Format</span>
                          )}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>State / District</span>
                        <span style={{ color: "#cbd5e1" }}>
                          {udyam.deterministic.state_name || "—"} ({udyam.deterministic.district_code || "—"})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="ent-card" style={{ background: "var(--bg-surface)" }}>
                    <div className="ent-section-title" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      <Database size={15} color="var(--brand-blue)" />
                      MSME Tier & Procurement Advisories
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Enterprise Name</span>
                        <span style={{ color: "#93c5fd", fontWeight: 600 }}>
                          {udyam.registry.record?.enterprise_name || "—"}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Enterprise Classification</span>
                        <span style={{ color: "#cbd5e1" }}>
                          {udyam.registry.record?.enterprise_tier} • {udyam.registry.record?.major_activity}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>EMD Exemption Advisory</span>
                        <span>
                          {udyam.registry.record?.advisory_benefits.emd_exemption_eligible ? (
                            <span className="ent-badge ent-badge-success">Eligible (Advisory)</span>
                          ) : (
                            <span className="ent-badge ent-badge-warning">Ineligible (Trading)</span>
                          )}
                        </span>
                      </div>
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
                  No OEM Authorization Form submitted.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div className="ent-card" style={{ background: "var(--bg-surface)" }}>
                    <div className="ent-section-title" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      <Cpu size={15} color="var(--brand-blue)" />
                      MAF Temporal & Partner Validity
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Manufacturer</span>
                        <span style={{ color: "#ffffff", fontWeight: 600 }}>{oem.oem_name}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Authorized Partner</span>
                        <span style={{ color: "#93c5fd", fontWeight: 600 }}>{oem.authorized_partner_name}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>MAF Reference Number</span>
                        <code style={{ color: "#cbd5e1" }}>{oem.maf_number || "Not Specified"}</code>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Validity Status</span>
                        <span>
                          {oem.deterministic.is_expired ? (
                            <span className="ent-badge ent-badge-critical">
                              Expired ({oem.deterministic.days_until_expiry}d ago)
                            </span>
                          ) : (
                            <span className="ent-badge ent-badge-success">
                              Valid ({oem.deterministic.days_until_expiry}d remaining)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="ent-card" style={{ background: "var(--bg-surface)" }}>
                    <div className="ent-section-title" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      <Database size={15} color="var(--brand-blue)" />
                      OEM Partner Standing Database
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Partner Standing</span>
                        <span>
                          {oem.registry.record?.is_partner_in_oem_database ? (
                            <span className="ent-badge ent-badge-success">Verified Active</span>
                          ) : (
                            <span className="ent-badge ent-badge-critical">Revoked / Unlisted</span>
                          )}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Tier / Authorization</span>
                        <span style={{ color: "#cbd5e1" }}>
                          {oem.registry.record?.authorization_status || "Standard Partner"}
                        </span>
                      </div>
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
