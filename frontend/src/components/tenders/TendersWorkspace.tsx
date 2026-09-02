"use client";

import React, { useState } from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  FileCheck2,
  FileText,
  Filter,
  Layers,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";

export interface TenderContextItem {
  id: string;
  reference: string;
  title: string;
  department: string;
  closingDate: string;
  category: string;
  estimatedValue: string;
  bidsSubmitted: number;
  status: "OPEN_FOR_EVALUATION" | "TECHNICAL_EVALUATION" | "COMPLETED";
}

const DEFAULT_TENDERS: TenderContextItem[] = [
  {
    id: "tnd_1",
    reference: "GEM/2026/B/890123",
    title: "Supply, Installation & Maintenance of Enterprise Cloud Infrastructure & Servers",
    department: "Ministry of Electronics & Information Technology (MeitY)",
    closingDate: "2026-04-30",
    category: "IT Hardware & Cloud Systems",
    estimatedValue: "₹ 4,85,00,000",
    bidsSubmitted: 4,
    status: "OPEN_FOR_EVALUATION",
  },
  {
    id: "tnd_2",
    reference: "GEM/2026/B/778899",
    title: "Procurement of Secured Enterprise Core Routing & Switching Network Appliances",
    department: "Department of Telecommunications (DoT)",
    closingDate: "2026-05-15",
    category: "Network Infrastructure",
    estimatedValue: "₹ 2,40,00,000",
    bidsSubmitted: 3,
    status: "TECHNICAL_EVALUATION",
  },
  {
    id: "tnd_3",
    reference: "GEM/2026/B/445566",
    title: "Annual Maintenance Contract for Data Center UPS and Power Distribution Units",
    department: "National Informatics Centre (NIC)",
    closingDate: "2026-06-01",
    category: "Electrical & Facilities",
    estimatedValue: "₹ 85,00,000",
    bidsSubmitted: 5,
    status: "OPEN_FOR_EVALUATION",
  },
  {
    id: "tnd_4",
    reference: "GEM/2026/B/112233",
    title: "Supply of High-Performance Laptops and Workstations for Research Labs",
    department: "Council of Scientific & Industrial Research (CSIR)",
    closingDate: "2026-05-20",
    category: "End-User Compute",
    estimatedValue: "₹ 1,75,00,000",
    bidsSubmitted: 6,
    status: "OPEN_FOR_EVALUATION",
  },
];

interface TendersWorkspaceProps {
  onStartReviewForTender: (tenderRef: string, tenderTitle: string) => void;
}

export default function TendersWorkspace({
  onStartReviewForTender,
}: TendersWorkspaceProps) {
  const [tenders, setTenders] = useState<TenderContextItem[]>(DEFAULT_TENDERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTender, setSelectedTender] = useState<TenderContextItem | null>(
    DEFAULT_TENDERS[0]
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRef, setNewRef] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDept, setNewDept] = useState("");

  const filteredTenders = tenders.filter(
    (t) =>
      t.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateTender = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRef.trim() || !newTitle.trim()) return;

    const newItem: TenderContextItem = {
      id: `tnd_${Date.now()}`,
      reference: newRef.trim().toUpperCase(),
      title: newTitle.trim(),
      department: newDept.trim() || "Public Procurement Committee",
      closingDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      category: "General Procurement",
      estimatedValue: "₹ Under Evaluation",
      bidsSubmitted: 0,
      status: "OPEN_FOR_EVALUATION",
    };

    setTenders([newItem, ...tenders]);
    setSelectedTender(newItem);
    setNewRef("");
    setNewTitle("");
    setNewDept("");
    setShowCreateModal(false);
  };

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
            Tender Evaluation Catalog
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Active procurement tender contexts and statutory evaluation requirements.
          </p>
        </div>

        <button
          type="button"
          className="ent-btn ent-btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={14} />
          <span>New Tender Context</span>
        </button>
      </div>

      {/* Main Grid: List + Detail */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
        }}
      >
        {/* Left Column: Tenders List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {/* Search Bar */}
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search by tender reference, title, or department..."
              className="ent-input"
              style={{ paddingLeft: "2.2rem" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "10px",
                top: "55%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
          </div>

          {/* List Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {filteredTenders.map((tender) => {
              const isSelected = selectedTender?.id === tender.id;
              return (
                <div
                  key={tender.id}
                  onClick={() => setSelectedTender(tender)}
                  style={{
                    padding: "1.1rem",
                    background: isSelected ? "var(--bg-surface)" : "var(--bg-primary)",
                    border: isSelected ? "1px solid var(--brand-blue)" : "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  className="ent-card-hover"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.35rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--brand-blue)" }}>
                      {tender.reference}
                    </span>
                    <span className="ent-badge ent-badge-blue" style={{ fontSize: "0.68rem" }}>
                      {tender.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div style={{ fontWeight: 600, fontSize: "0.84rem", color: "var(--text-primary)", marginBottom: "0.35rem", lineHeight: 1.35 }}>
                    {tender.title}
                  </div>

                  <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
                    <span>{tender.department}</span>
                    <span>Closing: {tender.closingDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Tender Details */}
        <div>
          {selectedTender ? (
            <div className="ent-card" style={{ borderTop: "3px solid var(--brand-blue)", padding: "1.25rem 1.4rem" }}>
              <div style={{ paddingBottom: "1.1rem", borderBottom: "1px solid var(--border-subtle)", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem" }}>
                  <span className="ent-badge ent-badge-neutral">
                    {selectedTender.category}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Estimated Value: <strong style={{ color: "var(--text-primary)" }}>{selectedTender.estimatedValue}</strong>
                  </span>
                </div>

                <h3 style={{ fontSize: "1.08rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.45rem" }}>
                  {selectedTender.reference}
                </h3>
                <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {selectedTender.title}
                </p>
              </div>

              {/* Tender Statutory Evaluation Requirements */}
              <div style={{ marginBottom: "1.4rem" }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
                  Statutory Evaluation Checklist
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", fontSize: "0.84rem", color: "var(--text-secondary)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                    <CheckCircle2 size={15} color="var(--status-success-text)" style={{ flexShrink: 0 }} />
                    <span>Active GSTIN Registration (State Match &amp; Mod-36 Checksum)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                    <CheckCircle2 size={15} color="var(--status-success-text)" style={{ flexShrink: 0 }} />
                    <span>Matching PAN Entity Linkage (4th char format check)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                    <CheckCircle2 size={15} color="var(--status-success-text)" style={{ flexShrink: 0 }} />
                    <span>OEM Manufacturer Authorization Form (MAF) Validity Verification</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                    <CheckCircle2 size={15} color="var(--brand-blue)" style={{ flexShrink: 0 }} />
                    <span>MSME Udyam Advisory EMD Exemption Eligibility Check</span>
                  </div>
                </div>
              </div>

              {/* Action: Evaluate Bid */}
              <div
                style={{
                  paddingTop: "1.15rem",
                  borderTop: "1px solid var(--border-subtle)",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  className="ent-btn ent-btn-primary ent-btn-lg"
                  onClick={() =>
                    onStartReviewForTender(selectedTender.reference, selectedTender.title)
                  }
                >
                  <ShieldCheck size={16} />
                  <span>Start Bid Review for this Tender</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              className="ent-card"
              style={{
                textAlign: "center",
                padding: "3rem 1.5rem",
                color: "var(--text-muted)",
              }}
            >
              Select a tender from the list to view evaluation requirements.
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Tender Context */}
      {showCreateModal && (
        <div className="ent-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div
            className="ent-modal-content"
            style={{ maxWidth: "540px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Add New Tender Context
              </h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                Define a tender context for committee evaluation.
              </p>
            </div>

            <form onSubmit={handleCreateTender} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div>
                <label className="ent-label">Tender Reference *</label>
                <input
                  type="text"
                  className="ent-input"
                  placeholder="e.g. GEM/2026/B/990011"
                  value={newRef}
                  onChange={(e) => setNewRef(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="ent-label">Tender Title *</label>
                <input
                  type="text"
                  className="ent-input"
                  placeholder="e.g. Supply of Data Storage & Backup Appliance"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="ent-label">Department / Ministry</label>
                <input
                  type="text"
                  className="ent-input"
                  placeholder="e.g. Ministry of Railways"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  className="ent-btn ent-btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="ent-btn ent-btn-primary">
                  Save Tender
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
