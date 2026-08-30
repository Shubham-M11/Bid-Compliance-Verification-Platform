import HealthStatusCard from "@/components/HealthStatusCard";
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
          <span className="badge badge-neutral">Stage: Foundation</span>
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
            Core Stack & Foundation Setup
          </div>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              marginBottom: "1rem",
            }}
          >
            Configured with clean modular layers ready for AI and verification pipelines.
          </p>

          <div className="meta-list">
            <div className="meta-item">
              <span className="meta-label">Frontend Framework</span>
              <span className="meta-value">Next.js 14 (App Router + TS)</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Backend Framework</span>
              <span className="meta-value">FastAPI + Pydantic v2 (Python 3.14)</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Database Access Layer</span>
              <span className="meta-value">SQLAlchemy 2.0 + asyncpg</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Database Target</span>
              <span className="meta-value">PostgreSQL / Supabase (Async)</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">CORS Policy</span>
              <span className="meta-value">http://localhost:3000 Allowed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Modules Roadmap */}
      <div>
        <div className="section-title">
          <Sparkles size={20} color="var(--accent-cyan)" />
          Planned Platform Modules (Upcoming Tasks)
        </div>
        <div className="grid-3">
          <div className="roadmap-card">
            <div>
              <div className="roadmap-card-title">
                <FileSearch size={18} color="var(--accent-blue)" />
                Document Processing & OCR
              </div>
              <p className="roadmap-card-desc">
                High-precision extraction for tender documents, technical specs, financial statements, and scanned certificates.
              </p>
            </div>
            <span className="badge badge-neutral" style={{ alignSelf: "flex-start" }}>
              Upcoming Task
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
