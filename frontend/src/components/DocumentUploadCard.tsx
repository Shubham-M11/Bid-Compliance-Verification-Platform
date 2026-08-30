"use client";

import { useState, useRef } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  FileCheck,
  FileText,
  HelpCircle,
  Layers,
  RotateCcw,
  UploadCloud,
  FileUp,
} from "lucide-react";
import { uploadDocument, DocumentUploadResponse } from "@/services/api";

export default function DocumentUploadCard() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentUploadResponse | null>(null);
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.toLowerCase().endsWith(".pdf")) {
        setError("Only PDF files (.pdf) are currently supported.");
        setFile(null);
        return;
      }
      setFile(selected);
      setError(null);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (!selected.name.toLowerCase().endsWith(".pdf")) {
        setError("Only PDF files (.pdf) are currently supported.");
        setFile(null);
        return;
      }
      setFile(selected);
      setError(null);
      setResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const data = await uploadDocument(file);
      setResult(data);
      setSelectedPage(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process document";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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

  const currentPageEvidence = result?.pages.find((p) => p.page_number === selectedPage);

  return (
    <div className="card" style={{ marginTop: "2rem" }}>
      {/* Card Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <div className="section-title" style={{ marginBottom: "0.25rem" }}>
            <FileText size={20} color="var(--accent-blue)" />
            Document Intelligence & Text Extraction
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Upload GeM tender PDFs to extract traceable page-level evidence (PyMuPDF Engine)
          </p>
        </div>

        {result && (
          <span
            className={`badge ${
              result.status === "processed"
                ? "badge-success"
                : result.status === "ocr_processed"
                ? "badge-sih"
                : result.status === "no_text_detected"
                ? "badge-danger"
                : "badge-danger"
            }`}
          >
            <span
              className={`status-dot ${
                result.status === "processed"
                  ? "status-dot-green"
                  : result.status === "ocr_processed"
                  ? "status-dot-green"
                  : "status-dot-amber"
              }`}
            />
            {result.status === "processed"
              ? "Status: Processed (Digital)"
              : result.status === "ocr_processed"
              ? "Status: OCR Processed"
              : result.status === "no_text_detected"
              ? "No Text Detected"
              : "Status: Failed"}
          </span>
        )}
      </div>

      {/* Upload Dropzone (When not processed yet) */}
      {!result && (
        <div>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "2px dashed var(--border-color)",
              borderRadius: "var(--radius-md)",
              padding: "2.5rem 1.5rem",
              textAlign: "center",
              cursor: "pointer",
              background: file ? "rgba(59, 130, 246, 0.05)" : "rgba(0, 0, 0, 0.15)",
              borderColor: file ? "var(--accent-blue)" : "var(--border-color)",
              transition: "all 0.2s ease",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            <UploadCloud
              size={36}
              color={file ? "var(--accent-blue)" : "var(--text-muted)"}
              style={{ marginBottom: "0.75rem" }}
            />

            {file ? (
              <div>
                <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#ffffff" }}>
                  {file.name}
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                  {formatFileSize(file.size)} • Ready for extraction
                </p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "0.95rem", fontWeight: 500, color: "var(--text-primary)" }}>
                  Click to select or drag and drop a GeM PDF document
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                  Supported format: <strong>.PDF</strong> (Max 10 MB)
                </p>
              </div>
            )}
          </div>

          {/* Action Bar */}
          {file && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
                marginTop: "1rem",
              }}
            >
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="btn btn-outline"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={loading}
                className="btn btn-primary"
              >
                <FileUp size={16} />
                {loading ? "Extracting Pages..." : "Extract Text"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: "0.9rem 1.1rem",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "var(--radius-sm)",
            marginTop: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            color: "#f87171",
            fontSize: "0.85rem",
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Extracted Evidence Viewer */}
      {result && (
        <div>
          {/* Metadata Summary Banner */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.75rem",
              marginBottom: "1.25rem",
            }}
          >
            <div className="meta-item">
              <span className="meta-label">Document ID</span>
              <span className="meta-value">{result.document_id}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Filename</span>
              <span className="meta-value" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {result.filename}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Page Count</span>
              <span className="meta-value">{result.page_count} Pages</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">File Size</span>
              <span className="meta-value">{formatFileSize(result.file_size)}</span>
            </div>
          </div>

          {/* Status Message Info */}
          {result.message && (
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-sm)",
                background:
                  result.status === "no_text_detected"
                    ? "rgba(245, 158, 11, 0.1)"
                    : "rgba(59, 130, 246, 0.08)",
                border: `1px solid ${
                  result.status === "no_text_detected"
                    ? "rgba(245, 158, 11, 0.25)"
                    : "rgba(59, 130, 246, 0.2)"
                }`,
                color:
                  result.status === "no_text_detected" ? "#fcd34d" : "#93c5fd",
                fontSize: "0.825rem",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <HelpCircle size={16} />
              <span>{result.message}</span>
            </div>
          )}

          {/* Page Navigation Tabs */}
          {result.page_count > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.75rem",
                }}
              >
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  {result.pages.map((p) => (
                    <button
                      key={p.page_number}
                      onClick={() => setSelectedPage(p.page_number)}
                      className={`btn ${
                        selectedPage === p.page_number
                          ? "btn-primary"
                          : "btn-outline"
                      }`}
                      style={{
                        padding: "0.35rem 0.75rem",
                        fontSize: "0.78rem",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      Page {p.page_number}
                      {p.extraction_method === "ocr" && " (OCR)"}
                      {!p.has_text && " (Empty)"}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {currentPageEvidence?.extraction_method && (
                    <span
                      className={`badge ${
                        currentPageEvidence.extraction_method === "digital"
                          ? "badge-success"
                          : currentPageEvidence.extraction_method === "ocr"
                          ? "badge-sih"
                          : "badge-neutral"
                      }`}
                      style={{ fontSize: "0.72rem", padding: "0.25rem 0.55rem" }}
                    >
                      Method:{" "}
                      {currentPageEvidence.extraction_method === "digital"
                        ? "Digital Text"
                        : currentPageEvidence.extraction_method === "ocr"
                        ? "OCR Fallback"
                        : "OCR Unavailable"}
                    </span>
                  )}

                  {currentPageEvidence?.ocr_confidence !== null &&
                    currentPageEvidence?.ocr_confidence !== undefined && (
                      <span
                        className="badge badge-sih"
                        style={{ fontSize: "0.72rem", padding: "0.25rem 0.55rem" }}
                      >
                        Confidence: {currentPageEvidence.ocr_confidence}%
                      </span>
                    )}

                  {currentPageEvidence?.text && (
                    <button
                      onClick={() => copyPageText(currentPageEvidence.text)}
                      className="btn btn-outline"
                      style={{ padding: "0.35rem 0.65rem", fontSize: "0.78rem" }}
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 size={13} color="var(--accent-green)" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={13} /> Copy Page Text
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Page Content Display Box */}
              <div
                style={{
                  background: "rgba(0, 0, 0, 0.35)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.25rem",
                  minHeight: "200px",
                  maxHeight: "380px",
                  overflowY: "auto",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: "0.825rem",
                  lineHeight: "1.6",
                  color: "#cbd5e1",
                  whiteSpace: "pre-wrap",
                }}
              >
                {currentPageEvidence ? (
                  currentPageEvidence.has_text ? (
                    currentPageEvidence.text
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "3rem 1rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      <FileCheck size={28} style={{ marginBottom: "0.5rem", opacity: 0.5 }} />
                      <p>No extractable digital or OCR text found on Page {selectedPage}.</p>
                      <p style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                        (Page is either blank, non-text, or OCR binary is not configured.)
                      </p>
                    </div>
                  )
                ) : (
                  <p>Select a page to view extracted content.</p>
                )}
              </div>

              {/* Page metrics footer */}
              {currentPageEvidence && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginTop: "0.5rem",
                  }}
                >
                  <span>
                    Viewing Evidence: Page {selectedPage} of {result.page_count}
                    {currentPageEvidence.extraction_method && ` • ${currentPageEvidence.extraction_method.toUpperCase()}`}
                  </span>
                  <span>
                    {currentPageEvidence.character_count} Characters Extracted
                    {currentPageEvidence.ocr_confidence !== null &&
                      currentPageEvidence.ocr_confidence !== undefined &&
                      ` (Confidence: ${currentPageEvidence.ocr_confidence}%)`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Reset / Upload Another */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "1.25rem",
              paddingTop: "1rem",
              borderTop: "1px solid var(--border-color)",
            }}
          >
            <button
              onClick={handleReset}
              className="btn btn-outline"
              style={{ fontSize: "0.825rem" }}
            >
              <RotateCcw size={14} /> Upload Another Document
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
