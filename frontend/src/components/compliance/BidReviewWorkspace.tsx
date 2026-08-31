"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  FileUp,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { getCompliancePresets, uploadDocument, verifyCompliance, verifyDocument } from "@/services/api";
import type {
  CompositeVerificationRequest,
  CompositeVerificationResponse,
  EvidenceItem,
  PresetComplianceScenario,
} from "@/services/types/compliance";

import BidSummaryHeader from "./BidSummaryHeader";
import ComplianceChecksGrid from "./ComplianceChecksGrid";
import CrossEntityTable from "./CrossEntityTable";
import DemoScenarioBar from "./DemoScenarioBar";
import EvidenceViewerDrawer from "./EvidenceViewerDrawer";
import ManualVerificationModal from "./ManualVerificationModal";
import ReviewFindingsSection from "./ReviewFindingsSection";
import ScoreExplanationCard from "./ScoreExplanationCard";
import SourceEvidenceAudit from "./SourceEvidenceAudit";
import StatutoryDetailsDrawer from "./StatutoryDetailsDrawer";

const FALLBACK_PRESETS: PresetComplianceScenario[] = [
  {
    id: "scn_corporate_compliant",
    name: "Fully Compliant Corporate (Tech Mahindra Ltd)",
    category: "Compliant Corporate",
    description:
      "Verified active corporate taxpayer in Maharashtra with consistent PAN, valid Luhn Mod-36 checksum, and active HPE Platinum MAF authorization.",
    gstin_request: {
      gstin: "27AAACT2727Q1ZW",
      expected_legal_name: "Tech Mahindra Limited",
      expected_state_code: "27",
    },
    pan_request: {
      pan: "AAACT2727Q",
      expected_legal_name: "Tech Mahindra Limited",
    },
    oem_request: {
      oem_name: "Hewlett Packard Enterprise India Private Limited",
      authorized_partner_name: "Tech Mahindra Limited",
      maf_number: "HPE-IND-MAF-2026-0045",
      tender_ref_number: "GEM/2026/B/890123",
      valid_from: "2026-01-01",
      valid_until: "2027-03-31",
    },
  },
  {
    id: "scn_msme_manufacturer",
    name: "MSME Micro Manufacturer (NexaTech Innovations LLP)",
    category: "MSME Manufacturer",
    description:
      "Active Delhi MSME Micro enterprise eligible for advisory EMD waiver, with active Cisco Systems MAF and matching LLP entity classification.",
    gstin_request: {
      gstin: "07AABFN1234F1ZS",
      expected_legal_name: "NexaTech Innovations LLP",
      expected_state_code: "07",
    },
    pan_request: {
      pan: "AABFN1234F",
      expected_legal_name: "NexaTech Innovations LLP",
    },
    udyam_request: {
      udyam_registration_number: "UDYAM-DL-01-0012345",
      expected_enterprise_name: "NexaTech Innovations LLP",
    },
    oem_request: {
      oem_name: "Cisco Systems India Private Limited",
      authorized_partner_name: "NexaTech Innovations LLP",
      maf_number: "MAF-CSCO-2026-8891",
      tender_ref_number: "GEM/2026/B/445566",
      valid_from: "2026-04-01",
      valid_until: "2027-03-31",
    },
  },
  {
    id: "scn_taxpayer_suspended",
    name: "Suspended Taxpayer & Revoked MAF (Apex Infotech Pvt Ltd)",
    category: "High Risk & Defaulter",
    description:
      "Taxpayer with a valid checksum whose GST registration is SUSPENDED for filing defaults, alongside a revoked OEM authorization.",
    gstin_request: {
      gstin: "09AABCA5678A1ZT",
      expected_legal_name: "Apex Infotech Private Limited",
      expected_state_code: "09",
    },
    pan_request: {
      pan: "AABCA5678A",
      expected_legal_name: "Apex Infotech Private Limited",
    },
    oem_request: {
      oem_name: "Dell International Services India Private Limited",
      authorized_partner_name: "Apex Infotech Private Limited",
      maf_number: "DELL-MAF-2024-9102",
      tender_ref_number: "GEM/2026/B/112233",
      valid_from: "2024-01-01",
      valid_until: "2025-12-31",
    },
  },
  {
    id: "scn_invalid_checksum",
    name: "Checksum Mismatch & State Error (Infosys Ltd)",
    category: "Algorithmic Violation",
    description:
      "Algorithmic detection of an invalid 15th character Mod-36 checksum and state code discrepancy (Karnataka prefix 29 vs expected Maharashtra 27).",
    gstin_request: {
      gstin: "29AAACH2702H1ZZ",
      expected_legal_name: "Infosys Limited",
      expected_state_code: "27",
    },
    pan_request: {
      pan: "AAACH2702H",
      expected_legal_name: "Infosys Limited",
    },
  },
  {
    id: "scn_expired_oem_maf",
    name: "Expired Authorization MAF (Cisco Systems)",
    category: "Expired Authorization",
    description:
      "Deterministic detection of an expired MAF validity window where valid_until date has already passed relative to bid submission date.",
    oem_request: {
      oem_name: "Cisco Systems India Private Limited",
      authorized_partner_name: "NexaTech Innovations LLP",
      maf_number: "MAF-CSCO-2024-1100",
      tender_ref_number: "GEM/2026/B/778899",
      valid_from: "2024-01-01",
      valid_until: "2024-12-31",
    },
  },
  {
    id: "scn_unregistered_valid_format",
    name: "Unregistered Valid Taxpayer (Ashok Leyland)",
    category: "Registry Absence",
    description:
      "Authentic Tamil Nadu GSTIN with valid Mod-36 checksum that is not present in the sandbox mock registry, verifying zero arbitrary penalty.",
    gstin_request: {
      gstin: "33AAACA6529K1ZQ",
      expected_legal_name: "Ashok Leyland Limited",
      expected_state_code: "33",
    },
    pan_request: {
      pan: "AAACA6529K",
      expected_legal_name: "Ashok Leyland Limited",
    },
  },
];

export default function BidReviewWorkspace() {
  const [presets, setPresets] = useState<PresetComplianceScenario[]>(FALLBACK_PRESETS);
  const [activePresetId, setActivePresetId] = useState<string | null>(
    "scn_corporate_compliant"
  );
  const [verificationResult, setVerificationResult] =
    useState<CompositeVerificationResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Drawers & Modals
  const [statutoryDrawerOpen, setStatutoryDrawerOpen] = useState<boolean>(false);
  const [statutoryDrawerTab, setStatutoryDrawerTab] = useState<
    "gstin" | "pan" | "udyam" | "oem"
  >("gstin");
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState<boolean>(false);
  const [activeEvidence, setActiveEvidence] = useState<EvidenceItem | null>(null);
  const [manualModalOpen, setManualModalOpen] = useState<boolean>(false);
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Active Bid Info
  const [activeBidderName, setActiveBidderName] = useState<string>("Tech Mahindra Limited");
  const [activeTenderRef, setActiveTenderRef] = useState<string>("GEM/2026/B/890123");

  useEffect(() => {
    async function init() {
      try {
        const remotePresets = await getCompliancePresets();
        if (remotePresets && remotePresets.length > 0) {
          setPresets(remotePresets);
          runPreset(remotePresets[0]);
        } else {
          runPreset(FALLBACK_PRESETS[0]);
        }
      } catch {
        runPreset(FALLBACK_PRESETS[0]);
      }
    }
    init();
  }, []);

  const runPreset = async (preset: PresetComplianceScenario) => {
    setActivePresetId(preset.id);
    setIsLoading(true);
    setError(null);

    const bidder =
      preset.gstin_request?.expected_legal_name ||
      preset.pan_request?.expected_legal_name ||
      preset.udyam_request?.expected_enterprise_name ||
      preset.oem_request?.authorized_partner_name ||
      "Bidder Submission";

    const tender =
      preset.oem_request?.tender_ref_number || "GEM/2026/B/890123";

    setActiveBidderName(bidder);
    setActiveTenderRef(tender);

    const request: CompositeVerificationRequest = {
      explicit_gstin: preset.gstin_request || undefined,
      explicit_pan: preset.pan_request || undefined,
      explicit_udyam: preset.udyam_request || undefined,
      explicit_oem: preset.oem_request || undefined,
      bid_metadata: {
        tender_ref_number: tender,
        expected_bidder_name: bidder,
      },
    };

    try {
      const res = await verifyCompliance(request);
      setVerificationResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error executing compliance verification");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = async (request: CompositeVerificationRequest) => {
    setActivePresetId(null);
    setManualModalOpen(false);
    setIsLoading(true);
    setError(null);

    setActiveBidderName(request.bid_metadata?.expected_bidder_name || "Custom Bid Submission");
    setActiveTenderRef(request.bid_metadata?.tender_ref_number || "GEM/2026/B/999999");

    try {
      const res = await verifyCompliance(request);
      setVerificationResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error executing compliance verification");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF documents are supported.");
      return;
    }

    setUploadLoading(true);
    setUploadError(null);

    try {
      const res = await verifyDocument(file);
      
      const resolvedBidder =
        res.statutory_verifications.gstin?.registry.record?.legal_name ||
        res.statutory_verifications.pan?.registry.record?.full_name ||
        res.statutory_verifications.udyam?.registry.record?.enterprise_name ||
        res.statutory_verifications.oem?.authorized_partner_name ||
        (res.extracted_entities.legal_name_candidates.length > 0
          ? res.extracted_entities.legal_name_candidates[0].value
          : file.name.replace(".pdf", ""));

      const resolvedTender =
        (res.extracted_entities.tender_ref_candidates.length > 0
          ? res.extracted_entities.tender_ref_candidates[0].value
          : res.statutory_verifications.oem?.maf_number
          ? "GEM/2026/B/890123"
          : "GEM/2026/B/445566");

      setActivePresetId(null);
      setActiveBidderName(resolvedBidder);
      setActiveTenderRef(resolvedTender);
      setVerificationResult(res);
      setUploadModalOpen(false);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Failed to process and verify PDF document");
    } finally {
      setUploadLoading(false);
    }
  };

  const openStatutoryDrawer = (type: "gstin" | "pan" | "udyam" | "oem") => {
    setStatutoryDrawerTab(type);
    setStatutoryDrawerOpen(true);
  };

  const openEvidenceDrawer = (evidence: EvidenceItem) => {
    setActiveEvidence(evidence);
    setEvidenceDrawerOpen(true);
  };

  return (
    <div>
      {/* Demo Scenario & Upload Bar */}
      <DemoScenarioBar
        presets={presets}
        activePresetId={activePresetId}
        onSelectPreset={runPreset}
        onOpenManualModal={() => setManualModalOpen(true)}
        onUploadClick={() => setUploadModalOpen(true)}
        isLoading={isLoading}
      />

      {/* Error Alert */}
      {error && (
        <div
          style={{
            padding: "0.85rem 1.15rem",
            background: "var(--status-critical-surface)",
            border: "1px solid var(--status-critical-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--status-critical-text)",
            fontSize: "0.84rem",
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <AlertCircle size={16} />
          <span>
            <strong>Evaluation Error: </strong> {error}
          </span>
        </div>
      )}

      {/* Main Review Workspace */}
      {verificationResult && (
        <>
          {/* Level 1: Bid Summary & Priority Score */}
          <BidSummaryHeader
            bidderName={activeBidderName}
            tenderRefNumber={activeTenderRef}
            score={verificationResult.overall_score}
            riskLevel={verificationResult.risk_level}
            riskGuidance={verificationResult.risk_level_guidance}
            overallStatus={verificationResult.overall_status}
            disclaimer={verificationResult.disclaimer}
            issueCount={verificationResult.findings.length}
            onRefresh={() => {
              const current = presets.find((p) => p.id === activePresetId) || presets[0];
              runPreset(current);
            }}
            isLoading={isLoading}
          />

          {/* Level 2: Compact Statutory Checks Grid */}
          <ComplianceChecksGrid
            bundle={verificationResult.statutory_verifications}
            onOpenDetails={openStatutoryDrawer}
          />

          {/* Level 3: Review Findings Section (Centerpiece) */}
          <ReviewFindingsSection
            findings={verificationResult.findings}
            onInspectEvidence={openEvidenceDrawer}
          />

          {/* Level 3: Score Deduction Waterfall */}
          <ScoreExplanationCard
            score={verificationResult.overall_score}
            breakdown={verificationResult.score_breakdown}
          />

          {/* Level 4: Cross-Entity Consistency Table */}
          <CrossEntityTable
            checks={verificationResult.consistency_checks}
            onInspectEvidence={openEvidenceDrawer}
          />

          {/* Level 4: Source Evidence & Provenance Audit */}
          <SourceEvidenceAudit
            evidenceList={verificationResult.evidence_audit_trail}
            onInspectEvidence={openEvidenceDrawer}
          />
        </>
      )}

      {/* Level 5: Statutory Details Drawer */}
      <StatutoryDetailsDrawer
        isOpen={statutoryDrawerOpen}
        onClose={() => setStatutoryDrawerOpen(false)}
        initialTab={statutoryDrawerTab}
        bundle={verificationResult?.statutory_verifications}
      />

      {/* Level 5: Evidence Viewer Drawer */}
      <EvidenceViewerDrawer
        isOpen={evidenceDrawerOpen}
        onClose={() => setEvidenceDrawerOpen(false)}
        evidence={activeEvidence}
      />

      {/* Manual Verification Modal */}
      <ManualVerificationModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        onSubmit={handleManualSubmit}
        isLoading={isLoading}
      />

      {/* Upload Bid Document Modal */}
      {uploadModalOpen && (
        <div className="ent-modal-overlay" onClick={() => setUploadModalOpen(false)}>
          <div className="ent-modal-content" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#ffffff" }}>
                  Upload Bid Submission Document
                </h3>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Upload a PDF bid document to perform automated statutory extraction & compliance evaluation
                </p>
              </div>
              <button
                type="button"
                className="ent-btn ent-btn-secondary ent-btn-sm"
                onClick={() => setUploadModalOpen(false)}
              >
                <X size={15} />
              </button>
            </div>

            {uploadError && (
              <div
                style={{
                  padding: "0.6rem 0.85rem",
                  background: "var(--status-critical-surface)",
                  color: "var(--status-critical-text)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.8rem",
                  marginBottom: "1rem",
                }}
              >
                {uploadError}
              </div>
            )}

            <div
              style={{
                border: "2px dashed var(--border-medium)",
                borderRadius: "var(--radius-md)",
                padding: "2.5rem 1.5rem",
                textAlign: "center",
                background: "var(--bg-surface)",
              }}
            >
              <UploadCloud size={36} color="var(--brand-blue)" style={{ margin: "0 auto 0.75rem auto" }} />
              <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.35rem" }}>
                Select Bid Document (PDF)
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
                Supports digital PDFs and scanned certificates (up to 10 MB).
              </p>

              <label className="ent-btn ent-btn-primary" style={{ cursor: "pointer" }}>
                <FileUp size={14} />
                <span>{uploadLoading ? "Analyzing Document..." : "Browse Files"}</span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleDocumentUpload}
                  disabled={uploadLoading}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
              <button
                type="button"
                className="ent-btn ent-btn-secondary"
                onClick={() => setUploadModalOpen(false)}
                disabled={uploadLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
