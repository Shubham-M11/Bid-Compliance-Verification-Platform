"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building,
  Calendar,
  Check,
  CheckCircle2,
  CreditCard,
  Edit2,
  Factory,
  FileCheck2,
  FileText,
  FileUp,
  HelpCircle,
  Info,
  Layers,
  Loader2,
  Plus,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import {
  uploadDocument,
  verifyCompliance,
  verifyDocument,
} from "@/services/api";
import type {
  CompositeVerificationRequest,
  CompositeVerificationResponse,
} from "@/services/types/compliance";

interface NewReviewWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onReviewCreated: (
    result: CompositeVerificationResponse,
    meta: { bidderName: string; tenderRefNumber: string; tenderTitle?: string }
  ) => void;
}

export default function NewReviewWizard({
  isOpen,
  onClose,
  onReviewCreated,
}: NewReviewWizardProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Tender Details (clean initial state)
  const [tenderRef, setTenderRef] = useState("");
  const [tenderTitle, setTenderTitle] = useState("");
  const [tenderDeadline, setTenderDeadline] = useState("");
  const [tenderFile, setTenderFile] = useState<File | null>(null);

  // Step 2: Bidder Details
  const [bidderName, setBidderName] = useState("");
  const [bidSubmissionDate, setBidSubmissionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [bidFile, setBidFile] = useState<File | null>(null);
  const [detectedBidder, setDetectedBidder] = useState<string | null>(null);
  const [isEditingDetectedBidder, setIsEditingDetectedBidder] = useState(false);

  // Step 3: Supporting Documents & Manual Credentials
  const [gstinInput, setGstinInput] = useState("");
  const [panInput, setPanInput] = useState("");
  const [udyamInput, setUdyamInput] = useState("");
  const [oemInput, setOemInput] = useState("");
  const [mafNumberInput, setMafNumberInput] = useState("");
  const [showAddCustomDoc, setShowAddCustomDoc] = useState(false);

  if (!isOpen) return null;

  const handleFillExampleValues = () => {
    setTenderRef("GEM/2026/B/890123");
    setTenderTitle("Procurement of Enterprise Cloud Infrastructure");
    setTenderDeadline("2026-04-30");
    setBidderName("Tech Mahindra Limited");
    setGstinInput("27AAACT2727Q1ZW");
    setPanInput("AAACT2727Q");
    setOemInput("Hewlett Packard Enterprise India Private Limited");
    setMafNumberInput("HPE-IND-MAF-2026-0045");
    setErrorMessage(null);
  };

  const handleTenderFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setErrorMessage("Only PDF documents are supported for tender files.");
        return;
      }
      setTenderFile(file);
      setErrorMessage(null);
    }
  };

  const handleBidFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setErrorMessage("Only PDF documents are supported for bid submissions.");
        return;
      }
      setBidFile(file);
      setErrorMessage(null);

      // Attempt candidate detection
      try {
        setIsLoading(true);
        const uploadRes = await uploadDocument(file);
        if (uploadRes.pages.length > 0) {
          const fullText = uploadRes.pages.map((p) => p.text).join(" ");
          if (fullText.includes("Tech Mahindra")) {
            setDetectedBidder("Tech Mahindra Limited");
          } else if (fullText.includes("NexaTech")) {
            setDetectedBidder("NexaTech Innovations LLP");
          } else if (fullText.includes("Infosys")) {
            setDetectedBidder("Infosys Limited");
          } else if (fullText.includes("Apex Infotech")) {
            setDetectedBidder("Apex Infotech Private Limited");
          } else if (fullText.includes("Tata Consultancy")) {
            setDetectedBidder("Tata Consultancy Services Limited");
          } else if (fullText.includes("Ashok Leyland")) {
            setDetectedBidder("Ashok Leyland Limited");
          } else {
            setDetectedBidder(file.name.replace(".pdf", "").replace(/_/g, " "));
          }
        }
      } catch {
        // Fall back gracefully to manual input
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleConfirmDetectedBidder = () => {
    if (detectedBidder) {
      setBidderName(detectedBidder);
    }
    setIsEditingDetectedBidder(false);
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!tenderRef.trim()) {
        setErrorMessage("Please enter a Tender Reference Number before proceeding.");
        return;
      }
      setErrorMessage(null);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!bidderName.trim() && !bidFile) {
        setErrorMessage("Please enter the Bidder Legal Name or upload a Bid submission PDF.");
        return;
      }
      setErrorMessage(null);
      setCurrentStep(3);
    }
  };

  const handleExecuteVerification = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      let result: CompositeVerificationResponse;

      if (bidFile) {
        result = await verifyDocument(
          bidFile,
          bidderName.trim() || undefined,
          tenderRef.trim() || undefined
        );
      } else {
        const payload: CompositeVerificationRequest = {
          explicit_gstin: gstinInput.trim()
            ? {
                gstin: gstinInput.trim(),
                expected_legal_name: bidderName.trim() || undefined,
                expected_state_code: gstinInput.trim().slice(0, 2) || undefined,
              }
            : undefined,
          explicit_pan: panInput.trim()
            ? {
                pan: panInput.trim(),
                expected_legal_name: bidderName.trim() || undefined,
              }
            : undefined,
          explicit_udyam: udyamInput.trim()
            ? {
                udyam_registration_number: udyamInput.trim(),
                expected_enterprise_name: bidderName.trim() || undefined,
              }
            : undefined,
          explicit_oem: oemInput.trim()
            ? {
                oem_name: oemInput.trim(),
                authorized_partner_name: bidderName.trim() || "Bidder Submission",
                maf_number: mafNumberInput.trim() || undefined,
                tender_ref_number: tenderRef.trim() || undefined,
              }
            : undefined,
          bid_metadata: {
            tender_ref_number: tenderRef.trim() || "GEM/2026/B/890123",
            expected_bidder_name: bidderName.trim() || "Bidder Submission",
            bid_submission_date: bidSubmissionDate,
          },
        };
        result = await verifyCompliance(payload);
      }

      onReviewCreated(result, {
        bidderName: bidderName.trim() || "Bidder Submission",
        tenderRefNumber: tenderRef.trim() || "GEM/2026/B/890123",
        tenderTitle: tenderTitle.trim() || "Procurement Evaluation Context",
      });
      onClose();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to execute compliance verification"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ent-modal-overlay" onClick={onClose}>
      <div
        className="ent-modal-content"
        style={{ maxWidth: "680px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: "0.85rem",
            borderBottom: "1px solid var(--border-subtle)",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldCheck size={18} color="var(--brand-blue)" />
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
                New Compliance Review
              </h3>
            </div>
            <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Set up tender context, bidder identity, and supporting statutory credentials
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              className="ent-btn ent-btn-ghost ent-btn-sm"
              onClick={handleFillExampleValues}
              title="Pre-fill standard demo values for quick testing"
              style={{ fontSize: "0.72rem" }}
            >
              <Layers size={12} color="var(--brand-blue)" />
              <span>Fill Demo Values</span>
            </button>
            <button
              type="button"
              className="ent-btn ent-btn-secondary ent-btn-sm"
              onClick={onClose}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Stepper Wizard Progress */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem" }}>
          <div
            className={`wizard-step ${
              currentStep === 1
                ? "wizard-step-active"
                : currentStep > 1
                ? "wizard-step-completed"
                : ""
            }`}
          >
            <div className="wizard-step-num">{currentStep > 1 ? <Check size={12} /> : "1"}</div>
            <span>01 Tender</span>
          </div>
          <div className="wizard-step-line" />

          <div
            className={`wizard-step ${
              currentStep === 2
                ? "wizard-step-active"
                : currentStep > 2
                ? "wizard-step-completed"
                : ""
            }`}
          >
            <div className="wizard-step-num">{currentStep > 2 ? <Check size={12} /> : "2"}</div>
            <span>02 Bidder</span>
          </div>
          <div className="wizard-step-line" />

          <div
            className={`wizard-step ${
              currentStep === 3
                ? "wizard-step-active"
                : ""
            }`}
          >
            <div className="wizard-step-num">3</div>
            <span>03 Documents</span>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div
            style={{
              padding: "0.65rem 0.85rem",
              background: "var(--status-critical-surface)",
              border: "1px solid var(--status-critical-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--status-critical-text)",
              fontSize: "0.8rem",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <AlertCircle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: TENDER SETUP */}
        {currentStep === 1 && (
          <div>
            <div
              style={{
                padding: "0.75rem 1rem",
                background: "var(--bg-app)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
                lineHeight: 1.45,
              }}
            >
              <strong style={{ color: "var(--text-primary)" }}>Evaluation Context: </strong>
              This tender defines the procurement context against which the bidder submission will be reviewed.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="ent-label">
                  Tender Reference <span style={{ color: "var(--status-critical-text)" }}>*</span>
                </label>
                <input
                  type="text"
                  className="ent-input"
                  placeholder="e.g. GEM/2026/B/890123"
                  value={tenderRef}
                  onChange={(e) => setTenderRef(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="ent-label">Tender Title</label>
                <input
                  type="text"
                  className="ent-input"
                  placeholder="e.g. Supply and Maintenance of Enterprise IT Infrastructure"
                  value={tenderTitle}
                  onChange={(e) => setTenderTitle(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label className="ent-label">Submission Deadline</label>
                  <input
                    type="date"
                    className="ent-input"
                    value={tenderDeadline}
                    onChange={(e) => setTenderDeadline(e.target.value)}
                  />
                </div>

                <div>
                  <label className="ent-label">Tender PDF Document (Optional)</label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 0.75rem",
                      background: "var(--bg-app)",
                      border: "1px dashed var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      color: tenderFile ? "var(--brand-blue)" : "var(--text-muted)",
                      marginTop: "4px",
                    }}
                  >
                    <FileUp size={15} color="var(--brand-blue)" />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tenderFile ? tenderFile.name : "Upload RFP / Tender PDF"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleTenderFileChange}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: BIDDER DETAILS */}
        {currentStep === 2 && (
          <div>
            <div
              style={{
                padding: "0.75rem 1rem",
                background: "var(--bg-app)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
                lineHeight: 1.45,
              }}
            >
              <strong style={{ color: "var(--text-primary)" }}>Bidder Entity: </strong>
              Enter the primary bidder legal entity name or upload the compiled bid submission package.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="ent-label">
                  Bidder Legal Name <span style={{ color: "var(--status-critical-text)" }}>*</span>
                </label>
                <input
                  type="text"
                  className="ent-input"
                  placeholder="e.g. Tech Mahindra Limited"
                  value={bidderName}
                  onChange={(e) => setBidderName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label className="ent-label">Bid Submission Date</label>
                  <input
                    type="date"
                    className="ent-input"
                    value={bidSubmissionDate}
                    onChange={(e) => setBidSubmissionDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="ent-label">Bid Submission Document (PDF)</label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 0.75rem",
                      background: "var(--bg-app)",
                      border: "1px dashed var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      color: bidFile ? "var(--brand-blue)" : "var(--text-muted)",
                      marginTop: "4px",
                    }}
                  >
                    <UploadCloud size={15} color="var(--brand-blue)" />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {bidFile ? bidFile.name : "Upload Bid PDF"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleBidFileChange}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>

              {/* Detected Candidate Card */}
              {detectedBidder && (
                <div
                  style={{
                    background: "var(--bg-app)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0.75rem 1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                      Detected Candidate Entity from Document:
                    </div>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.85rem" }}>
                      {detectedBidder}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      type="button"
                      className="ent-btn ent-btn-primary ent-btn-sm"
                      onClick={handleConfirmDetectedBidder}
                    >
                      <Check size={12} /> Confirm
                    </button>
                    <button
                      type="button"
                      className="ent-btn ent-btn-secondary ent-btn-sm"
                      onClick={() => setIsEditingDetectedBidder(!isEditingDetectedBidder)}
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: SUPPORTING DOCUMENTS & CREDENTIALS */}
        {currentStep === 3 && (
          <div>
            <div
              style={{
                padding: "0.75rem 1rem",
                background: "var(--bg-app)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
                lineHeight: 1.45,
              }}
            >
              <strong style={{ color: "var(--text-primary)" }}>Credentials & Neutrality Policy: </strong>
              Provide statutory credentials for automated deterministic verification. Missing optional certificates (such as Udyam MSME or OEM MAF) receive neutral, non-penalizing evaluations.
            </div>

            {/* Checklist */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
                marginBottom: "1.25rem",
              }}
            >
              <div
                style={{
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.6rem 0.75rem",
                  fontSize: "0.78rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  <Building size={14} color="var(--brand-blue)" />
                  <span>GSTIN Identifier</span>
                </div>
                <input
                  type="text"
                  className="ent-input"
                  placeholder="e.g. 27AAACT2727Q1ZW"
                  value={gstinInput}
                  onChange={(e) => setGstinInput(e.target.value)}
                  style={{ marginTop: "4px", fontSize: "0.76rem" }}
                />
              </div>

              <div
                style={{
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.6rem 0.75rem",
                  fontSize: "0.78rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  <CreditCard size={14} color="var(--brand-blue)" />
                  <span>PAN Number</span>
                </div>
                <input
                  type="text"
                  className="ent-input"
                  placeholder="e.g. AAACT2727Q"
                  value={panInput}
                  onChange={(e) => setPanInput(e.target.value)}
                  style={{ marginTop: "4px", fontSize: "0.76rem" }}
                />
              </div>

              <div
                style={{
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.6rem 0.75rem",
                  fontSize: "0.78rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  <Factory size={14} color="var(--brand-blue)" />
                  <span>Udyam Registration (Optional)</span>
                </div>
                <input
                  type="text"
                  className="ent-input"
                  placeholder="e.g. UDYAM-DL-01-0012345"
                  value={udyamInput}
                  onChange={(e) => setUdyamInput(e.target.value)}
                  style={{ marginTop: "4px", fontSize: "0.76rem" }}
                />
              </div>

              <div
                style={{
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.6rem 0.75rem",
                  fontSize: "0.78rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  <FileCheck2 size={14} color="var(--brand-blue)" />
                  <span>OEM Manufacturer Name (Optional)</span>
                </div>
                <input
                  type="text"
                  className="ent-input"
                  placeholder="e.g. Hewlett Packard Enterprise"
                  value={oemInput}
                  onChange={(e) => setOemInput(e.target.value)}
                  style={{ marginTop: "4px", fontSize: "0.76rem" }}
                />
              </div>
            </div>

            {oemInput.trim() && (
              <div style={{ marginBottom: "1rem" }}>
                <label className="ent-label">OEM MAF Authorization Code / Reference</label>
                <input
                  type="text"
                  className="ent-input"
                  placeholder="e.g. HPE-IND-MAF-2026-0045"
                  value={mafNumberInput}
                  onChange={(e) => setMafNumberInput(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {/* Wizard Footer Navigation */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "1rem",
            borderTop: "1px solid var(--border-subtle)",
            marginTop: "1.25rem",
          }}
        >
          {currentStep > 1 ? (
            <button
              type="button"
              className="ent-btn ent-btn-secondary"
              onClick={() => setCurrentStep((currentStep - 1) as 1 | 2)}
              disabled={isLoading}
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              className="ent-btn ent-btn-primary"
              onClick={handleNextStep}
            >
              <span>Next</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              className="ent-btn ent-btn-primary"
              onClick={handleExecuteVerification}
              disabled={isLoading}
              style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="spin" />
                  <span>Evaluating Statutory Compliance...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  <span>Start Compliance Review</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
