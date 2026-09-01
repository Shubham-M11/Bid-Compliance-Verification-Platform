"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  FileText,
  FolderOpen,
  History,
  Pause,
  Play,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface GovernmentPortalHeroProps {
  onStartNewReview: () => void;
  onOpenDemoModal: () => void;
  onNavigateToTab?: (tab: "tenders" | "documents" | "audit") => void;
}

const CAROUSEL_SLIDES = [
  {
    id: "review",
    image: "/images/procurement_hero_admin.jpg",
    label: "PROCUREMENT REVIEW",
    title: "Bid Compliance Verification",
    description:
      "Review bidder submissions against tender requirements with structured verification and supporting evidence.",
  },
  {
    id: "docs",
    image: "/images/procurement_hero_gov.jpg",
    label: "DOCUMENT REVIEW",
    title: "Evidence-Based Compliance Checks",
    description:
      "Examine statutory credentials, submitted documents and cross-document consistency in one review workspace.",
  },
  {
    id: "decision",
    image: "/images/procurement_hero_docs.jpg",
    label: "OFFICER DECISION SUPPORT",
    title: "Review Findings Before You Decide",
    description:
      "Use verified findings, page-level evidence and review-priority indicators to support committee evaluation.",
  },
];

export default function GovernmentPortalHero({
  onStartNewReview,
  onOpenDemoModal,
  onNavigateToTab,
}: GovernmentPortalHeroProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // 5 seconds visible time per slide with clean interval reset
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPlaying, currentSlide]);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* =========================================================
          VIEWPORT 1: FULL HERO & CONTROLS (FILLS REMAINDER OF FIRST VIEWPORT)
          Calculated to fill available screen height so Viewport 1 ends at carousel controls
          ========================================================= */}
      <section aria-label="Platform Hero Overview">
        <div
          className="gov-hero-container"
          style={{
            position: "relative",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            height: "calc(100vh - 128px)",
            minHeight: "540px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "var(--shadow-md)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {/* Background Image Slider with Natural Vertical Cropping */}
          {CAROUSEL_SLIDES.map((slide, idx) => (
            <div
              key={slide.id}
              className="gov-hero-slide"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundImage: `url(${slide.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center 38%",
                opacity: idx === currentSlide ? 1 : 0,
                transition: "opacity 0.65s ease-in-out",
                zIndex: 1,
              }}
            />
          ))}

          {/* High-Contrast Neutral Overlay for Maximum Text Readability */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(15, 23, 42, 0.82) 55%, rgba(15, 23, 42, 0.94) 100%)",
              zIndex: 2,
            }}
          />

          {/* Hero Main Content Area (Vertically Centered with LARGE Dominant Typography) */}
          <div
            style={{
              position: "relative",
              zIndex: 3,
              padding: "clamp(1.75rem, 3.5vw, 2.75rem) clamp(1.75rem, 4vw, 3.5rem) 1.25rem",
              maxWidth: "1050px",
              color: "#ffffff",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            {/* Operational Workflow Label Badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "4px 12px",
                  background: "rgba(245, 158, 11, 0.2)",
                  border: "1px solid rgba(245, 158, 11, 0.55)",
                  borderRadius: "var(--radius-xs)",
                  color: "#fbbf24",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                <Scale size={14} /> {CAROUSEL_SLIDES[currentSlide].label}
              </span>
            </div>

            {/* LARGE Dominant Hero Title */}
            <h1
              style={{
                fontSize: "clamp(2.4rem, 3.8vw, 3.4rem)",
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1.15,
                marginBottom: "0.95rem",
                letterSpacing: "-0.025em",
              }}
            >
              {CAROUSEL_SLIDES[currentSlide].title}
            </h1>

            {/* Large Hero Description */}
            <p
              style={{
                fontSize: "clamp(1.05rem, 1.3vw, 1.22rem)",
                color: "#e2e8f0",
                lineHeight: 1.55,
                marginBottom: "1.75rem",
                maxWidth: "860px",
              }}
            >
              {CAROUSEL_SLIDES[currentSlide].description}
            </p>

            {/* Large Primary Action Buttons */}
            <div style={{ display: "flex", gap: "0.85rem", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                className="ent-btn ent-btn-primary"
                onClick={onStartNewReview}
                style={{
                  fontSize: "1.02rem",
                  padding: "0.75rem 1.6rem",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
                }}
              >
                <ShieldCheck size={20} />
                <span>Start New Review</span>
              </button>

              {onNavigateToTab && (
                <button
                  type="button"
                  className="ent-btn"
                  onClick={() => onNavigateToTab("tenders")}
                  style={{
                    background: "rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    fontSize: "0.98rem",
                    padding: "0.75rem 1.4rem",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <FolderOpen size={17} />
                  <span>View Tenders</span>
                </button>
              )}

              <button
                type="button"
                className="ent-btn"
                onClick={onOpenDemoModal}
                style={{
                  background: "transparent",
                  color: "#cbd5e1",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  fontSize: "0.92rem",
                  padding: "0.75rem 1.25rem",
                }}
              >
                <Sparkles size={16} color="#fbbf24" />
                <span>Evaluation Scenarios</span>
              </button>
            </div>
          </div>

          {/* Hero Footer Controls Bar (Fixed at the Bottom Edge of Viewport 1) */}
          <div
            style={{
              position: "relative",
              zIndex: 3,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.5rem clamp(1.5rem, 4vw, 3.5rem)",
              height: "44px",
              background: "rgba(10, 15, 29, 0.8)",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(8px)",
            }}
          >
            {/* Slide Indicator Dots */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {CAROUSEL_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  style={{
                    width: idx === currentSlide ? "24px" : "8px",
                    height: "8px",
                    borderRadius: "4px",
                    background: idx === currentSlide ? "#fbbf24" : "rgba(255, 255, 255, 0.35)",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    padding: 0,
                  }}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Navigation & Pause/Play Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  color: "#e2e8f0",
                  borderRadius: "var(--radius-xs)",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                title={isPlaying ? "Pause rotation" : "Resume rotation"}
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              </button>
              <button
                type="button"
                onClick={handlePrev}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  color: "#e2e8f0",
                  borderRadius: "var(--radius-xs)",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                title="Previous slide"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNext}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  color: "#e2e8f0",
                  borderRadius: "var(--radius-xs)",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                title="Next slide"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          VIEWPORT 2: OPERATIONS & GOVERNANCE
          Begins cleanly with Quick Access (Zero leftover Hero)
          ========================================================= */}
      <section
        aria-label="Operational Modules & Governance"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.75rem",
        }}
      >
        {/* 1. Quick Access Modules */}
        <div>
          <div style={{ marginBottom: "0.95rem" }}>
            <h2 style={{ fontSize: "1.34rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Quick Access
            </h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Select an operational workflow module to initiate evaluations, examine procurement records, or view decisions.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1rem",
            }}
          >
            {/* Card 1 */}
            <div
              className="ent-card ent-card-hover"
              style={{
                padding: "1.25rem 1.35rem",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "175px",
              }}
              onClick={onStartNewReview}
            >
              <div>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--brand-blue-surface)",
                    color: "var(--brand-blue)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "0.75rem",
                    border: "1px solid var(--brand-blue-border)",
                  }}
                >
                  <ShieldCheck size={18} />
                </div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                  Start Compliance Review
                </h3>
                <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.48 }}>
                  Start the tender-first review process and submit the required bidder documents.
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  color: "var(--brand-blue)",
                  fontWeight: 600,
                  fontSize: "0.86rem",
                  marginTop: "0.85rem",
                }}
              >
                <span>Initiate Review</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* Card 2 */}
            <div
              className="ent-card ent-card-hover"
              style={{
                padding: "1.25rem 1.35rem",
                cursor: onNavigateToTab ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "175px",
              }}
              onClick={() => onNavigateToTab && onNavigateToTab("tenders")}
            >
              <div>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--status-neutral-surface)",
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "0.75rem",
                    border: "1px solid var(--border-medium)",
                  }}
                >
                  <FolderOpen size={18} />
                </div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                  Tender Records
                </h3>
                <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.48 }}>
                  View tender references, requirements, deadlines and associated review records.
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  color: "var(--brand-blue)",
                  fontWeight: 600,
                  fontSize: "0.86rem",
                  marginTop: "0.85rem",
                }}
              >
                <span>Browse Tenders</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* Card 3 */}
            <div
              className="ent-card ent-card-hover"
              style={{
                padding: "1.25rem 1.35rem",
                cursor: onNavigateToTab ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "175px",
              }}
              onClick={() => onNavigateToTab && onNavigateToTab("documents")}
            >
              <div>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--status-neutral-surface)",
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "0.75rem",
                    border: "1px solid var(--border-medium)",
                  }}
                >
                  <FileText size={18} />
                </div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                  Submitted Documents
                </h3>
                <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.48 }}>
                  View tender and bidder documents, extracted information and supporting evidence.
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  color: "var(--brand-blue)",
                  fontWeight: 600,
                  fontSize: "0.86rem",
                  marginTop: "0.85rem",
                }}
              >
                <span>View Documents</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* Card 4 */}
            <div
              className="ent-card ent-card-hover"
              style={{
                padding: "1.25rem 1.35rem",
                cursor: onNavigateToTab ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "175px",
              }}
              onClick={() => onNavigateToTab && onNavigateToTab("audit")}
            >
              <div>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--status-neutral-surface)",
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "0.75rem",
                    border: "1px solid var(--border-medium)",
                  }}
                >
                  <History size={18} />
                </div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                  Review History
                </h3>
                <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.48 }}>
                  View previous review actions, findings and officer notes.
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  color: "var(--brand-blue)",
                  fontWeight: 600,
                  fontSize: "0.86rem",
                  marginTop: "0.85rem",
                }}
              >
                <span>Access History</span>
                <ArrowRight size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Compliance Review Process (Workflow) */}
        <div
          className="ent-card"
          style={{
            padding: "1.3rem 1.5rem",
            background: "var(--bg-primary)",
          }}
        >
          <div style={{ marginBottom: "0.95rem" }}>
            <h2 style={{ fontSize: "1.22rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Compliance Review Process
            </h2>
            <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", marginTop: "1px" }}>
              Follow the same structured review process for every tender submission.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <span
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "var(--brand-blue)",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  1
                </span>
                <strong style={{ fontSize: "0.98rem", color: "var(--text-primary)" }}>01 Tender</strong>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.45, margin: 0 }}>
                Enter the tender details and requirements.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <span
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "var(--brand-blue)",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  2
                </span>
                <strong style={{ fontSize: "0.98rem", color: "var(--text-primary)" }}>02 Bidder</strong>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.45, margin: 0 }}>
                Add the bidder and submitted documents.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <span
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "var(--brand-blue)",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  3
                </span>
                <strong style={{ fontSize: "0.98rem", color: "var(--text-primary)" }}>03 Verification</strong>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.45, margin: 0 }}>
                Review statutory and document consistency checks.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <span
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "var(--brand-blue)",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  4
                </span>
                <strong style={{ fontSize: "0.98rem", color: "var(--text-primary)" }}>04 Officer Review</strong>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.45, margin: 0 }}>
                Examine evidence and record the review action.
              </p>
            </div>
          </div>
        </div>

        {/* 3. Human Oversight Notice */}
        <div
          style={{
            padding: "1rem 1.4rem",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderLeft: "4px solid var(--brand-blue)",
            borderRadius: "var(--radius-sm)",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.85rem",
          }}
        >
          <Scale size={20} color="var(--brand-blue)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "2px" }}>
              Officer Decision Remains Final
            </h4>
            <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.48, margin: 0 }}>
              The platform organizes verification findings and supporting evidence to assist procurement review. <strong>Final procurement decisions remain with the authorized officer and procurement committee.</strong>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
