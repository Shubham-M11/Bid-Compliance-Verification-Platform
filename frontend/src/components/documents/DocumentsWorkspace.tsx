"use client";

import React, { useRef, useState } from "react";
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Copy,
  CreditCard,
  Factory,
  FileCheck2,
  FileSearch,
  FileText,
  FileUp,
  Filter,
  Layers,
  RotateCcw,
  Search,
  UploadCloud,
} from "lucide-react";
import {
  DocumentProcessingStatus,
  DocumentUploadResponse,
  uploadDocument,
} from "@/services/api";

type DocumentCategory = "all" | "bid_submissions" | "statutory" | "oem" | "tenders";

interface PreloadedDocItem {
  id: string;
  name: string;
  filename: string;
  category: "bid_submissions" | "statutory" | "oem" | "tenders";
  pages: number;
  uploadedAt: string;
}

const PRELOADED_DOCUMENTS: PreloadedDocItem[] = [
  {
    id: "doc_1",
    name: "Corporate Bid Submission & Financial Bid",
    filename: "test_a_compliant_corporate.pdf",
    category: "bid_submissions",
    pages: 2,
    uploadedAt: "Today, 10:15 AM",
  },
  {
    id: "doc_2",
    name: "MSME Multi-Page Technical Bid Document",
    filename: "test_b_multipage_msme.pdf",
    category: "bid_submissions",
    pages: 4,
    uploadedAt: "Today, 11:30 AM",
  },
  {
    id: "doc_3",
    name: "Hewlett Packard Enterprise Platinum MAF Authorization",
    filename: "hpe_ind_maf_2026.pdf",
    category: "oem",
    pages: 1,
    uploadedAt: "Yesterday",
  },
  {
    id: "doc_4",
    name: "GST Registration Certificate (Form GST REG-06)",
    filename: "gst_reg_06_maharashtra.pdf",
    category: "statutory",
    pages: 1,
    uploadedAt: "Yesterday",
  },
];

export default function DocumentsWorkspace() {
  const [activeCategory, setActiveCategory] = useState<DocumentCategory>("all");
  const [selectedDoc, setSelectedDoc] = useState<PreloadedDocItem | null>(PRELOADED_DOCUMENTS[0]);
  const [uploadedResult, setUploadedResult] = useState<DocumentUploadResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [filterSearch, setFilterSearch] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF documents (.pdf) are supported.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await uploadDocument(file);
      setUploadedResult(data);
      setSelectedPage(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to process document");
    } finally {
      setLoading(false);
    }
  };

  const copyPageText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const currentPageEvidence = uploadedResult?.pages.find((p) => p.page_number === selectedPage);

  return (
    <div>
      {/* Workspace Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            Documents & Page Evidence Repository
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Inspect tender documents, bid submissions, statutory certificates, and extracted page-level evidence.
          </p>
        </div>

        <div>
          <label className="ent-btn ent-btn-primary" style={{ cursor: "pointer" }}>
            <FileUp size={14} />
            <span>Upload Document</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
          </label>
        </div>
      </div>

      {/* Main Grid: Document List + Inspector */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          gap: "1.5rem",
        }}
      >
        {/* Left Column: Category Filters & Document List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {/* Category Tabs */}
          <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`ent-btn ${activeCategory === "all" ? "ent-btn-primary" : "ent-btn-secondary"} ent-btn-sm`}
              onClick={() => setActiveCategory("all")}
            >
              All
            </button>
            <button
              type="button"
              className={`ent-btn ${activeCategory === "bid_submissions" ? "ent-btn-primary" : "ent-btn-secondary"} ent-btn-sm`}
              onClick={() => setActiveCategory("bid_submissions")}
            >
              Bids
            </button>
            <button
              type="button"
              className={`ent-btn ${activeCategory === "statutory" ? "ent-btn-primary" : "ent-btn-secondary"} ent-btn-sm`}
              onClick={() => setActiveCategory("statutory")}
            >
              Statutory
            </button>
            <button
              type="button"
              className={`ent-btn ${activeCategory === "oem" ? "ent-btn-primary" : "ent-btn-secondary"} ent-btn-sm`}
              onClick={() => setActiveCategory("oem")}
            >
              OEM
            </button>
          </div>

          {/* Document Items List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {PRELOADED_DOCUMENTS.map((doc) => {
              const isSelected = selectedDoc?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    setSelectedDoc(doc);
                    setUploadedResult(null);
                  }}
                  style={{
                    padding: "0.85rem 1rem",
                    background: isSelected ? "var(--bg-surface)" : "var(--bg-primary)",
                    border: isSelected ? "1px solid var(--brand-blue)" : "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  className="ent-card-hover"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <FileText size={14} color="var(--brand-blue)" />
                    <span style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--text-primary)" }}>
                      {doc.name}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                    <span>{doc.filename}</span>
                    <span>{doc.pages} {doc.pages === 1 ? "page" : "pages"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Document Details & Text Evidence Inspector */}
        <div>
          {error && (
            <div
              style={{
                padding: "0.75rem 1rem",
                background: "var(--status-critical-surface)",
                border: "1px solid var(--status-critical-border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--status-critical-text)",
                fontSize: "0.82rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {uploadedResult ? (
            /* Uploaded Document Inspector */
            <div className="ent-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid var(--border-subtle)",
                  marginBottom: "1.25rem",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {uploadedResult.filename}
                  </h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {formatFileSize(uploadedResult.file_size)} · {uploadedResult.page_count} Total Pages
                  </p>
                </div>

                <span className="ent-badge ent-badge-success">
                  <CheckCircle2 size={12} /> Processed
                </span>
              </div>

              {/* Page Navigator */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "1rem" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginRight: "0.3rem" }}>
                  Pages:
                </span>
                {uploadedResult.pages.map((p) => (
                  <button
                    key={p.page_number}
                    type="button"
                    className={`ent-btn ${selectedPage === p.page_number ? "ent-btn-primary" : "ent-btn-secondary"} ent-btn-sm`}
                    onClick={() => setSelectedPage(p.page_number)}
                    style={{ minWidth: "32px", padding: "0.25rem 0.5rem" }}
                  >
                    {p.page_number}
                  </button>
                ))}
              </div>

              {/* Page Text Preview */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                    Page {selectedPage} Text Content ({currentPageEvidence?.character_count || 0} chars)
                  </span>
                  <button
                    type="button"
                    className="ent-btn ent-btn-ghost ent-btn-sm"
                    onClick={() => currentPageEvidence && copyPageText(currentPageEvidence.text)}
                  >
                    <Copy size={12} /> {copied ? "Copied" : "Copy Page Text"}
                  </button>
                </div>

                <div className="evidence-highlight-box" style={{ maxHeight: "360px", overflowY: "auto" }}>
                  {currentPageEvidence?.text || "No text detected on this page."}
                </div>
              </div>
            </div>
          ) : selectedDoc ? (
            /* Selected Document Preview Card */
            <div className="ent-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid var(--border-subtle)",
                  marginBottom: "1.25rem",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {selectedDoc.name}
                  </h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                    Filename: <strong>{selectedDoc.filename}</strong> · {selectedDoc.pages} Pages · Uploaded {selectedDoc.uploadedAt}
                  </p>
                </div>

                <span className="ent-badge ent-badge-neutral">
                  {selectedDoc.category.toUpperCase()}
                </span>
              </div>

              <div
                style={{
                  padding: "2rem",
                  background: "var(--bg-surface)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  textAlign: "center",
                }}
              >
                <FileSearch size={36} color="var(--brand-blue)" style={{ margin: "0 auto 0.75rem auto" }} />
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                  Document Stored & Indexed
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", maxWidth: "460px", margin: "0 auto 1.25rem auto" }}>
                  This document is attached to the procurement evaluation context. You can re-parse it for page-by-page text inspection or evaluate it in the Reviews tab.
                </p>
                <button
                  type="button"
                  className="ent-btn ent-btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp size={13} /> Upload New Version
                </button>
              </div>
            </div>
          ) : (
            <div
              className="ent-card"
              style={{
                textAlign: "center",
                padding: "3rem",
                color: "var(--text-muted)",
              }}
            >
              Select a document to inspect its contents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
