"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  FileCheck2,
  FileText,
  FileUp,
  FolderOpen,
  Layers,
  Loader2,
  Plus,
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
import EvaluationDemoModal from "./EvaluationDemoModal";
import EvidenceViewerDrawer from "./EvidenceViewerDrawer";
import ManualVerificationModal from "./ManualVerificationModal";
import NewReviewWizard from "./NewReviewWizard";
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

interface BidReviewWorkspaceProps {
  onOpenDemoScenarios?: () => void;
  externalReview?: CompositeVerificationResponse | null;
  externalBidderName?: string;
  externalTenderRef?: string;
  initialTenderRef?: string;
  initialTenderTitle?: string;
}

export default function BidReviewWorkspace({
  externalReview,
  externalBidderName,
  externalTenderRef,
  initialTenderRef,
  initialTenderTitle,
}: BidReviewWorkspaceProps) {
  const [presets, setPresets] = useState<PresetComplianceScenario[]>(FALLBACK_PRESETS);
  const [sampleBids, setSampleBids] = useState<SampleBidMetadata[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Initial State is genuine empty state (null)
  const [verificationResult, setVerificationResult] =
    useState<CompositeVerificationResponse | null>(externalReview || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Active Bid Info
  const [activeBidderName, setActiveBidderName] = useState<string>(externalBidderName || "");
  const [activeTenderRef, setActiveTenderRef] = useState<string>(
    externalTenderRef || initialTenderRef || ""
  );
  const [activeTenderTitle, setActiveTenderTitle] = useState<string>(
    initialTenderTitle || ""
  );
  const [activeSubmissionDate, setActiveSubmissionDate] = useState<string>("");

  useEffect(() => {
    if (externalReview) {
      setVerificationResult(externalReview);
      if (externalBidderName) setActiveBidderName(externalBidderName);
      if (externalTenderRef) setActiveTenderRef(externalTenderRef);
    }
  }, [externalReview, externalBidderName, externalTenderRef]);

  // Modals & Drawers
  const [newReviewWizardOpen, setNewReviewWizardOpen] = useState<boolean>(false);
  const [demoModalOpen, setDemoModalOpen] = useState<boolean>(false);
  const [statutoryDrawerOpen, setStatutoryDrawerOpen] = useState<boolean>(false);
  const [statutoryDrawerTab, setStatutoryDrawerTab] = useState<
    "gstin" | "pan" | "udyam" | "oem"
  >("gstin");
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState<boolean>(false);
  const [activeEvidence, setActiveEvidence] = useState<EvidenceItem | null>(null);
  const [manualModalOpen, setManualModalOpen] = useState<boolean>(false);

  // Load presets & sample bid metadata quietly in background without auto-running
  useEffect(() => {
    async function loadMetadata() {
      try {
        const remotePresets = await getCompliancePresets();
        if (remotePresets && remotePresets.length > 0) {
          setPresets(remotePresets);
        }
      } catch {
        // Fallback already assigned
      }

      try {
        const samples = await getSampleBids();
        if (samples && samples.length > 0) {
          setSampleBids(samples);
        }
      } catch {
        // Graceful fallback
      }
    }
    loadMetadata();
  }, []);

  const handleReviewCreatedFromWizard = (
    result: CompositeVerificationResponse,
    meta: { bidderName: string; tenderRefNumber: string; tenderTitle?: string }
  ) => {
    setActivePresetId(null);
    setActiveBidderName(meta.bidderName);
    setActiveTenderRef(meta.tenderRefNumber);
    if (meta.tenderTitle) setActiveTenderTitle(meta.tenderTitle);
    setActiveSubmissionDate(new Date().toISOString().split("T")[0]);
    setVerificationResult(result);
    setError(null);
  };

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
    setActiveTenderTitle(preset.name);
    setActiveSubmissionDate("2026-04-15");

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

  const handleSelectSampleBid = async (sample: SampleBidMetadata) => {
    setActivePresetId(null);
    setIsLoading(true);
    setError(null);
    setActiveBidderName(sample.bidder_name);
    setActiveTenderRef(sample.tender_ref);
    setActiveTenderTitle(sample.name);
    setActiveSubmissionDate(new Date().toISOString().split("T")[0]);

    try {
      const res = await verifySampleBid(sample.sample_id);
      setVerificationResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process sample PDF document";
      setError(msg);
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
    setActiveTenderTitle("Custom Credentials Evaluation");
    setActiveSubmissionDate(new Date().toISOString().split("T")[0]);

    try {
      const res = await verifyCompliance(request);
      setVerificationResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error executing compliance verification");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearReview = () => {
    setVerificationResult(null);
    setActivePresetId(null);
    setActiveBidderName("");
    setActiveTenderRef("");
    setActiveTenderTitle("");
    setActiveSubmissionDate("");
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
      {/* Top Action Bar when Review is Active */}
      {verificationResult && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              className="ent-btn ent-btn-primary"
              onClick={() => setNewReviewWizardOpen(true)}
            >
              <Plus size={14} /> New Compliance Review
            </button>
            <button
              type="button"
              className="ent-btn ent-btn-secondary"
              onClick={() => setDemoModalOpen(true)}
            >
              <Layers size={14} color="var(--brand-blue)" /> Evaluation Scenarios
            </button>
          </div>

          <button
            type="button"
            className="ent-btn ent-btn-secondary ent-btn-sm"
            onClick={handleClearReview}
          >
            <RotateCcw size={13} /> Reset Review
          </button>
        </div>
      )}

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

      {/* Loading Indicator */}
      {isLoading && (
        <div
          className="ent-card"
          style={{
            textAlign: "center",
            padding: "3rem 2rem",
            marginBottom: "1.5rem",
          }}
        >
          <Loader2 size={32} color="var(--brand-blue)" className="spin" style={{ margin: "0 auto 1rem auto" }} />
          <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
            Executing Statutory Compliance Verification...
          </h4>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            Running offline Mod-36 checksums, PAN identity decoding, MAF temporal checks, and sandbox cross-verification.
          </p>
        </div>
      )}

      {/* Main Review Workspace */}
      {verificationResult ? (
        <>
          {/* Level 1: Bid Summary & Review Priority Header */}
          <BidSummaryHeader
            bidderName={activeBidderName}
            tenderRefNumber={activeTenderRef}
            tenderTitle={activeTenderTitle}
            submissionDate={activeSubmissionDate}
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

          {/* Level 3: Review Findings Section */}
          <ReviewFindingsSection
            findings={verificationResult.findings}
            scoreBreakdown={verificationResult.score_breakdown}
            onInspectEvidence={openEvidenceDrawer}
          />

          {/* Level 3: Score Deduction Waterfall Card */}
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

          {/* Level 5: Source Evidence & Provenance Audit Trail */}
          <SourceEvidenceAudit
            evidenceList={verificationResult.evidence_audit_trail}
            onInspectEvidence={openEvidenceDrawer}
          />
        </>
      ) : (
        !isLoading && (
          /* Genuine Clean Empty State */
          <div
            className="ent-card"
            style={{
              textAlign: "center",
              padding: "4rem 2rem",
              background: "var(--bg-primary)",
              border: "1px dashed var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              marginTop: "1.5rem",
            }}
          >
            <ShieldCheck size={52} color="var(--brand-blue)" style={{ margin: "0 auto 1.25rem auto" }} />
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem", letterSpacing: "-0.01em" }}>
              Start a Compliance Review
            </h3>
            <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", maxWidth: "540px", margin: "0 auto 1.75rem auto", lineHeight: 1.55 }}>
              Upload a tender context and bidder submission document to begin deterministic statutory validation, cross-document consistency checks, and officer decision support.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="ent-btn ent-btn-primary ent-btn-lg"
                onClick={() => setNewReviewWizardOpen(true)}
              >
                <Plus size={16} />
                <span>+ New Compliance Review</span>
              </button>

              <button
                type="button"
                className="ent-btn ent-btn-secondary ent-btn-lg"
                onClick={() => setDemoModalOpen(true)}
              >
                <Layers size={16} color="var(--brand-blue)" />
                <span>Evaluation & Demo Mode</span>
              </button>

              <button
                type="button"
                className="ent-btn ent-btn-secondary ent-btn-lg"
                onClick={() => setManualModalOpen(true)}
              >
                <FileText size={16} color="var(--text-muted)" />
                <span>Enter Direct Credentials</span>
              </button>
            </div>
          </div>
        )
      )}

      {/* New Compliance Review 4-Step Wizard */}
      <NewReviewWizard
        isOpen={newReviewWizardOpen}
        onClose={() => setNewReviewWizardOpen(false)}
        onReviewCreated={handleReviewCreatedFromWizard}
      />

      {/* Evaluation & Demo Scenarios Modal */}
      <EvaluationDemoModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        presets={presets}
        sampleBids={sampleBids}
        onSelectPreset={runPreset}
        onSelectSampleBid={handleSelectSampleBid}
        isLoading={isLoading}
      />

      {/* Statutory Details Slide-over Drawer */}
      <StatutoryDetailsDrawer
        isOpen={statutoryDrawerOpen}
        onClose={() => setStatutoryDrawerOpen(false)}
        initialTab={statutoryDrawerTab}
        bundle={verificationResult?.statutory_verifications}
      />

      {/* Evidence Viewer Slide-over Drawer */}
      <EvidenceViewerDrawer
        isOpen={evidenceDrawerOpen}
        onClose={() => setEvidenceDrawerOpen(false)}
        evidence={activeEvidence}
      />

      {/* Direct Credentials Entry Modal */}
      <ManualVerificationModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        onSubmit={handleManualSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
