"use client";

import React, { useState } from "react";
import { Check, Edit3, Play, ShieldCheck, X } from "lucide-react";
import type { CompositeVerificationRequest } from "@/services/types/compliance";

interface ManualVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (req: CompositeVerificationRequest) => void;
  isLoading?: boolean;
}

export default function ManualVerificationModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: ManualVerificationModalProps) {
  const [expectedName, setExpectedName] = useState("");
  const [tenderRef, setTenderRef] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [udyam, setUdyam] = useState("");
  const [oemName, setOemName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [mafNumber, setMafNumber] = useState("");

  if (!isOpen) return null;

  const handleFillDemoValues = () => {
    setExpectedName("Tech Mahindra Limited");
    setTenderRef("GEM/2026/B/890123");
    setGstin("27AAACT2727Q1ZW");
    setPan("AAACT2727Q");
    setOemName("Hewlett Packard Enterprise India Private Limited");
    setPartnerName("Tech Mahindra Limited");
    setMafNumber("HPE-IND-MAF-2026-0045");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const request: CompositeVerificationRequest = {
      explicit_gstin: gstin.trim()
        ? {
            gstin: gstin.trim().toUpperCase(),
            expected_legal_name: expectedName.trim() || undefined,
          }
        : undefined,
      explicit_pan: pan.trim()
        ? {
            pan: pan.trim().toUpperCase(),
            expected_legal_name: expectedName.trim() || undefined,
          }
        : undefined,
      explicit_udyam: udyam.trim()
        ? {
            udyam_registration_number: udyam.trim().toUpperCase(),
            expected_enterprise_name: expectedName.trim() || undefined,
          }
        : undefined,
      explicit_oem: oemName.trim()
        ? {
            oem_name: oemName.trim(),
            authorized_partner_name: partnerName.trim() || expectedName.trim() || "Bidder Submission",
            maf_number: mafNumber.trim() || undefined,
            tender_ref_number: tenderRef.trim() || undefined,
          }
        : undefined,
      bid_metadata: {
        tender_ref_number: tenderRef.trim() || undefined,
        expected_bidder_name: expectedName.trim() || undefined,
      },
    };

    onSubmit(request);
  };

  return (
    <div className="ent-modal-overlay" onClick={onClose}>
      <div
        className="ent-modal-content"
        style={{ maxWidth: "640px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
            paddingBottom: "0.85rem",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Enter Verification Details
            </h3>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Provide statutory credentials and tender parameters for automated compliance review
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <button
              type="button"
              className="ent-btn ent-btn-ghost ent-btn-sm"
              onClick={handleFillDemoValues}
              style={{ fontSize: "0.72rem" }}
            >
              Fill Example
            </button>
            <button
              type="button"
              className="ent-btn ent-btn-secondary ent-btn-sm"
              onClick={onClose}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "0.85rem" }}>
              <div>
                <label className="ent-label">Bidder Legal Name</label>
                <input
                  type="text"
                  className="ent-input"
                  value={expectedName}
                  onChange={(e) => setExpectedName(e.target.value)}
                  placeholder="e.g. Tech Mahindra Limited"
                />
              </div>

              <div>
                <label className="ent-label">Tender Reference</label>
                <input
                  type="text"
                  className="ent-input"
                  value={tenderRef}
                  onChange={(e) => setTenderRef(e.target.value)}
                  placeholder="e.g. GEM/2026/B/890123"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
              <div>
                <label className="ent-label">GSTIN Identifier (15 chars)</label>
                <input
                  type="text"
                  className="ent-input"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="e.g. 27AAACT2727Q1ZW"
                />
              </div>

              <div>
                <label className="ent-label">PAN Number (10 chars)</label>
                <input
                  type="text"
                  className="ent-input"
                  value={pan}
                  onChange={(e) => setPan(e.target.value)}
                  placeholder="e.g. AAACT2727Q"
                />
              </div>
            </div>

            <div>
              <label className="ent-label">Udyam Registration (Optional MSME Certificate)</label>
              <input
                type="text"
                className="ent-input"
                value={udyam}
                onChange={(e) => setUdyam(e.target.value)}
                placeholder="e.g. UDYAM-DL-01-0012345 (Leave blank if not applicable)"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "0.85rem" }}>
              <div>
                <label className="ent-label">OEM Manufacturer Name (Optional)</label>
                <input
                  type="text"
                  className="ent-input"
                  value={oemName}
                  onChange={(e) => setOemName(e.target.value)}
                  placeholder="e.g. Hewlett Packard Enterprise"
                />
              </div>

              <div>
                <label className="ent-label">MAF Authorization Code</label>
                <input
                  type="text"
                  className="ent-input"
                  value={mafNumber}
                  onChange={(e) => setMafNumber(e.target.value)}
                  placeholder="e.g. HPE-IND-MAF-2026-0045"
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.6rem",
                marginTop: "0.75rem",
                paddingTop: "0.85rem",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <button
                type="button"
                className="ent-btn ent-btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ent-btn ent-btn-primary"
                disabled={isLoading}
              >
                <ShieldCheck size={15} />
                <span>Execute Compliance Verification</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
