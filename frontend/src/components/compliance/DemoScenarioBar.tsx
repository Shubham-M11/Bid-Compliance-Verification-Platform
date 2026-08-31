"use client";

import React from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Edit3,
  Factory,
  FileUp,
  RotateCcw,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";
import type { PresetComplianceScenario } from "@/services/types/compliance";

interface DemoScenarioBarProps {
  presets: PresetComplianceScenario[];
  activePresetId?: string | null;
  onSelectPreset: (preset: PresetComplianceScenario) => void;
  onOpenManualModal: () => void;
  onUploadClick: () => void;
  isLoading?: boolean;
}

export default function DemoScenarioBar({
  presets,
  activePresetId,
  onSelectPreset,
  onOpenManualModal,
  onUploadClick,
  isLoading = false,
}: DemoScenarioBarProps) {
  const getPresetBadge = (category: string) => {
    switch (category) {
      case "Compliant Corporate":
      case "MSME Manufacturer":
      case "Registry Absence":
        return <CheckCircle2 size={12} color="var(--status-success-text)" />;
      case "High Risk & Defaulter":
      case "Expired Authorization":
        return <XCircle size={12} color="var(--status-critical-text)" />;
      default:
        return <AlertTriangle size={12} color="var(--status-warning-text)" />;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem",
        marginBottom: "1.25rem",
        padding: "0.85rem 1.15rem",
        background: "var(--bg-primary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      {/* Left: Quick Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="ent-btn ent-btn-primary"
          onClick={onUploadClick}
          disabled={isLoading}
        >
          <FileUp size={14} /> Upload Bid PDF
        </button>

        <button
          type="button"
          className="ent-btn ent-btn-secondary"
          onClick={onOpenManualModal}
          disabled={isLoading}
        >
          <Edit3 size={14} /> Enter Credentials
        </button>
      </div>

      {/* Right: Demo Scenarios */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
          Demo Scenarios:
        </span>

        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
          {presets.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={`nav-tab-btn ${isSelected ? "active" : ""}`}
                onClick={() => onSelectPreset(preset)}
                disabled={isLoading}
                style={{
                  padding: "0.35rem 0.65rem",
                  fontSize: "0.76rem",
                  borderRadius: "var(--radius-xs)",
                }}
                title={preset.description}
              >
                {getPresetBadge(preset.category)}
                <span>{preset.name.split("(")[0].trim()}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
