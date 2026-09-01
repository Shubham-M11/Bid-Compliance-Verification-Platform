"use client";

import React, { useState } from "react";
import {
  Activity,
  FileCheck2,
  FileText,
  History,
  Menu,
  Scale,
  ShieldCheck,
  Sparkles,
  User,
  X,
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
}: AppNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<"normal" | "large" | "larger">("normal");

  const handleFontSize = (level: "normal" | "large" | "larger") => {
    setFontSizeLevel(level);
    if (typeof document !== "undefined") {
      if (level === "normal") document.documentElement.style.fontSize = "16px";
      if (level === "large") document.documentElement.style.fontSize = "17.5px";
      if (level === "larger") document.documentElement.style.fontSize = "19px";
    }
  };

  return (
    <header className="gov-header-wrapper">
      {/* 1. Subtle Institutional Accent Strip */}
      <div className="gov-topbar-accent" />

      {/* 2. Top Institutional Utility Bar */}
      <div className="gov-topbar-utility">
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontWeight: 700, letterSpacing: "0.01em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Scale size={14} color="#f59e0b" />
            GeM Bid Compliance Verification
          </span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span style={{ opacity: 0.85 }}>Procurement Compliance & Decision Support</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Accessibility Font Resizer */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "rgba(255, 255, 255, 0.1)", padding: "1px 6px", borderRadius: "3px" }}>
            <button
              type="button"
              onClick={() => handleFontSize("normal")}
              style={{
                background: "transparent",
                border: "none",
                color: fontSizeLevel === "normal" ? "#f59e0b" : "#cbd5e1",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.72rem",
                padding: "1px 4px",
              }}
              title="Standard Font Size"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => handleFontSize("large")}
              style={{
                background: "transparent",
                border: "none",
                color: fontSizeLevel === "large" ? "#f59e0b" : "#cbd5e1",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.78rem",
                padding: "1px 4px",
              }}
              title="Large Font Size"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => handleFontSize("larger")}
              style={{
                background: "transparent",
                border: "none",
                color: fontSizeLevel === "larger" ? "#f59e0b" : "#cbd5e1",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.85rem",
                padding: "1px 4px",
              }}
              title="Largest Font Size"
            >
              A+
            </button>
          </div>

          {/* System Status */}
          <button
            type="button"
            onClick={onOpenDiagnosticsModal}
            style={{
              background: "transparent",
              border: "none",
              color: "#e2e8f0",
              cursor: "pointer",
              fontSize: "0.78rem",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
            title="View system status and verification components"
          >
            <Activity size={13} color="#22c55e" />
            <span>System Status</span>
          </button>

          {/* Theme Toggle (Light Default) */}
          <ThemeToggle />

          {/* Officer Indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "rgba(255, 255, 255, 0.12)",
              padding: "2px 8px",
              borderRadius: "3px",
              fontSize: "0.76rem",
              color: "#f8fafc",
            }}
          >
            <User size={12} />
            <span style={{ fontWeight: 600 }}>Evaluating Officer</span>
          </div>
        </div>
      </div>

      {/* 3. Primary Header Navigation */}
      <div className="gov-main-header">
        <div className="gov-header-inner">
          {/* Brand Identification */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-sm)",
                background: "var(--brand-blue)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 2px 6px rgba(30, 58, 138, 0.25)",
              }}
            >
              <ShieldCheck size={24} />
            </div>

            <div>
              <h1 className="gov-brand-title">
                GeM Bid Compliance Verification
              </h1>
              <p className="gov-brand-subtitle">
                Procurement Compliance & Decision Support
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="gov-nav-bar" aria-label="Portal Workspaces" style={{ display: "flex" }}>
            <button
              type="button"
              className={`gov-nav-item ${activeTab === "reviews" ? "gov-nav-item-active" : ""}`}
              onClick={() => onSelectTab("reviews")}
            >
              <ShieldCheck size={16} />
              <span>Reviews</span>
            </button>

            <button
              type="button"
              className={`gov-nav-item ${activeTab === "tenders" ? "gov-nav-item-active" : ""}`}
              onClick={() => onSelectTab("tenders")}
            >
              <FileCheck2 size={16} />
              <span>Tenders</span>
            </button>

            <button
              type="button"
              className={`gov-nav-item ${activeTab === "documents" ? "gov-nav-item-active" : ""}`}
              onClick={() => onSelectTab("documents")}
            >
              <FileText size={16} />
              <span>Documents</span>
            </button>

            <button
              type="button"
              className={`gov-nav-item ${activeTab === "audit" ? "gov-nav-item-active" : ""}`}
              onClick={() => onSelectTab("audit")}
            >
              <History size={16} />
              <span>Audit History</span>
            </button>
          </nav>

          {/* Secondary Actions on Right */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <button
              type="button"
              className="ent-btn ent-btn-secondary ent-btn-sm"
              onClick={onOpenDemoModal}
              title="Access standard demo cases and evaluation scenarios"
              style={{ fontSize: "0.82rem" }}
            >
              <Sparkles size={14} color="var(--brand-blue)" />
              <span>Demo / Evaluation</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              className="ent-btn ent-btn-ghost ent-btn-sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ display: "none" }}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div
            style={{
              padding: "0.85rem 1.5rem",
              background: "var(--bg-surface)",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <button
              type="button"
              className={`gov-nav-item ${activeTab === "reviews" ? "gov-nav-item-active" : ""}`}
              onClick={() => {
                onSelectTab("reviews");
                setMobileMenuOpen(false);
              }}
            >
              <ShieldCheck size={16} />
              <span>Reviews</span>
            </button>

            <button
              type="button"
              className={`gov-nav-item ${activeTab === "tenders" ? "gov-nav-item-active" : ""}`}
              onClick={() => {
                onSelectTab("tenders");
                setMobileMenuOpen(false);
              }}
            >
              <FileCheck2 size={16} />
              <span>Tenders</span>
            </button>

            <button
              type="button"
              className={`gov-nav-item ${activeTab === "documents" ? "gov-nav-item-active" : ""}`}
              onClick={() => {
                onSelectTab("documents");
                setMobileMenuOpen(false);
              }}
            >
              <FileText size={16} />
              <span>Documents</span>
            </button>

            <button
              type="button"
              className={`gov-nav-item ${activeTab === "audit" ? "gov-nav-item-active" : ""}`}
              onClick={() => {
                onSelectTab("audit");
                setMobileMenuOpen(false);
              }}
            >
              <History size={16} />
              <span>Audit History</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
