
# AI-Powered Integrated Bid Compliance Verification Platform for GeM Procurement

**Smart India Hackathon (SIH) 2026 — Problem Statement SIH26100**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_14.2-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![Python](https://img.shields.io/badge/Python-3.11_--_3.14-3776AB?logo=python&logoColor=white)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/Pytest-202_Passed-success?logo=pytest&logoColor=white)](backend/tests)
[![Status](https://img.shields.io/badge/Status-Internal_SIH_Prototype-informational.svg)](#-project-status--disclaimer)

---

## 📌 Executive Summary

Public procurement on the **Government e-Marketplace (GeM)** involves high-stakes evaluation of technical and financial bid submissions against statutory guidelines, eligibility criteria, and OEM authorizations. Manual verification by procurement committees is time-intensive, labor-heavy, and susceptible to compliance oversights such as invalid tax identifiers, identity mismatches across documents, and forged or expired manufacturer authorizations.

The **GeM Bid Compliance Verification Platform** is an enterprise-grade, automated decision-support system designed to streamline statutory evaluation. It extracts, cross-references, validates, scores, and audits bidder submissions in seconds while keeping the procurement officer in full control of the final evaluation.

---

## 🚀 Key Platform Capabilities

### 1. 📄 Hybrid Document Extraction & OCR Pipeline
- **Digital PDF Parsing**: Fast, deterministic text, metadata, and table extraction using PyMuPDF (`fitz`).
- **Scanned Document OCR Fallback**: Automatic optical character recognition via Tesseract OCR (`pytesseract`) with image pre-processing for scanned certificates and stamps.
- **Provenance Tracking**: Exact page numbers and matching text snippets preserved for transparent audit evidence.

### 2. 🏛️ Automated Statutory Identifier Validation
- **GSTIN Verification**:
  - Validates full 15-character statutory format and Indian State Code mapping (01–38).
  - Calculates and validates the official **GSTN Luhn Mod-36 Checksum algorithm**.
  - Checks active registration status, legal name, business type, and filing compliance against mock ground-truth registries.
- **Permanent Account Number (PAN) Verification**:
  - Validates 10-character alphanumeric structure.
  - Decodes 4th-character entity type (`C` = Company, `P` = Individual, `F` = Partnership Firm, `T` = Trust, `A` = AOP, `G` = Government).
  - Validates 5th-character surname/entity initial consistency.
- **MSME Udyam Registration Verification**:
  - Decodes state codes, enterprise type (`Micro`, `Small`, `Medium`), and major activity (`Manufacturing` vs. `Services`).
  - Automated Earnest Money Deposit (EMD) and tender fee exemption advisory engine.
- **OEM Manufacturer Authorization Form (MAF) Verification**:
  - Validates issuing OEM against authorized vendor rosters (HP, Dell, Cisco, Schneider Electric, etc.).
  - Verifies authorization date ranges, expiration status, and tender-specific authorization validity.

### 3. 🔗 Cross-Document Consistency Intelligence
Cross-references extracted entities across heterogeneous document pages:
- **Rule R01 (PAN-GST Linkage)**: Ensures the 10-character PAN matches positions 3–12 of the bidder's GSTIN.
- **Rule R02 (Entity Name Alignment)**: Measures fuzzy and token-based name consistency across GST certificates, PAN cards, and bid declaration forms.
- **Rule R03 (Jurisdiction Consistency)**: Ensures the registered state in the GSTIN aligns with the declared registered address.
- **Rule R04 (MSME Activity Match)**: Flags trading or service enterprises attempting to claim manufacturer-specific procurement exemptions.
- **Rule R05 (OEM MAF Expiration & Scope)**: Checks that the MAF covers the specific tender reference and closing date.
- **Rule R06 (Anti-Double-Counting Policy)**: Ensures single underlying compliance issues are not penalized multiple times across scoring dimensions.

### 4. 📊 Explainable Compliance Scoring Engine
- **Deterministic 100-Point Scoring Model**: Deducts points strictly based on rule severity (`CRITICAL`, `HIGH`, `MODERATE`, `LOW`).
- **Risk Categorization**:
  - 🟢 **Low Risk (85 – 100)**: Fully compliant; recommended for acceptance.
  - 🟡 **Moderate Risk (60 – 84)**: Minor discrepancies or optional documentation missing; review recommended.
  - 🔴 **High Risk (< 60 or Critical Failure)**: Disqualifying statutory failures, checksum errors, or identity mismatches.
- **Itemized Justifications**: Every deduction is accompanied by human-readable explanations and statutory citations.

### 5. 🛡️ Officer Decision Support & Immutable Audit Trail
- **Human-in-the-Loop Governance**: The AI system provides decision support, but the Evaluating Officer makes the final legally binding decision.
- **Supported Decision Actions**:
  - `ACCEPT_COMPLIANT` — Bid approved for technical evaluation.
  - `REJECT_NON_COMPLIANT` — Bid disqualified due to statutory non-compliance.
  - `REFER_CLARIFICATION` — Clarification sought from bidder with a defined deadline.
  - `OVERRIDE_FLAG` — Officer overrides a specific automated flag with mandatory written justification.
- **Permanent Procurement Audit Trail**: Every evaluation, timestamp, officer identifier, justification note, and final decision is recorded in the audit log.

---

## 🏛️ System Architecture

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │           Next.js 14 Web Application (Port 3000)      │
                                  │  - Two-Viewport Responsive Portal Landing               │
                                  │  - Bid Review Workspace & New Review Wizard            │
                                  │  - Tenders Catalog & Documents Repository              │
                                  │  - Audit History & System Diagnostics Modal            │
                                  └──────────────────────────┬─────────────────────────────┘
                                                             │ REST API / JSON
                                                             ▼
                                  ┌────────────────────────────────────────────────────────┐
                                  │             FastAPI Backend Server (Port 8000)         │
                                  │  - OpenAPI Documentation at /docs                      │
                                  │  - Versioned API Router (/api/v1)                      │
                                  └───────┬──────────────────┬──────────────────────┬──────┘
                                          │                  │                      │
                   ┌──────────────────────┴───────┐   ┌──────┴──────────────┐   ┌───┴──────────────────┐
                   │    Document & OCR Engine     │   │ Statutory Engines   │   │ Compliance Intel &   │
                   │ - PyMuPDF Text Extractor     │   │ - GSTIN Mod-36      │   │   Scoring Engine     │
                   │ - Tesseract OCR Fallback     │   │ - PAN Decoder       │   │ - Cross-Doc Rules    │
                   │ - Regex Entity Extractor     │   │ - Udyam MSME Rules  │   │ - 100-Pt Deductions  │
                   │ - Page Provenance Tracker    │   │ - OEM MAF Validator │   │ - Officer Audit Log  │
                   └──────────────────────────────┘   └─────────────────────┘   └──────────────────────┘
```

---

## 📁 Repository Directory Structure

```
Bid-Compliance-Verification-Platform/
├── backend/
│   ├── app/
│   │   ├── api/v1/                   # Versioned REST API endpoints
│   │   │   ├── endpoints/
│   │   │   │   ├── compliance.py     # Composite verification & evaluations
│   │   │   │   ├── documents.py      # PDF document processing & OCR
│   │   │   │   ├── gst.py            # Dedicated GSTIN validation endpoints
│   │   │   │   ├── health.py         # System health & OCR status
│   │   │   │   ├── oem.py            # OEM MAF verification endpoints
│   │   │   │   ├── pan.py            # PAN format & structure endpoints
│   │   │   │   ├── review.py         # Officer decision recording & audit
│   │   │   │   ├── scoring.py        # Scoring policy inspection
│   │   │   │   ├── statutory.py      # Combined statutory checks
│   │   │   │   └── udyam.py          # MSME Udyam verification endpoints
│   │   │   └── router.py             # Main v1 router assembly
│   │   ├── core/                     # Application configuration & settings
│   │   ├── db/                       # SQLAlchemy 2.0 async engine & session
│   │   ├── models/                   # Database ORM entity models
│   │   ├── schemas/                  # Pydantic request & response schemas
│   │   └── services/
│   │       ├── compliance/           # Statutory services, scoring, & rules
│   │       │   ├── gst/              # GST normalizer, validator, & service
│   │       │   ├── oem/              # OEM authorization service
│   │       │   ├── pan/              # PAN normalizer & validator
│   │       │   ├── udyam/            # Udyam classification service
│   │       │   ├── composite_service.py # End-to-end verification orchestration
│   │       │   ├── cross_consistency.py # Cross-document consistency engine
│   │       │   ├── extractor.py      # Document entity extraction
│   │       │   ├── luhn_mod36.py     # GSTN Luhn Mod-36 checksum
│   │       │   ├── mock_database.py  # Ground-truth statutory databases
│   │       │   ├── pan_decoder.py    # 4th-character PAN entity decoder
│   │       │   ├── presets.py        # Demo scenarios & test fixtures
│   │       │   ├── providers.py      # Statutory verification providers
│   │       │   ├── scoring_engine.py # 100-point compliance risk scoring
│   │       │   ├── state_codes.py    # Indian state code reference table
│   │       │   └── statutory_service.py # Statutory service orchestrator
│   │       └── documents/            # PDF and OCR parsing pipeline
│   │           ├── hybrid_processor.py # Digital + OCR hybrid pipeline
│   │           ├── ocr_processor.py    # Tesseract OCR processor
│   │           ├── pdf_processor.py    # PyMuPDF digital parser
│   │           └── service.py          # Document upload & parse manager
│   ├── sample_bids/                  # Real test PDF fixtures (8 scenarios)
│   ├── tests/                        # Comprehensive Pytest test suite (202 tests)
│   ├── main.py                       # FastAPI entry point with CORS
│   └── requirements.txt              # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css           # Institutional design system & responsive layout
│   │   │   ├── layout.tsx            # Root HTML metadata & font definitions
│   │   │   └── page.tsx              # Main portal application container
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   └── SystemDiagnosticsModal.tsx # System diagnostics & health modal
│   │   │   ├── audit/
│   │   │   │   └── AuditHistoryWorkspace.tsx  # Procurement audit trail viewer
│   │   │   ├── compliance/
│   │   │   │   ├── BidReviewWorkspace.tsx     # Central compliance review workspace
│   │   │   │   ├── BidSummaryHeader.tsx       # Bid summary header & score banner
│   │   │   │   ├── ComplianceChecksGrid.tsx   # Statutory checklist cards
│   │   │   │   ├── CrossEntityTable.tsx       # Cross-document consistency matrix
│   │   │   │   ├── EvaluationDemoModal.tsx    # Evaluation scenarios modal
│   │   │   │   ├── EvidenceViewerDrawer.tsx   # Page evidence inspection drawer
│   │   │   │   ├── GovernmentPortalHero.tsx   # Two-viewport desktop hero landing
│   │   │   │   ├── ManualVerificationModal.tsx# Custom identifier verification modal
│   │   │   │   ├── NewReviewWizard.tsx        # Bid submission upload & start wizard
│   │   │   │   ├── OfficerDecisionPanel.tsx   # Officer decision recording & sign-off
│   │   │   │   ├── ReviewFindingsSection.tsx  # Detailed rule findings & citations
│   │   │   │   ├── ScoreExplanationCard.tsx   # Mathematical score breakdown
│   │   │   │   ├── SourceEvidenceAudit.tsx    # Document evidence viewer
│   │   │   │   └── StatutoryDetailsDrawer.tsx # Deep-dive statutory registry drawer
│   │   │   ├── documents/
│   │   │   │   └── DocumentsWorkspace.tsx     # Documents & evidence repository
│   │   │   ├── tenders/
│   │   │   │   └── TendersWorkspace.tsx       # Tenders catalog & checklist
│   │   │   ├── AppNavbar.tsx                  # Full-width institutional header
│   │   │   └── ThemeToggle.tsx                # Light / Dark institutional theme toggle
│   │   └── services/
│   │       ├── types/
│   │       │   └── compliance.ts              # TypeScript domain types & interfaces
│   │       └── api.ts                         # Complete frontend API abstraction client
│   ├── public/
│   │   └── images/                            # Institutional hero assets
│   ├── package.json                           # Next.js frontend dependencies
│   └── tsconfig.json                          # TypeScript configuration
└── README.md
```

---

## 🧪 Built-in Evaluation & Demo Scenarios

The platform includes **8 pre-configured sample bid datasets** and simulation scenarios accessible directly from the UI:

| Scenario | Bidder Name | Scenario Description | Expected Score & Risk |
|---|---|---|---|
| **Scenario 1** | Nexus Enterprise Solutions Pvt Ltd | Clean digital PDF with valid GSTIN, matching PAN, active registration, and valid OEM MAF. | `100 / 100` · 🟢 Low Risk |
| **Scenario 2** | Bharat Infotech Solutions | Multi-page PDF with entities distributed across pages; valid Udyam micro-enterprise. | `100 / 100` · 🟢 Low Risk |
| **Scenario 3** | Garuda Cyber Systems Ltd | Malformed GSTIN with corrupted Luhn Mod-36 checksum character. | `65 / 100` · 🔴 High Risk |
| **Scenario 4** | TechCorp Solutions India | PAN mismatch (GSTIN contains PAN from a different corporate entity). | `60 / 100` · 🔴 High Risk |
| **Scenario 5** | Apex Digital Infrastructure | Valid GSTIN & PAN, but the OEM MAF has expired prior to the tender closing date. | `75 / 100` · 🟡 Moderate Risk |
| **Scenario 6** | Surya Tech Services | Sole proprietorship bid with missing optional OEM documentation. | `85 / 100` · 🟢 Low Risk |
| **Scenario 7** | Blank / Empty Submission | Empty PDF document to test graceful extraction error handling. | `0 / 100` · 🔴 High Risk |
| **Scenario 8** | Zenith Networking Labs | Scanned low-resolution PDF requiring automatic Tesseract OCR text extraction. | `100 / 100` · 🟢 Low Risk |

---

## ⚙️ Prerequisites

- **Node.js**: `v18.0.0` or higher (tested on `v20.x` and `v24.x`)
- **Python**: `3.11` to `3.14` (tested on `Python 3.14.2`)
- **npm**: `v9.0.0` or higher
- **Tesseract OCR** *(Optional, for scanned document OCR)*: Available via system PATH.

---

## 🚀 Quick Start Guide

### 1. Clone the Repository
```bash
git clone https://github.com/Shubham-M11/Bid-Compliance-Verification-Platform.git
cd Bid-Compliance-Verification-Platform
```

### 2. Backend Setup (FastAPI)

1. Open a terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

5. Start the FastAPI backend server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   - **API Base URL**: `http://localhost:8000`
   - **Interactive Swagger Docs**: `http://localhost:8000/docs`
   - **Alternative ReDoc**: `http://localhost:8000/redoc`
   - **Health Check**: `http://localhost:8000/api/health`

### 3. Frontend Setup (Next.js)

1. Open a second terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   - **Web Application URL**: `http://localhost:3000`

---

## 🧪 Running the Test Suite

The platform includes a comprehensive automated test suite covering unit, integration, and endpoint tests.

```bash
# From the backend/ directory with active .venv:
pytest -v
```

### Test Coverage Highlights (202 Tests):
- `test_task3d_integration.py` — End-to-end integration tests using real sample PDF fixtures.
- `test_scoring_slice.py` & `test_scoring_engine.py` — Score clamping, risk boundaries, deduction integrity, anti-double-counting.
- `test_gst_slice.py` & `test_pan_slice.py` — Luhn Mod-36 checksum algorithm, PAN entity decoding, state-code mappings.
- `test_udyam_slice.py` & `test_oem_slice.py` — MSME enterprise classification and OEM authorization timelines.
- `test_cross_consistency.py` — Multi-document consistency and identity cross-matching.
- `test_composite_endpoints.py` & `test_statutory_endpoints.py` — Full REST API contract verification.

---

## 🎨 UI & Design System

The frontend is built with a **Calm Institutional Design System** tailored for Indian government enterprise portals:
- **Two-Viewport Desktop Layout**: Clean first viewport featuring the hero carousel with bottom controls; natural scroll into Viewport 2 starting with Quick Access and the Compliance Review Process.
- **Institutional Color Palettes**:
  - **Light Theme**: Soft cool neutral background (`#EEF2F3`), crisp white card surfaces (`#FFFFFF`), deep navy-teal branding (`#1F4B5B`), restrained ochre accents (`#B8752C`), and crisp defined borders (`#C8D1D6`).
  - **Dark Theme**: Deep charcoal-slate background (`#111822`), muted slate surfaces (`#1F2B3A`), slate-teal accents (`#4A8C9E`), and crisp visible borders without glowing effects.
- **Accessibility**: Multi-level font sizing control (`A-`, `A`, `A+`), high contrast text ratios, and keyboard navigation.
- **Responsive Geometry**: Clean 4-column desktop layout, 2-column tablet layout (768px–1023px), and 1-column mobile layout (< 768px) with a collapsible navigation drawer.

---

## 🔒 Security & Privacy Architecture

- **Stateless Document Processing**: Uploaded bid documents and extracted text are processed in memory and never stored without authorization.
- **Zero Hallucination Guarantee**: All statutory validations rely on deterministic algorithmic rules and verified registry mock databases.
- **Audit Immutability**: Officer decisions, timestamps, and justifications cannot be silently modified or erased.
- **Role Isolation**: Decision override capabilities require explicit, documented statutory justification.

---

## 👥 Team & Contribution

Developed for the **Smart India Hackathon (SIH) 2026** under Problem Statement **SIH26100**.

- **Repository**: [https://github.com/Shubham-M11/Bid-Compliance-Verification-Platform](https://github.com/Shubham-M11/Bid-Compliance-Verification-Platform)

---

## 📄 Project Status & Disclaimer

**Internal SIH Round — Proof-of-Concept Prototype**

This project is developed as a working **Proof-of-Concept (POC) prototype** for the internal institutional evaluation round of the **Smart India Hackathon (SIH) 2026** under Problem Statement **SIH26100** (*AI-Powered Integrated Bid Compliance Verification Platform for GeM Procurement*).

- **Demonstration Scope**: Built for technical demonstration, decision-support workflow evaluation, and internal jury review.
- **Prototype Notice**: This is an educational demonstration prototype utilizing mock statutory registries and sample test fixtures. It is not an officially deployed Government of India or GeM production service.
- **Team**: Developed by the project team for internal SIH round evaluation.
