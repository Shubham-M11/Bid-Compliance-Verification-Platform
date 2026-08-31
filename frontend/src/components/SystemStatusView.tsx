"use client";

import React from "react";
import HealthStatusCard from "@/components/HealthStatusCard";
import {
  Activity,
  CheckCircle2,
  Cpu,
  Database,
  FileCheck2,
  Layers,
  Lock,
  Server,
  ShieldCheck,
} from "lucide-react";

export default function SystemStatusView() {
  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff" }}>
          Platform System Status & Technical Specifications
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          Real-time service health, OCR parser configuration, and statutory validation engine specifications.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
        {/* Backend Health Check */}
        <HealthStatusCard />

        {/* Runtime Environment Specs */}
        <div className="ent-card">
          <div className="ent-section-title" style={{ marginBottom: "1rem" }}>
            <Server size={18} color="var(--brand-blue)" />
            Runtime Stack & Components
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.82rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ color: "var(--text-secondary)" }}>Backend REST Framework</span>
              <span style={{ color: "#ffffff", fontWeight: 600 }}>FastAPI v0.115+ (Python 3.14)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ color: "var(--text-secondary)" }}>Frontend Framework</span>
              <span style={{ color: "#ffffff", fontWeight: 600 }}>Next.js 14.2 (React 18)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ color: "var(--text-secondary)" }}>Digital PDF Parser</span>
              <span style={{ color: "#ffffff", fontWeight: 600 }}>PyMuPDF (fitz) v1.24+</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ color: "var(--text-secondary)" }}>Scanned OCR Engine</span>
              <span style={{ color: "#ffffff", fontWeight: 600 }}>Tesseract OCR v5.4 / pytesseract</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0" }}>
              <span style={{ color: "var(--text-secondary)" }}>Statutory Checksum</span>
              <span style={{ color: "#ffffff", fontWeight: 600 }}>GSTN Luhn Mod-36 Algorithm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Verification Architecture Card */}
      <div className="ent-card">
        <div className="ent-section-title" style={{ marginBottom: "0.75rem" }}>
          <ShieldCheck size={18} color="var(--brand-blue)" />
          Verification Engine Architecture & Policies
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
          The platform operates on a zero-fabrication deterministic verification architecture designed for public procurement integrity.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
          <div style={{ background: "var(--bg-surface)", padding: "1rem", borderRadius: "var(--radius-md)" }}>
            <div style={{ fontWeight: 600, color: "#ffffff", fontSize: "0.88rem", marginBottom: "0.3rem" }}>
              Deterministic Validation
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
              Performs offline algorithmic verification including Luhn Mod-36 checksums, PAN entity decoding, and MAF validity windows without external dependencies.
            </p>
          </div>

          <div style={{ background: "var(--bg-surface)", padding: "1rem", borderRadius: "var(--radius-md)" }}>
            <div style={{ fontWeight: 600, color: "#ffffff", fontSize: "0.88rem", marginBottom: "0.3rem" }}>
              Zero Data Fabrication
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
              Mock sandbox registries never invent fake legal names or statuses for arbitrary numbers. Unknown valid numbers receive neutral 0-point validation verdicts.
            </p>
          </div>

          <div style={{ background: "var(--bg-surface)", padding: "1rem", borderRadius: "var(--radius-md)" }}>
            <div style={{ fontWeight: 600, color: "#ffffff", fontSize: "0.88rem", marginBottom: "0.3rem" }}>
              Page-Level Traceability
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
              Every extracted credential and consistency finding is linked to immutable source document filenames, 1-indexed page numbers, and exact text excerpts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
