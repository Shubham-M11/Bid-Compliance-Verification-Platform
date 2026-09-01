"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  FileCheck2,
  FileText,
  FileUp,
  FolderOpen,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import {
  getCompliancePresets,
  getSampleBids,
  uploadDocument,
  verifyCompliance,
  verifyDocument,
  verifySampleBid,
} from "@/services/api";
import type {
  CompositeVerificationRequest,
  CompositeVerificationResponse,
  EvidenceItem,
  PresetComplianceScenario,
  SampleBidMetadata,
} from "@/services/types/compliance";

import BidSummaryHeader from "./BidSummaryHeader";
import ComplianceChecksGrid from "./ComplianceChecksGrid";
import CrossEntityTable from "./CrossEntityTable";
import DemoScenarioBar from "./DemoScenarioBar";
import EvidenceViewerDrawer from "./EvidenceViewerDrawer";
import ManualVerificationModal from "./ManualVerificationModal";
import OfficerDecisionPanel from "./OfficerDecisionPanel";
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
  const [sampleBids, setSampleBids] = useState<SampleBidMetadata[]>([]);
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
  const [uploadModalTab, setUploadModalTab] = useState<"samples" | "upload">("samples");
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

      try {
        const samples = await getSampleBids();
        if (samples && samples.length > 0) {
          setSampleBids(samples);
        }
      } catch {
        // Sample bids will fall back gracefully
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

  const handleSelectSampleBid = async (sample: SampleBidMetadata) => {
    setActivePresetId(null);
    setUploadLoading(true);
    setUploadError(null);
    setIsLoading(true);
    setError(null);
    setActiveBidderName(sample.bidder_name);
    setActiveTenderRef(sample.tender_ref);

    try {
      const res = await verifySampleBid(sample.sample_id);
      setVerificationResult(res);
      setUploadModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process sample PDF document";
      setUploadError(msg);
      setError(msg);
    } finally {
      setUploadLoading(false);
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

  const handleClearReview = () => {
    setVerificationResult(null);
    setActivePresetId(null);
    setError(null);
    setStatutoryDrawerOpen(false);
    setEvidenceDrawerOpen(false);
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
      {/* Top Controls: Preset Scenarios & Action Buttons */}
      <DemoScenarioBar
        presets={presets}
        activePresetId={activePresetId}
        onSelectPreset={runPreset}
        onUploadClick={() => {
          setUploadModalTab("samples");
          setUploadModalOpen(true);
        }}
        onOpenManualModal={() => setManualModalOpen(true)}
        isLoading={isLoading}
      />

      {/* Global Error Banner */}
      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "var(--status-critical-surface)",
            border: "1px solid var(--status-critical-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--status-critical-text)",
            fontSize: "0.84rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1.25rem",
          }}
        >
          <AlertCircle size={16} />
          <span>
            <strong>Evaluation Error: </strong> {error}
          </span>
        </div>
      )}

      {/* Main Review Workspace */}
      {verificationResult ? (
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
            onClear={handleClearReview}
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

          {/* Level 4: Officer Decision Support & Review Actions */}
          <OfficerDecisionPanel
            verificationId={verificationResult.verification_id}
            findings={verificationResult.findings}
            score={verificationResult.overall_score}
            bidderName={activeBidderName}
            tenderRefNumber={activeTenderRef}
          />

          {/* Level 5: Cross-Entity Consistency Table */}
          <CrossEntityTable
            checks={verificationResult.consistency_checks}
            onInspectEvidence={openEvidenceDrawer}
          />

          {/* Level 5: Source Evidence & Provenance Audit */}
          <SourceEvidenceAudit
            evidenceList={verificationResult.evidence_audit_trail}
            onInspectEvidence={openEvidenceDrawer}
          />
        </>
      ) : (
        !isLoading && (
          /* Clean Empty State */
          <div
            className="ent-card"
            style={{
              textAlign: "center",
              padding: "3.5rem 2rem",
              background: "var(--bg-surface)",
              border: "2px dashed var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              marginTop: "1.5rem",
            }}
          >
            <ShieldCheck size={48} color="var(--brand-blue)" style={{ margin: "0 auto 1rem auto" }} />
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.5rem" }}>
              Procurement Review Workspace Ready
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", maxWidth: "560px", margin: "0 auto 1.5rem auto", lineHeight: 1.5 }}>
              Select a pre-loaded evaluation scenario from the presets bar above, load a sample bid PDF fixture, or upload a custom tender document to begin statutory verification.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="ent-btn ent-btn-primary"
                onClick={() => {
                  setUploadModalTab("samples");
                  setUploadModalOpen(true);
                }}
              >
                <FolderOpen size={14} /> Select Sample Bid PDF
              </button>
              <button
                type="button"
                className="ent-btn ent-btn-secondary"
                onClick={() => runPreset(presets[0])}
              >
                <Sparkles size={14} /> Load Baseline Preset
              </button>
            </div>
          </div>
        )
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

      {/* Upload & Sample PDF Document Modal */}
      {uploadModalOpen && (
        <div className="ent-modal-overlay" onClick={() => setUploadModalOpen(false)}>
          <div className="ent-modal-content" style={{ maxWidth: "720px" }} onClick={(e) => e.stopPropagation()}>
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
                  Load Bid Submission Document
                </h3>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Select a pre-loaded evaluation PDF scenario or upload your own tender bid PDF.
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

            {/* Modal Tabs */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <button
                type="button"
                className={`ent-btn ${uploadModalTab === "samples" ? "ent-btn-primary" : "ent-btn-secondary"} ent-btn-sm`}
                onClick={() => setUploadModalTab("samples")}
              >
                <FolderOpen size={13} /> Pre-Loaded Evaluation Scenarios ({sampleBids.length || 8})
              </button>
              <button
                type="button"
                className={`ent-btn ${uploadModalTab === "upload" ? "ent-btn-primary" : "ent-btn-secondary"} ent-btn-sm`}
                onClick={() => setUploadModalTab("upload")}
              >
                <FileUp size={13} /> Upload Local PDF File
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

            {/* Tab 1: Sample Bids Grid */}
            {uploadModalTab === "samples" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
                  gap: "0.65rem",
                  maxHeight: "380px",
                  overflowY: "auto",
                  paddingRight: "4px",
                }}
              >
                {sampleBids.map((sample) => (
                  <button
                    key={sample.sample_id}
                    type="button"
                    onClick={() => handleSelectSampleBid(sample)}
                    disabled={uploadLoading}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      padding: "0.75rem 0.95rem",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      color: "#ffffff",
                      cursor: uploadLoading ? "not-allowed" : "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "#ffffff" }}>
                        {sample.name}
                      </span>
                      <span
                        className={`ent-badge ${
                          sample.expected_score >= 85
                            ? "ent-badge-success"
                            : sample.expected_score >= 60
                            ? "ent-badge-warning"
                            : "ent-badge-critical"
                        }`}
                        style={{ fontSize: "0.65rem", padding: "1px 6px" }}
                      >
                        {sample.expected_score}/100 · {sample.expected_risk.replace("_", " ")}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--brand-blue)", marginBottom: "3px" }}>
                      {sample.bidder_name} ({sample.filename})
                    </div>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.35, margin: 0 }}>
                      {sample.description}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* Tab 2: Custom Local PDF Upload */}
            {uploadModalTab === "upload" && (
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
                  Select Custom Bid Document (PDF)
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
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
              <button
                type="button"
                className="ent-btn ent-btn-secondary"
                onClick={() => setUploadModalOpen(false)}
                disabled={uploadLoading}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
