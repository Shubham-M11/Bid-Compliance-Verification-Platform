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
import GovernmentPortalHero from "./GovernmentPortalHero";
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
    id: "scn_pan_gstin_mismatch",
    name: "PAN-GSTIN Entity Discrepancy (Tata Consultancy)",
    category: "Entity Mismatch",
    description:
      "Discrepancy where the middle 10 alphanumeric characters of the GSTIN (AAACT2727Q) do not match the submitted PAN card (AABCT9999P).",
    gstin_request: {
      gstin: "27AAACT2727Q1ZW",
      expected_legal_name: "Tata Consultancy Services Limited",
      expected_state_code: "27",
    },
    pan_request: {
      pan: "AABCT9999P",
      expected_legal_name: "Tata Consultancy Services Limited",
    },
  },
  {
    id: "scn_unregistered_valid",
    name: "Valid Unregistered Taxpayer (Ashok Leyland Ltd)",
    category: "Unindexed Taxpayer",
    description:
      "Taxpayer with structurally valid format and checksum that is not indexed in the active local mock registry, receiving zero arbitrary penalty.",
    gstin_request: {
      gstin: "33AAACA1234A1Z5",
      expected_legal_name: "Ashok Leyland Limited",
      expected_state_code: "33",
    },
    pan_request: {
      pan: "AAACA1234A",
      expected_legal_name: "Ashok Leyland Limited",
    },
  },
];

interface BidReviewWorkspaceProps {
  externalReview?: CompositeVerificationResponse | null;
  externalBidderName?: string;
  externalTenderRef?: string;
  initialTenderRef?: string;
  initialTenderTitle?: string;
  tenderTriggerId?: number;
  onClearTargetTender?: () => void;
  onNavigateToTab?: (tab: "tenders" | "documents" | "audit") => void;
}

export default function BidReviewWorkspace({
  externalReview,
  externalBidderName,
  externalTenderRef,
  initialTenderRef,
  initialTenderTitle,
  tenderTriggerId,
  onClearTargetTender,
  onNavigateToTab,
}: BidReviewWorkspaceProps) {
  const [presets, setPresets] = useState<PresetComplianceScenario[]>(FALLBACK_PRESETS);
  const [sampleBids, setSampleBids] = useState<SampleBidMetadata[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] =
    useState<CompositeVerificationResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Active Bid Metadata
  const [activeBidderName, setActiveBidderName] = useState<string>("");
  const [activeTenderRef, setActiveTenderRef] = useState<string>("");
  const [activeTenderTitle, setActiveTenderTitle] = useState<string>("");
  const [activeSubmissionDate, setActiveSubmissionDate] = useState<string>("");

  // Modals & Drawers
  const [newReviewWizardOpen, setNewReviewWizardOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [statutoryDrawerOpen, setStatutoryDrawerOpen] = useState(false);
  const [statutoryDrawerTab, setStatutoryDrawerTab] = useState<
    "gstin" | "pan" | "udyam" | "oem"
  >("gstin");
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);
  const [activeEvidence, setActiveEvidence] = useState<EvidenceItem | null>(null);

  // Load Presets & Sample Bids from backend on mount
  useEffect(() => {
    async function loadMeta() {
      try {
        const p = await getCompliancePresets();
        if (p && p.length > 0) setPresets(p);
      } catch {}
      try {
        const s = await getSampleBids();
        if (s && s.length > 0) setSampleBids(s);
      } catch {}
    }
    loadMeta();
  }, []);

  // Handle external review injection
  useEffect(() => {
    if (externalReview) {
      setVerificationResult(externalReview);
      setActiveBidderName(externalBidderName || "Bidder Submission");
      setActiveTenderRef(externalTenderRef || "GEM/2026/B/890123");
      setActiveTenderTitle(initialTenderTitle || "Procurement Evaluation Context");
      setActiveSubmissionDate(new Date().toISOString().split("T")[0]);
      setError(null);
    }
  }, [externalReview, externalBidderName, externalTenderRef, initialTenderTitle]);

  // Handle tender start context from Tenders workspace
  useEffect(() => {
    if (initialTenderRef && tenderTriggerId) {
      setActiveTenderRef(initialTenderRef);
      if (initialTenderTitle) setActiveTenderTitle(initialTenderTitle);
      setNewReviewWizardOpen(true);
    }
  }, [initialTenderRef, initialTenderTitle, tenderTriggerId]);

  // Run a preset scenario
  const runPreset = async (preset: PresetComplianceScenario) => {
    setIsLoading(true);
    setError(null);
    setActivePresetId(preset.id);

    const bidder =
      preset.gstin_request?.expected_legal_name ||
      preset.pan_request?.expected_legal_name ||
      preset.udyam_request?.expected_enterprise_name ||
      preset.oem_request?.authorized_partner_name ||
      "Bidder Submission";
    const tender = preset.oem_request?.tender_ref_number || "GEM/2026/B/890123";

    setActiveBidderName(bidder);
    setActiveTenderRef(tender);
    setActiveTenderTitle("Enterprise Public Procurement Evaluation");
    setActiveSubmissionDate("2026-04-15");

    try {
      const payload: CompositeVerificationRequest = {
        explicit_gstin: preset.gstin_request || undefined,
        explicit_pan: preset.pan_request || undefined,
        explicit_udyam: preset.udyam_request || undefined,
        explicit_oem: preset.oem_request || undefined,
        bid_metadata: {
          tender_ref_number: tender,
          expected_bidder_name: bidder,
          bid_submission_date: "2026-04-15",
        },
      };
      const result = await verifyCompliance(payload);
      setVerificationResult(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to execute compliance verification"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Run sample bid fixture
  const handleSelectSampleBid = async (sample: SampleBidMetadata) => {
    setIsLoading(true);
    setError(null);
    setActivePresetId(null);
    setActiveBidderName(sample.bidder_name);
    setActiveTenderRef(sample.tender_ref);
    setActiveTenderTitle("Enterprise Infrastructure Tender Evaluation");
    setActiveSubmissionDate(new Date().toISOString().split("T")[0]);

    try {
      const result = await verifySampleBid(sample.sample_id);
      setVerificationResult(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to evaluate sample bid document"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Manual direct credentials submit
  const handleManualSubmit = async (request: CompositeVerificationRequest) => {
    setIsLoading(true);
    setError(null);
    setManualModalOpen(false);

    const bidder = request.bid_metadata?.expected_bidder_name || "Direct Submission";
    const tender = request.bid_metadata?.tender_ref_number || "GEM/2026/B/MANUAL";
    setActiveBidderName(bidder);
    setActiveTenderRef(tender);
    setActiveTenderTitle("Statutory Verification Evaluation");
    setActiveSubmissionDate(new Date().toISOString().split("T")[0]);

    try {
      const result = await verifyCompliance(request);
      setVerificationResult(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to execute verification request"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Callback from NewReviewWizard
  const handleReviewCreatedFromWizard = (
    result: CompositeVerificationResponse,
    meta: { bidderName: string; tenderRefNumber: string; tenderTitle?: string }
  ) => {
    setVerificationResult(result);
    setActiveBidderName(meta.bidderName);
    setActiveTenderRef(meta.tenderRefNumber);
    setActiveTenderTitle(meta.tenderTitle || "Public Procurement Tender Evaluation");
    setActiveSubmissionDate(new Date().toISOString().split("T")[0]);
    setError(null);
  };

  // Clear / Reset review
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

  const openStatutoryDrawer = (tab: "gstin" | "pan" | "udyam" | "oem") => {
    setStatutoryDrawerTab(tab);
    setStatutoryDrawerOpen(true);
  };

  const openEvidenceDrawer = (evidence: EvidenceItem) => {
    setActiveEvidence(evidence);
    setEvidenceDrawerOpen(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: verificationResult ? "1.5rem" : "0" }}>
      {/* Top Action Bar (Visible when a review is active) */}
      {verificationResult && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.75rem 1.25rem",
            background: "var(--bg-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span className="ent-badge ent-badge-blue">
              <ShieldCheck size={13} /> Active Case Review
            </span>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {activeBidderName}
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>·</span>
            <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              {activeTenderRef}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              className="ent-btn ent-btn-primary ent-btn-sm"
              onClick={() => setNewReviewWizardOpen(true)}
            >
              <Plus size={13} />
              <span>+ New Review</span>
            </button>

            <button
              type="button"
              className="ent-btn ent-btn-secondary ent-btn-sm"
              onClick={handleClearReview}
            >
              <RotateCcw size={13} />
              <span>Reset Review</span>
            </button>
          </div>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "var(--status-critical-surface)",
            border: "1px solid var(--status-critical-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--status-critical-text)",
            fontSize: "0.86rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <AlertCircle size={16} />
          <span>
            <strong>Evaluation Advisory: </strong> {error}
          </span>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div
          className="ent-card"
          style={{
            textAlign: "center",
            padding: "3.5rem 2rem",
          }}
        >
          <Loader2
            size={36}
            color="var(--brand-blue)"
            className="spin"
            style={{ margin: "0 auto 1.25rem auto" }}
          />
          <h4
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "0.35rem",
            }}
          >
            Evaluating Statutory Compliance & Document Consistency...
          </h4>
          <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", maxWidth: "560px", margin: "0 auto" }}>
            Verifying statutory identifiers, registration statuses, and cross-document validity against tender criteria.
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
          /* Institutional Government Portal Landing & Hero */
          <GovernmentPortalHero
            onStartNewReview={() => setNewReviewWizardOpen(true)}
            onOpenDemoModal={() => setDemoModalOpen(true)}
            onNavigateToTab={onNavigateToTab}
          />
        )
      )}

      {/* New Compliance Review Wizard */}
      <NewReviewWizard
        isOpen={newReviewWizardOpen}
        onClose={() => {
          setNewReviewWizardOpen(false);
          onClearTargetTender?.();
        }}
        initialTenderRef={initialTenderRef}
        initialTenderTitle={initialTenderTitle}
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
