"use client";

import React from "react";
import {
  AlertTriangle,
  ArrowDown,
  Building2,
  Calendar,
  CheckCircle2,
  FileCheck2,
  FileText,
  Info,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type {
  CompositeStatus,
  RiskLevel,
} from "@/services/types/compliance";

interface BidSummaryHeaderProps {
  bidderName: string;
  tenderRefNumber: string;
  tenderTitle?: string;
  submissionDate?: string;
  score: number;
  riskLevel: RiskLevel;
  riskGuidance: string;
  overallStatus: CompositeStatus;
  disclaimer: string;
  issueCount: number;
  onRefresh?: () => void;
  onClear?: () => void;
  isLoading?: boolean;
}

export default function BidSummaryHeader({
  bidderName,
  tenderRefNumber,
  tenderTitle,
  submissionDate,
  score,
  riskLevel,
  riskGuidance,
  overallStatus,
  disclaimer,
  issueCount,
  onRefresh,
  onClear,
  isLoading = false,
}: BidSummaryHeaderProps) {
  const getReviewStatus = (status: CompositeStatus) => {
    switch (status) {
      case "COMPLIANT":
        return {
          label: "Ready for Officer Review",
          statusText: "COMPLIANT",
          badgeClass: "ent-badge-success",
          icon: CheckCircle2,
        };
      case "CONDITIONAL_COMPLIANCE":
        return {
          label: "Conditional Review Needed",
          statusText: "CONDITIONAL",
          badgeClass: "ent-badge-warning",
          icon: AlertTriangle,
        };
      case "REVIEW_REQUIRED":
        return {
          label: "Needs Attention",
          statusText: "REVIEW REQUIRED",
          badgeClass: "ent-badge-warning",
          icon: AlertTriangle,
        };
      case "NON_COMPLIANT":
        return {
          label: "Action Required (Non-Compliant)",
          statusText: "NON-COMPLIANT",
          badgeClass: "ent-badge-critical",
          icon: XCircle,
        };
      default:
        return {
          label: status,
          statusText: status,
          badgeClass: "ent-badge-neutral",
          icon: ShieldCheck,
        };
    }
  };

  const getRiskLabel = (risk: RiskLevel) => {
    switch (risk) {
      case "LOW_RISK":
        return "Low Compliance Risk";
      case "MEDIUM_RISK":
        return "Moderate Compliance Risk";
      case "HIGH_RISK":
        return "High Compliance Risk";
      default:
        return risk;
    }
  };

  const getRiskBadge = (risk: RiskLevel) => {
    switch (risk) {
      case "LOW_RISK":
        return (
          <span className="ent-badge ent-badge-success">
            <ShieldCheck size={12} /> {getRiskLabel(risk)}
          </span>
        );
      case "MEDIUM_RISK":
        return (
          <span className="ent-badge ent-badge-warning">
            <AlertTriangle size={12} /> {getRiskLabel(risk)}
          </span>
        );
      case "HIGH_RISK":
        return (
          <span className="ent-badge ent-badge-critical">
            <ShieldAlert size={12} /> {getRiskLabel(risk)}
          </span>
        );
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const reviewStatus = getReviewStatus(overallStatus);
  const StatusIcon = reviewStatus.icon;

  const displayDate = submissionDate
    ? new Date(submissionDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

  return (
    <div
      className="ent-card"
      style={{
        marginBottom: "1.5rem",
        borderLeft: "4px solid var(--brand-blue)",
        padding: "1.25rem 1.5rem",
      }}
    >
      {/* Level 1: Tender & Bidder Identity + Review Status */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1.25rem",
          paddingBottom: "1.1rem",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {/* Tender & Bidder Information */}
        <div style={{ flex: 1, minWidth: "280px" }}>
          {/* Tender Context Tag */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.78rem",
              color: "var(--text-secondary)",
              marginBottom: "0.35rem",
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              <FileCheck2 size={13} color="var(--brand-blue)" />
              <span>Tender:</span>
              <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                {tenderRefNumber || "GEM/2026/B/890123"}
              </strong>
            </span>
            {tenderTitle && (
              <>
                <span>•</span>
                <span style={{ color: "var(--text-secondary)" }}>{tenderTitle}</span>
              </>
            )}
          </div>

          {/* Bidder Legal Name */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <Building2 size={20} color="var(--brand-blue)" style={{ flexShrink: 0 }} />
            <h2
              style={{
                fontSize: "1.28rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
                lineHeight: 1.25,
              }}
            >
              {bidderName || "Bidder Submission"}
            </h2>
          </div>

          {/* Submission Date */}
          <div
            style={{
              fontSize: "0.76rem",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <Calendar size={12} />
            <span>
              Submission Date: <strong style={{ color: "var(--text-secondary)" }}>{displayDate}</strong>
            </span>
          </div>
        </div>

        {/* Level 2: Review Status & Utility Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            flexWrap: "wrap",
          }}
        >
          {/* Overall Review Status Badge */}
          <span
            className={`ent-badge ${reviewStatus.badgeClass}`}
            style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
            title={`Status: ${reviewStatus.statusText}`}
          >
            <StatusIcon size={14} />
            <span>{reviewStatus.label}</span>
          </span>

          {onRefresh && (
            <button
              type="button"
              className="ent-btn ent-btn-secondary ent-btn-sm"
              onClick={onRefresh}
              disabled={isLoading}
              title="Re-run compliance evaluation"
            >
              <RefreshCw size={13} className={isLoading ? "spin" : ""} />
            </button>
          )}

          {onClear && (
            <button
              type="button"
              className="ent-btn ent-btn-secondary ent-btn-sm"
              onClick={onClear}
              disabled={isLoading}
              title="Clear review and reset workspace"
              style={{ color: "var(--text-muted)" }}
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Level 3: Score / Risk & Officer Guidance */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          gap: "1.5rem",
          alignItems: "center",
          paddingTop: "1.1rem",
        }}
      >
        {/* Score & Risk Badge Group (Restrained, Not Oversized) */}
        <div
          style={{
            borderRight: "1px solid var(--border-subtle)",
            paddingRight: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          <div
            style={{
              fontSize: "0.72rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            Review Priority
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
            <span
              style={{
                fontSize: "1.85rem",
                fontWeight: 800,
                color:
                  score >= 85
                    ? "var(--status-success-text)"
                    : score >= 60
                    ? "var(--status-warning-text)"
                    : "var(--status-critical-text)",
                lineHeight: 1,
              }}
            >
              {score}
            </span>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 600 }}>
              / 100
            </span>
          </div>

          <div>{getRiskBadge(riskLevel)}</div>
        </div>

        {/* Officer Evaluation Guidance */}
        <div>
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "0.2rem",
            }}
          >
            Officer Guidance
          </div>
          <p
            style={{
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
              lineHeight: 1.45,
              margin: 0,
            }}
          >
            {riskGuidance}
          </p>
        </div>

        {/* Quick Jump Action Links */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="ent-btn ent-btn-secondary ent-btn-sm"
            onClick={() => scrollToSection("findings-section")}
          >
            <ArrowDown size={13} />
            {issueCount > 0 ? `Findings (${issueCount})` : "Findings"}
          </button>
          <button
            type="button"
            className="ent-btn ent-btn-secondary ent-btn-sm"
            onClick={() => scrollToSection("evidence-section")}
          >
            <FileText size={13} />
            <span>Evidence</span>
          </button>
        </div>
      </div>

      {/* Decision-Support Transparency Notice */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginTop: "1rem",
          paddingTop: "0.75rem",
          borderTop: "1px solid var(--border-subtle)",
          fontSize: "0.74rem",
          color: "var(--text-muted)",
          lineHeight: 1.4,
        }}
      >
        <Info size={13} color="var(--brand-blue)" style={{ flexShrink: 0 }} />
        <div>
          <strong>Decision Support Notice: </strong>
          {disclaimer} Platform scores assist manual committee evaluation and do not constitute automatic award or disqualification.
        </div>
      </div>
    </div>
  );
}
