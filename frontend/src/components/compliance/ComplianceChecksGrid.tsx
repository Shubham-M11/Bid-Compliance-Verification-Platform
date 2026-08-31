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

  // 1. GSTIN Card Data
  const getGSTINStatus = () => {
    if (!gstin) return { label: "Not Provided", class: "ent-badge-neutral", icon: HelpCircle };
    if (gstin.registry.record?.status === "SUSPENDED") {
      return { label: "Suspended", class: "ent-badge-critical", icon: AlertTriangle };
    }
    if (gstin.registry.record?.status === "CANCELLED") {
      return { label: "Cancelled", class: "ent-badge-critical", icon: XCircle };
    }
    if (!gstin.deterministic.is_checksum_valid || !gstin.deterministic.is_format_valid) {
      return { label: "Invalid Format", class: "ent-badge-warning", icon: AlertTriangle };
    }
    if (gstin.registry.registry_found) {
      return { label: "Verified Active", class: "ent-badge-success", icon: CheckCircle2 };
    }
    return { label: "Valid Syntax", class: "ent-badge-blue", icon: CheckCircle2 };
  };

  // 2. PAN Card Data
  const getPANStatus = () => {
    if (!pan) return { label: "Not Provided", class: "ent-badge-neutral", icon: HelpCircle };
    if (!pan.deterministic.is_format_valid) {
      return { label: "Invalid Format", class: "ent-badge-critical", icon: XCircle };
    }
    if (pan.registry.registry_found) {
      return { label: "Verified Active", class: "ent-badge-success", icon: CheckCircle2 };
    }
    return { label: "Valid Syntax", class: "ent-badge-blue", icon: CheckCircle2 };
  };

  // 3. Udyam Card Data
  const getUdyamStatus = () => {
    if (!udyam) return { label: "Not Provided", class: "ent-badge-neutral", icon: HelpCircle };
    if (!udyam.deterministic.is_format_valid) {
      return { label: "Invalid Syntax", class: "ent-badge-critical", icon: XCircle };
    }
    if (udyam.registry.record) {
      const tier = udyam.registry.record.enterprise_tier || "MSME";
      return { label: `Verified (${tier})`, class: "ent-badge-success", icon: CheckCircle2 };
    }
    return { label: "Syntax Valid", class: "ent-badge-blue", icon: CheckCircle2 };
  };

  // 4. OEM Card Data
  const getOEMStatus = () => {
    if (!oem) return { label: "Not Provided", class: "ent-badge-neutral", icon: HelpCircle };
    if (oem.deterministic.is_expired) {
      return { label: "Expired", class: "ent-badge-critical", icon: XCircle };
    }
    if (oem.registry.record?.authorization_status.includes("Revoked")) {
      return { label: "Revoked", class: "ent-badge-critical", icon: XCircle };
    }
    if (oem.deterministic.is_valid_on_bid_date) {
      return { label: "Valid Authorization", class: "ent-badge-success", icon: CheckCircle2 };
    }
    return { label: "Requires Review", class: "ent-badge-warning", icon: AlertTriangle };
  };

  const gstinStatus = getGSTINStatus();
  const panStatus = getPANStatus();
  const udyamStatus = getUdyamStatus();
  const oemStatus = getOEMStatus();

  return (
    <div style={{ marginBottom: "1.75rem" }}>
      <div className="ent-section-title" style={{ marginBottom: "0.85rem" }}>
        <ShieldCheck size={18} color="var(--brand-blue)" />
        Statutory & Authorization Credentials
      </div>

      <div className="statutory-grid">
        {/* Card 1: GST Registration */}
        <div className="statutory-card">
          <div>
            <div className="statutory-card-header">
              <div className="statutory-card-title">
                <Building size={15} color="var(--brand-blue)" />
                GST Registration
              </div>
              <span className={`ent-badge ${gstinStatus.class}`}>
                <gstinStatus.icon size={11} /> {gstinStatus.label}
              </span>
            </div>

            <div style={{ marginTop: "0.6rem" }}>
              <div className="statutory-card-fact">
                {gstin?.gstin || "No GSTIN supplied"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                {gstin?.registry.record?.legal_name
                  ? gstin.registry.record.legal_name
                  : gstin?.deterministic.state_name
                  ? `${gstin.deterministic.state_name} (${gstin.deterministic.state_code})`
                  : "State & syntax check"}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="ent-btn ent-btn-ghost ent-btn-sm"
            onClick={() => onOpenDetails("gstin")}
            style={{ justifyContent: "space-between", paddingLeft: 0 }}
          >
            <span>View details</span>
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Card 2: PAN Entity */}
        <div className="statutory-card">
          <div>
            <div className="statutory-card-header">
              <div className="statutory-card-title">
                <CreditCard size={15} color="var(--brand-blue)" />
                PAN Verification
              </div>
              <span className={`ent-badge ${panStatus.class}`}>
                <panStatus.icon size={11} /> {panStatus.label}
              </span>
            </div>

            <div style={{ marginTop: "0.6rem" }}>
              <div className="statutory-card-fact">
                {pan?.pan || "No PAN supplied"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                {pan?.deterministic.entity_type
                  ? `Entity: ${pan.deterministic.entity_type}`
                  : "Structure & 4th char decoded"}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="ent-btn ent-btn-ghost ent-btn-sm"
            onClick={() => onOpenDetails("pan")}
            style={{ justifyContent: "space-between", paddingLeft: 0 }}
          >
            <span>View details</span>
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Card 3: Udyam Registration */}
        <div className="statutory-card">
          <div>
            <div className="statutory-card-header">
              <div className="statutory-card-title">
                <Factory size={15} color="var(--brand-blue)" />
                Udyam MSME
              </div>
              <span className={`ent-badge ${udyamStatus.class}`}>
                <udyamStatus.icon size={11} /> {udyamStatus.label}
              </span>
            </div>

            <div style={{ marginTop: "0.6rem" }}>
              <div className="statutory-card-fact">
                {udyam?.udyam_registration_number || "Not Claimed / Provided"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                {udyam?.registry.record
                  ? `${udyam.registry.record.enterprise_tier} • ${udyam.registry.record.major_activity}`
                  : "Advisory EMD waiver check"}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="ent-btn ent-btn-ghost ent-btn-sm"
            onClick={() => onOpenDetails("udyam")}
            style={{ justifyContent: "space-between", paddingLeft: 0 }}
          >
            <span>View details</span>
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Card 4: OEM Authorization */}
        <div className="statutory-card">
          <div>
            <div className="statutory-card-header">
              <div className="statutory-card-title">
                <FileCheck2 size={15} color="var(--brand-blue)" />
                OEM Authorization
              </div>
              <span className={`ent-badge ${oemStatus.class}`}>
                <oemStatus.icon size={11} /> {oemStatus.label}
              </span>
            </div>

            <div style={{ marginTop: "0.6rem" }}>
              <div className="statutory-card-fact" style={{ fontSize: "0.76rem" }}>
                {oem?.oem_name ? oem.oem_name.split(" ")[0] + " MAF" : "No MAF supplied"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                {oem?.deterministic.days_until_expiry !== undefined && oem?.deterministic.days_until_expiry !== null
                  ? oem.deterministic.is_expired
                    ? `Expired ${oem.deterministic.days_until_expiry}d ago`
                    : `Valid (${oem.deterministic.days_until_expiry}d left)`
                  : "Partner standing check"}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="ent-btn ent-btn-ghost ent-btn-sm"
            onClick={() => onOpenDetails("oem")}
            style={{ justifyContent: "space-between", paddingLeft: 0 }}
          >
            <span>View details</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
