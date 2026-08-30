import HealthStatusCard from "@/components/HealthStatusCard";
import DocumentUploadCard from "@/components/DocumentUploadCard";
import {
  CheckCircle,
  Database,
  FileCheck2,
  FileSearch,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function Home() {
  return (
    <main className="container">
      {/* Platform Header */}
      <header className="header">
        <div className="brand-wrapper">
          <div className="brand-logo">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="brand-title">
              GeM Bid Compliance Verification Platform
            </h1>
            <p className="brand-subtitle">
              Smart India Hackathon (SIH) 2026 — Problem Statement SIH26100
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span className="badge badge-sih">SIH 2026 • SIH26100</span>
          <span className="badge badge-success">Task 2A: Doc Extraction</span>
        </div>
      </header>

      {/* Grid: Health Status & Architecture Snapshot */}
      <div className="grid-2">
        {/* Backend Health Check Card */}
        <HealthStatusCard />

        {/* Foundation Architecture Summary */}
        <div className="card">
          <div className="section-title">
            <Layers size={20} color="var(--accent-indigo)" />
            Document Pipeline & Architecture
          </div>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              marginBottom: "1rem",
            }}
          >
            Modular document processing engine with page-level traceability.
          </p>

          <div className="meta-list">
            <div className="meta-item">
              <span className="meta-label">PDF Extraction Engine</span>
              <span className="meta-value">PyMuPDF (fitz) v1.24+</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Upload Endpoint</span>
              <span className="meta-value">POST /api/v1/documents/upload</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Validation Limits</span>
              <span className="meta-value">PDF only • 10 MB Max</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Evidence Granularity</span>
              <span className="meta-value">1-Indexed Page Evidence</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Temp Storage Policy</span>
              <span className="meta-value">Strict Cleanup on Completion</span>
            </div>
          </div>
        </div>
      </div>

      {/* Document Upload & Text Extraction Vertical Slice */}
      <DocumentUploadCard />

      {/* Upcoming Modules Roadmap */}
      <div style={{ marginTop: "2.5rem" }}>
        <div className="section-title">
          <Sparkles size={20} color="var(--accent-cyan)" />
          Planned Platform Modules (Upcoming Tasks)
        </div>
        <div className="grid-3">
          <div className="roadmap-card">
            <div>
              <div className="roadmap-card-title">
                <FileSearch size={18} color="var(--accent-blue)" />
                OCR & Scanned PDF Extraction
              </div>
              <p className="roadmap-card-desc">
                Optical character recognition for scanned certificates, stamped letters, and handwritten annotations (Task 2B).
              </p>
            </div>
            <span className="badge badge-neutral" style={{ alignSelf: "flex-start" }}>
              Next Task
            </span>
          </div>

          <div className="roadmap-card">
            <div>
              <div className="roadmap-card-title">
                <CheckCircle size={18} color="var(--accent-green)" />
                Statutory Verification
              </div>
              <p className="roadmap-card-desc">
                Automated multi-source cross-verification for GSTIN, PAN, Udyam MSME status, and OEM authorization.
              </p>
            </div>
            <span className="badge badge-neutral" style={{ alignSelf: "flex-start" }}>
              Upcoming Task
            </span>
          </div>

          <div className="roadmap-card">
            <div>
              <div className="roadmap-card-title">
                <FileCheck2 size={18} color="var(--accent-indigo)" />
                Tender Intelligence Engine
              </div>
              <p className="roadmap-card-desc">
                Rule-based and semantic cross-referencing between GeM tender clauses and bidder submissions.
              </p>
            </div>
            <span className="badge badge-neutral" style={{ alignSelf: "flex-start" }}>
              Upcoming Task
            </span>
          </div>

          <div className="roadmap-card">
            <div>
              <div className="roadmap-card-title">
                <ShieldAlert size={18} color="var(--accent-amber)" />
                Risk & Scoring Engine
              </div>
              <p className="roadmap-card-desc">
                Composite compliance scoring, anomaly detection, discrepancy flagging, and qualification recommendations.
              </p>
            </div>
            <span className="badge badge-neutral" style={{ alignSelf: "flex-start" }}>
              Upcoming Task
            </span>
          </div>

          <div className="roadmap-card">
            <div>
              <div className="roadmap-card-title">
                <Database size={18} color="var(--accent-cyan)" />
                Audit Trail & Reporting
              </div>
              <p className="roadmap-card-desc">
                Immutable verification history, timestamped evidence logging, and comprehensive compliance report generation.
              </p>
            </div>
            <span className="badge badge-neutral" style={{ alignSelf: "flex-start" }}>
              Upcoming Task
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
