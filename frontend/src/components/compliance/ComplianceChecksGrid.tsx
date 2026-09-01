"use client";

import React from "react";
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Factory,
  FileCheck2,
  HelpCircle,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { StatutoryVerificationsBundle } from "@/services/types/compliance";

interface ComplianceChecksGridProps {
  bundle?: StatutoryVerificationsBundle | null;
  onOpenDetails: (type: "gstin" | "pan" | "udyam" | "oem") => void;
}

export default function ComplianceChecksGrid({
  bundle,
  onOpenDetails,
}: ComplianceChecksGridProps) {
  const gstin = bundle?.gstin;
  const pan = bundle?.pan;
  const udyam = bundle?.udyam;
  const oem = bundle?.oem;

  // 1. GST Status & Explanation
  const getGSTINInfo = () => {
    if (!gstin || !gstin.gstin) {
      return {
        state: "NOT_PROVIDED",
        badgeLabel: "Not Provided",
        badgeClass: "ent-badge-neutral",
        icon: HelpCircle,
        explanation: "No GSTIN certificate was submitted.",
      };
    }
    if (gstin.registry.record?.status === "SUSPENDED") {
      return {
        state: "FAILED",
        badgeLabel: "Suspended",
        badgeClass: "ent-badge-critical",
        icon: XCircle,
        explanation: "Taxpayer registration is currently suspended in registry.",
      };
    }
    if (gstin.registry.record?.status === "CANCELLED") {
      return {
        state: "FAILED",
        badgeLabel: "Cancelled",
        badgeClass: "ent-badge-critical",
        icon: XCircle,
        explanation: "Taxpayer GST registration has been cancelled.",
      };
    }
    if (!gstin.deterministic.is_checksum_valid) {
      return {
        state: "FAILED",
        badgeLabel: "Failed",
        badgeClass: "ent-badge-critical",
        icon: XCircle,
        explanation: "GST identification number checksum validation failed.",
      };
    }
    if (!gstin.deterministic.is_format_valid) {
      return {
        state: "FAILED",
        badgeLabel: "Failed",
        badgeClass: "ent-badge-critical",
        icon: XCircle,
        explanation: "GSTIN format does not conform to statutory standards.",
      };
    }
    if (gstin.registry.registry_found) {
      return {
        state: "VERIFIED",
        badgeLabel: "Verified",
        badgeClass: "ent-badge-success",
        icon: CheckCircle2,
        explanation: "GSTIN structure, checksum and registry status verified.",
      };
    }
    return {
      state: "VERIFIED",
      badgeLabel: "Verified",
      badgeClass: "ent-badge-success",
      icon: CheckCircle2,
      explanation: "Statutory format and checksum valid; verified without arbitrary penalty.",
    };
  };

  // 2. PAN Status & Explanation
  const getPANInfo = () => {
    if (!pan || !pan.pan) {
      return {
        state: "NOT_PROVIDED",
        badgeLabel: "Not Provided",
        badgeClass: "ent-badge-neutral",
        icon: HelpCircle,
        explanation: "No PAN document was submitted.",
      };
    }
    if (!pan.deterministic.is_format_valid) {
      return {
        state: "FAILED",
        badgeLabel: "Failed",
        badgeClass: "ent-badge-critical",
        icon: XCircle,
        explanation: "PAN structure does not conform to statutory 10-character format.",
      };
    }
    if (pan.registry.registry_found) {
      return {
        state: "VERIFIED",
        badgeLabel: "Verified",
        badgeClass: "ent-badge-success",
        icon: CheckCircle2,
        explanation: "PAN format, corporate entity classification, and active status verified.",
      };
    }
    return {
      state: "VERIFIED",
      badgeLabel: "Verified",
      badgeClass: "ent-badge-success",
      icon: CheckCircle2,
      explanation: "PAN format and corporate entity classification checks passed.",
    };
  };

  // 3. Udyam Status & Explanation
  const getUdyamInfo = () => {
    if (!udyam || !udyam.udyam_registration_number) {
      return {
        state: "NOT_PROVIDED",
        badgeLabel: "Not Provided",
        badgeClass: "ent-badge-neutral",
        icon: HelpCircle,
        explanation: "No Udyam certificate was submitted (Optional MSME claim).",
      };
    }
    if (!udyam.deterministic.is_format_valid) {
      return {
        state: "FAILED",
        badgeLabel: "Failed",
        badgeClass: "ent-badge-critical",
        icon: XCircle,
        explanation: "Udyam registration number syntax is invalid.",
      };
    }
    if (udyam.registry.record) {
      const tier = udyam.registry.record.enterprise_tier || "MSME";
      return {
        state: "VERIFIED",
        badgeLabel: `Verified (${tier})`,
        badgeClass: "ent-badge-success",
        icon: CheckCircle2,
        explanation: `Active ${tier} enterprise verified; eligible for advisory EMD exemption.`,
      };
    }
    return {
      state: "VERIFIED",
      badgeLabel: "Verified",
      badgeClass: "ent-badge-success",
      icon: CheckCircle2,
      explanation: "Udyam MSME registration format verified.",
    };
  };

  // 4. OEM Status & Explanation
  const getOEMInfo = () => {
    if (!oem || !oem.oem_name) {
      return {
        state: "NOT_PROVIDED",
        badgeLabel: "Not Provided",
        badgeClass: "ent-badge-neutral",
        icon: HelpCircle,
        explanation: "No OEM authorization document was submitted (Optional).",
      };
    }
    if (oem.deterministic.is_expired) {
      return {
        state: "FAILED",
        badgeLabel: "Failed (Expired)",
        badgeClass: "ent-badge-critical",
        icon: XCircle,
        explanation: "Manufacturer authorization validity window has expired.",
      };
    }
    if (oem.registry.record?.authorization_status.includes("Revoked")) {
      return {
        state: "FAILED",
        badgeLabel: "Revoked",
        badgeClass: "ent-badge-critical",
        icon: XCircle,
        explanation: "Manufacturer authorization revoked by original equipment manufacturer.",
      };
    }
    if (oem.deterministic.is_valid_on_bid_date) {
      return {
        state: "VERIFIED",
        badgeLabel: "Verified",
        badgeClass: "ent-badge-success",
        icon: CheckCircle2,
        explanation: "Manufacturer authorization verified and active for tender scope.",
      };
    }
    return {
      state: "WARNING",
      badgeLabel: "Needs Review",
      badgeClass: "ent-badge-warning",
      icon: AlertTriangle,
      explanation: "Manufacturer authorization requires manual officer inspection.",
    };
  };

  const gstinInfo = getGSTINInfo();
  const panInfo = getPANInfo();
  const udyamInfo = getUdyamInfo();
  const oemInfo = getOEMInfo();

  const GSTIcon = gstinInfo.icon;
  const PANIcon = panInfo.icon;
  const UdyamIcon = udyamInfo.icon;
  const OEMIcon = oemInfo.icon;

  return (
    <div style={{ marginBottom: "1.75rem" }}>
      {/* Section Title */}
      <div className="ent-section-title" style={{ marginBottom: "0.85rem" }}>
        <ShieldCheck size={18} color="var(--brand-blue)" />
        <span>Compliance Overview</span>
      </div>

      {/* 4-Column Responsive Grid */}
      <div className="statutory-grid">
        {/* Card 1: GST */}
        <div className="statutory-card">
          <div>
            <div className="statutory-card-header">
              <div className="statutory-card-title">
                <Building size={15} color="var(--brand-blue)" />
                <span>GST</span>
              </div>
              <span className={`ent-badge ${gstinInfo.badgeClass}`}>
                <GSTIcon size={12} />
                <span>{gstinInfo.badgeLabel}</span>
              </span>
            </div>

            <div style={{ marginTop: "0.6rem" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                {gstinInfo.explanation}
              </div>
              {gstin?.gstin && (
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    marginTop: "0.35rem",
                  }}
                >
                  GSTIN: {gstin.gstin}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className="ent-btn ent-btn-ghost ent-btn-sm"
            onClick={() => onOpenDetails("gstin")}
            style={{ justifyContent: "space-between", paddingLeft: 0, marginTop: "0.6rem" }}
          >
            <span>View details</span>
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Card 2: PAN */}
        <div className="statutory-card">
          <div>
            <div className="statutory-card-header">
              <div className="statutory-card-title">
                <CreditCard size={15} color="var(--brand-blue)" />
                <span>PAN</span>
              </div>
              <span className={`ent-badge ${panInfo.badgeClass}`}>
                <PANIcon size={12} />
                <span>{panInfo.badgeLabel}</span>
              </span>
            </div>

            <div style={{ marginTop: "0.6rem" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                {panInfo.explanation}
              </div>
              {pan?.pan && (
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    marginTop: "0.35rem",
                  }}
                >
                  PAN: {pan.pan}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className="ent-btn ent-btn-ghost ent-btn-sm"
            onClick={() => onOpenDetails("pan")}
            style={{ justifyContent: "space-between", paddingLeft: 0, marginTop: "0.6rem" }}
          >
            <span>View details</span>
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Card 3: Udyam */}
        <div className="statutory-card">
          <div>
            <div className="statutory-card-header">
              <div className="statutory-card-title">
                <Factory size={15} color="var(--brand-blue)" />
                <span>Udyam</span>
              </div>
              <span className={`ent-badge ${udyamInfo.badgeClass}`}>
                <UdyamIcon size={12} />
                <span>{udyamInfo.badgeLabel}</span>
              </span>
            </div>

            <div style={{ marginTop: "0.6rem" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                {udyamInfo.explanation}
              </div>
              {udyam?.udyam_registration_number && (
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    marginTop: "0.35rem",
                  }}
                >
                  {udyam.udyam_registration_number}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className="ent-btn ent-btn-ghost ent-btn-sm"
            onClick={() => onOpenDetails("udyam")}
            style={{ justifyContent: "space-between", paddingLeft: 0, marginTop: "0.6rem" }}
          >
            <span>View details</span>
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Card 4: OEM */}
        <div className="statutory-card">
          <div>
            <div className="statutory-card-header">
              <div className="statutory-card-title">
                <FileCheck2 size={15} color="var(--brand-blue)" />
                <span>OEM</span>
              </div>
              <span className={`ent-badge ${oemInfo.badgeClass}`}>
                <OEMIcon size={12} />
                <span>{oemInfo.badgeLabel}</span>
              </span>
            </div>

            <div style={{ marginTop: "0.6rem" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                {oemInfo.explanation}
              </div>
              {oem?.oem_name && (
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                    marginTop: "0.35rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {oem.oem_name}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className="ent-btn ent-btn-ghost ent-btn-sm"
            onClick={() => onOpenDetails("oem")}
            style={{ justifyContent: "space-between", paddingLeft: 0, marginTop: "0.6rem" }}
          >
            <span>View details</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
