"use client";

import React, { useState } from "react";
import AppNavbar, { NavTabType } from "@/components/AppNavbar";
import SystemDiagnosticsModal from "@/components/admin/SystemDiagnosticsModal";
import AuditHistoryWorkspace from "@/components/audit/AuditHistoryWorkspace";
import BidReviewWorkspace from "@/components/compliance/BidReviewWorkspace";
import EvaluationDemoModal from "@/components/compliance/EvaluationDemoModal";
import DocumentsWorkspace from "@/components/documents/DocumentsWorkspace";
import TendersWorkspace from "@/components/tenders/TendersWorkspace";
import {
  getCompliancePresets,
  getSampleBids,
  verifyCompliance,
  verifySampleBid,
} from "@/services/api";
import type {
  CompositeVerificationResponse,
  PresetComplianceScenario,
  SampleBidMetadata,
} from "@/services/types/compliance";

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTabType>("reviews");
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [diagnosticsModalOpen, setDiagnosticsModalOpen] = useState(false);
  const [presets, setPresets] = useState<PresetComplianceScenario[]>([]);
  const [sampleBids, setSampleBids] = useState<SampleBidMetadata[]>([]);
  const [targetTenderForReview, setTargetTenderForReview] = useState<{
    ref: string;
    title: string;
  } | null>(null);

  const [externalReview, setExternalReview] =
    useState<CompositeVerificationResponse | null>(null);
  const [externalBidder, setExternalBidder] = useState<string>("");
  const [externalTender, setExternalTender] = useState<string>("");
  const [loadingDemo, setLoadingDemo] = useState<boolean>(false);

  React.useEffect(() => {
    async function loadMeta() {
      try {
        const p = await getCompliancePresets();
        if (p) setPresets(p);
      } catch {}
      try {
        const s = await getSampleBids();
        if (s) setSampleBids(s);
      } catch {}
    }
    loadMeta();
  }, []);

  const handleStartReviewFromTender = (tenderRef: string, tenderTitle: string) => {
    setTargetTenderForReview({ ref: tenderRef, title: tenderTitle });
    setActiveTab("reviews");
  };

  const handleSelectPresetFromModal = async (preset: PresetComplianceScenario) => {
    setLoadingDemo(true);
    const bidder =
      preset.gstin_request?.expected_legal_name ||
      preset.pan_request?.expected_legal_name ||
      preset.udyam_request?.expected_enterprise_name ||
      preset.oem_request?.authorized_partner_name ||
      "Bidder Submission";
    const tender = preset.oem_request?.tender_ref_number || "GEM/2026/B/890123";

    try {
      const res = await verifyCompliance({
        explicit_gstin: preset.gstin_request || undefined,
        explicit_pan: preset.pan_request || undefined,
        explicit_udyam: preset.udyam_request || undefined,
        explicit_oem: preset.oem_request || undefined,
        bid_metadata: { tender_ref_number: tender, expected_bidder_name: bidder },
      });
      setExternalReview(res);
      setExternalBidder(bidder);
      setExternalTender(tender);
      setActiveTab("reviews");
      setDemoModalOpen(false);
    } catch {
      // Handled gracefully
    } finally {
      setLoadingDemo(false);
    }
  };

  const handleSelectSampleFromModal = async (sample: SampleBidMetadata) => {
    setLoadingDemo(true);
    try {
      const res = await verifySampleBid(sample.sample_id);
      setExternalReview(res);
      setExternalBidder(sample.bidder_name);
      setExternalTender(sample.tender_ref);
      setActiveTab("reviews");
      setDemoModalOpen(false);
    } catch {
      // Handled gracefully
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <main className="app-container">
      {/* Primary Application Header */}
      <AppNavbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenDemoModal={() => setDemoModalOpen(true)}
        onOpenDiagnosticsModal={() => setDiagnosticsModalOpen(true)}
      />

      {/* Main Tab 1: Reviews */}
      <section
        aria-label="Bid Compliance Review Workspace"
        style={{ display: activeTab === "reviews" ? "block" : "none" }}
      >
        <BidReviewWorkspace
          externalReview={externalReview}
          externalBidderName={externalBidder}
          externalTenderRef={externalTender}
          initialTenderRef={targetTenderForReview?.ref}
          initialTenderTitle={targetTenderForReview?.title}
        />
      </section>

      {/* Main Tab 2: Tenders */}
      <section
        aria-label="Tenders Catalog"
        style={{ display: activeTab === "tenders" ? "block" : "none" }}
      >
        <TendersWorkspace onStartReviewForTender={handleStartReviewFromTender} />
      </section>

      {/* Main Tab 3: Documents */}
      <section
        aria-label="Documents Repository"
        style={{ display: activeTab === "documents" ? "block" : "none" }}
      >
        <DocumentsWorkspace />
      </section>

      {/* Main Tab 4: Audit History */}
      <section
        aria-label="Procurement Audit History"
        style={{ display: activeTab === "audit" ? "block" : "none" }}
      >
        <AuditHistoryWorkspace />
      </section>

      {/* Evaluation & Demo Scenarios Modal */}
      <EvaluationDemoModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        presets={presets}
        sampleBids={sampleBids}
        onSelectPreset={handleSelectPresetFromModal}
        onSelectSampleBid={handleSelectSampleFromModal}
        isLoading={loadingDemo}
      />

      {/* System Diagnostics Modal */}
      <SystemDiagnosticsModal
        isOpen={diagnosticsModalOpen}
        onClose={() => setDiagnosticsModalOpen(false)}
      />
    </main>
  );
}
