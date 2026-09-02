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
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
          <span style={{ fontWeight: 700, letterSpacing: "0.01em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Scale size={14} color="var(--gov-saffron)" />
            <span>GeM Bid Compliance Verification</span>
          </span>
          <span className="gov-desktop-only" style={{ opacity: 0.4 }}>|</span>
          <span className="gov-desktop-only" style={{ opacity: 0.85 }}>Procurement Compliance &amp; Decision Support</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* Accessibility Font Resizer */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", background: "rgba(255, 255, 255, 0.1)", padding: "1px 6px", borderRadius: "3px" }}>
            <button
              type="button"
              onClick={() => handleFontSize("normal")}
              style={{
                background: "transparent",
                border: "none",
                color: fontSizeLevel === "normal" ? "#fcd34d" : "#cbd5e1",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.72rem",
                padding: "2px 4px",
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
                color: fontSizeLevel === "large" ? "#fcd34d" : "#cbd5e1",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.78rem",
                padding: "2px 4px",
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
                color: fontSizeLevel === "larger" ? "#fcd34d" : "#cbd5e1",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.85rem",
                padding: "2px 4px",
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
            <Activity size={13} color="var(--status-success)" />
            <span className="gov-desktop-only">System Status</span>
          </button>

          {/* Theme Toggle (Institutional Light / Dark) */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "var(--radius-sm)",
                background: "var(--brand-blue)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 2px 6px rgba(31, 75, 91, 0.25)",
              }}
            >
              <ShieldCheck size={22} />
            </div>

            <div style={{ minWidth: 0 }}>
              <h1 className="gov-brand-title">
                GeM Bid Compliance Verification
              </h1>
              <p className="gov-brand-subtitle">
                Procurement Compliance &amp; Decision Support
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links (Visible on desktop >= 1024px) */}
          <nav className="gov-nav-bar gov-desktop-only" aria-label="Portal Workspaces">
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

          {/* Actions on Right */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
            <button
              type="button"
              className="ent-btn ent-btn-secondary ent-btn-sm"
              onClick={onOpenDemoModal}
              title="Access standard demo cases and evaluation scenarios"
              style={{ fontSize: "0.82rem" }}
            >
              <Sparkles size={14} color="var(--brand-blue)" />
              <span className="gov-desktop-only">Demo / Evaluation</span>
              <span className="gov-tablet-mobile-only">Demo</span>
            </button>

            {/* Mobile Hamburger Toggle (Visible on tablet/mobile < 1024px) */}
            <button
              type="button"
              className="ent-btn ent-btn-ghost ent-btn-sm gov-tablet-mobile-only"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
              style={{ padding: "0.4rem 0.5rem" }}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Collapsible Menu */}
        {mobileMenuOpen && (
          <div
            className="gov-tablet-mobile-only"
            style={{
              padding: "0.85rem 1.25rem 1.15rem",
              background: "var(--bg-surface)",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: "0.45rem",
              width: "100%",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
              Workspaces &amp; Navigation
            </div>

            <button
              type="button"
              className={`gov-nav-item ${activeTab === "reviews" ? "gov-nav-item-active" : ""}`}
              onClick={() => {
                onSelectTab("reviews");
                setMobileMenuOpen(false);
              }}
              style={{ width: "100%", justifyContent: "flex-start" }}
            >
              <ShieldCheck size={17} />
              <span>Reviews Workspace</span>
            </button>

            <button
              type="button"
              className={`gov-nav-item ${activeTab === "tenders" ? "gov-nav-item-active" : ""}`}
              onClick={() => {
                onSelectTab("tenders");
                setMobileMenuOpen(false);
              }}
              style={{ width: "100%", justifyContent: "flex-start" }}
            >
              <FileCheck2 size={17} />
              <span>Tenders Catalog</span>
            </button>

            <button
              type="button"
              className={`gov-nav-item ${activeTab === "documents" ? "gov-nav-item-active" : ""}`}
              onClick={() => {
                onSelectTab("documents");
                setMobileMenuOpen(false);
              }}
              style={{ width: "100%", justifyContent: "flex-start" }}
            >
              <FileText size={17} />
              <span>Documents Repository</span>
            </button>

            <button
              type="button"
              className={`gov-nav-item ${activeTab === "audit" ? "gov-nav-item-active" : ""}`}
              onClick={() => {
                onSelectTab("audit");
                setMobileMenuOpen(false);
              }}
              style={{ width: "100%", justifyContent: "flex-start" }}
            >
              <History size={17} />
              <span>Audit History</span>
            </button>

            <div style={{ height: "1px", background: "var(--border-subtle)", margin: "0.5rem 0" }} />

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="ent-btn ent-btn-secondary ent-btn-sm"
                onClick={() => {
                  onOpenDemoModal();
                  setMobileMenuOpen(false);
                }}
                style={{ flex: 1, justifyContent: "center" }}
              >
                <Sparkles size={14} color="var(--brand-blue)" />
                <span>Evaluation Scenarios</span>
              </button>

              <button
                type="button"
                className="ent-btn ent-btn-ghost ent-btn-sm"
                onClick={() => {
                  onOpenDiagnosticsModal();
                  setMobileMenuOpen(false);
                }}
                style={{ justifyContent: "center" }}
              >
                <Activity size={14} color="var(--status-success)" />
                <span>System Status</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
