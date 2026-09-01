"use client";

import React, { useState } from "react";
import {
  Activity,
  FileCheck2,
  FileText,
  History,
  Layers,
  Search,
  Server,
  ShieldCheck,
  User,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export type NavTabType = "reviews" | "tenders" | "documents" | "audit";

interface AppNavbarProps {
  activeTab: NavTabType;
  onSelectTab: (tab: NavTabType) => void;
  onOpenDemoModal: () => void;
  onOpenDiagnosticsModal: () => void;
  onSearch?: (query: string) => void;
}

export default function AppNavbar({
  activeTab,
  onSelectTab,
  onOpenDemoModal,
  onOpenDiagnosticsModal,
  onSearch,
}: AppNavbarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <header className="top-navbar">
      {/* Brand Section */}
      <div className="brand-section">
        <div className="brand-icon-box">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h1 className="brand-heading">
            GeM Bid Compliance
          </h1>
          <p className="brand-tagline">
            Procurement Decision Support
          </p>
        </div>
      </div>

      {/* Center Navigation Links */}
      <nav className="nav-links" aria-label="Main Navigation">
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === "reviews" ? "active" : ""}`}
          onClick={() => onSelectTab("reviews")}
        >
          <ShieldCheck size={14} /> Reviews
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === "tenders" ? "active" : ""}`}
          onClick={() => onSelectTab("tenders")}
        >
          <FileCheck2 size={14} /> Tenders
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === "documents" ? "active" : ""}`}
          onClick={() => onSelectTab("documents")}
        >
          <FileText size={14} /> Documents
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === "audit" ? "active" : ""}`}
          onClick={() => onSelectTab("audit")}
        >
          <History size={14} /> Audit History
        </button>
      </nav>

      {/* Right Controls: Theme, Demo, Diagnostics, Profile */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        {/* Search Input (Minimal / Optional) */}
        <form onSubmit={handleSearchSubmit} style={{ position: "relative", display: "none" }}>
          <input
            type="text"
            placeholder="Search tender/bidder..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "0.35rem 0.65rem 0.35rem 1.8rem",
              fontSize: "0.78rem",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-medium)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-primary)",
              width: "160px",
            }}
          />
          <Search
            size={12}
            style={{
              position: "absolute",
              left: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
        </form>

        {/* Evaluation / Demo Scenarios Launcher */}
        <button
          type="button"
          className="ent-btn ent-btn-secondary ent-btn-sm"
          onClick={onOpenDemoModal}
          title="Open sample bid PDFs and preset scenarios"
          style={{ fontSize: "0.76rem" }}
        >
          <Layers size={13} color="var(--brand-blue)" />
          <span>Demo / Evaluation</span>
        </button>

        {/* Administration / Diagnostics Launcher */}
        <button
          type="button"
          className="ent-btn ent-btn-secondary ent-btn-sm"
          onClick={onOpenDiagnosticsModal}
          title="System health and verification engine diagnostics"
          style={{ fontSize: "0.76rem" }}
        >
          <Server size={13} color="var(--text-muted)" />
          <span>Diagnostics</span>
        </button>

        {/* Theme Switcher */}
        <ThemeToggle />

        {/* Officer Profile Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.35rem 0.65rem",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.76rem",
            color: "var(--text-secondary)",
          }}
          title="Logged in Officer"
        >
          <User size={13} color="var(--brand-blue)" />
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Officer</span>
        </div>
      </div>
    </header>
  );
}
