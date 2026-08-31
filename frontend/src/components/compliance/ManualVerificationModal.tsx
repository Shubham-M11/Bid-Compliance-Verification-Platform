"use client";

import React, { useState } from "react";
import { Edit3, Play, X } from "lucide-react";
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
  const [expectedName, setExpectedName] = useState("Tech Mahindra Limited");
  const [tenderRef, setTenderRef] = useState("GEM/2026/B/890123");
  const [gstin, setGstin] = useState("27AAACT2727Q1ZW");
  const [pan, setPan] = useState("AAACT2727Q");
  const [udyam, setUdyam] = useState("");
  const [oemName, setOemName] = useState("Hewlett Packard Enterprise India Private Limited");
  const [partnerName, setPartnerName] = useState("Tech Mahindra Limited");
  const [mafNumber, setMafNumber] = useState("HPE-IND-MAF-2026-0045");

  if (!isOpen) return null;

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
            authorized_partner_name: partnerName.trim() || expectedName.trim(),
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
      <div className="ent-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            paddingBottom: "0.75rem",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#ffffff" }}>
              Manual Credential Verification
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Enter statutory and OEM parameters for direct compliance evaluation
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

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.76rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  Bidder Legal Name
                </label>
                <input
                  type="text"
                  className="ent-input"
                  value={expectedName}
                  onChange={(e) => setExpectedName(e.target.value)}
                  placeholder="e.g. Tech Mahindra Limited"
                />
              </div>

              <div>
                <label style={{ fontSize: "0.76rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  Tender Reference Number
                </label>
                <input
                  type="text"
                  className="ent-input"
                  value={tenderRef}
                  onChange={(e) => setTenderRef(e.target.value)}
                  placeholder="GEM/2026/B/890123"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.76rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  GSTIN (15 characters)
                </label>
                <input
                  type="text"
                  className="ent-input"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="27AAACT2727Q1ZW"
                  maxLength={15}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.76rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  PAN (10 characters)
                </label>
                <input
                  type="text"
                  className="ent-input"
                  value={pan}
                  onChange={(e) => setPan(e.target.value)}
                  placeholder="AAACT2727Q"
                  maxLength={10}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.76rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                Udyam Registration Number (Optional)
              </label>
              <input
                type="text"
                className="ent-input"
                value={udyam}
                onChange={(e) => setUdyam(e.target.value)}
                placeholder="UDYAM-DL-01-0012345"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.76rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  OEM Manufacturer Name
                </label>
                <input
                  type="text"
                  className="ent-input"
                  value={oemName}
                  onChange={(e) => setOemName(e.target.value)}
                  placeholder="Hewlett Packard Enterprise"
                />
              </div>

              <div>
                <label style={{ fontSize: "0.76rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  MAF Number
                </label>
                <input
                  type="text"
                  className="ent-input"
                  value={mafNumber}
                  onChange={(e) => setMafNumber(e.target.value)}
                  placeholder="HPE-IND-MAF-2026-0045"
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.6rem",
              marginTop: "1.5rem",
              paddingTop: "0.85rem",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <button
              type="button"
              className="ent-btn ent-btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ent-btn ent-btn-primary"
              disabled={isLoading}
            >
              <Play size={13} /> {isLoading ? "Evaluating..." : "Run Evaluation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
