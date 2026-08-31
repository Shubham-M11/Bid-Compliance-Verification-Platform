"use client";

import React, { useState } from "react";
import BidReviewWorkspace from "@/components/compliance/BidReviewWorkspace";
import DocumentUploadCard from "@/components/DocumentUploadCard";
import SystemStatusView from "@/components/SystemStatusView";
import {
  Activity,
  CheckCircle,
  FileCheck2,
  FileSearch,
  FileText,
  Layers,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type MainNavTab = "reviews" | "documents" | "status";

export default function Home() {
  const [activeTab, setActiveTab] = useState<MainNavTab>("reviews");

  return (
    <main className="app-container">
      {/* Top Application Navbar */}
      <header className="top-navbar">
        <div className="brand-section">
          <div className="brand-icon-box">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="brand-heading">
              GeM Bid Compliance
            </h1>
            <p className="brand-tagline">
              Procurement Decision Support System
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="nav-links">
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === "reviews" ? "active" : ""}`}
            onClick={() => setActiveTab("reviews")}
          >
            <ShieldCheck size={14} /> Bid Reviews
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === "documents" ? "active" : ""}`}
            onClick={() => setActiveTab("documents")}
          >
            <FileText size={14} /> Document Extraction
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === "status" ? "active" : ""}`}
            onClick={() => setActiveTab("status")}
          >
            <Server size={14} /> System Status
          </button>
        </nav>

        {/* Right Status Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="ent-badge ent-badge-neutral" style={{ fontSize: "0.72rem" }}>
            Deterministic Sandbox
          </span>
        </div>
      </header>

      {/* Main Tab Views */}
      {activeTab === "reviews" && (
        <div>
          <div style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em" }}>
              Bid Compliance Review
            </h2>
            <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>
              Review statutory credentials, authorization documents, and bid compliance evidence.
            </p>
          </div>

          <BidReviewWorkspace />
        </div>
      )}

      {activeTab === "documents" && (
        <div>
          <div style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em" }}>
              Document Processing & Page Evidence Extraction
            </h2>
            <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>
              Extract page-by-page text evidence using digital parser with automated OCR fallback.
            </p>
          </div>

          <DocumentUploadCard />
        </div>
      )}

      {activeTab === "status" && <SystemStatusView />}
    </main>
  );
}
