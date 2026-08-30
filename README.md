# AI-Powered Integrated Bid Compliance Verification Platform for GeM Procurement

**Smart India Hackathon (SIH) 2026 — Problem Statement SIH26100**

---

## 📌 Project Overview

Public procurement on the Government e-Marketplace (GeM) requires rigorous verification of tender bids against complex eligibility criteria, statutory guidelines, financial parameters, and OEM authorizations. Manual verification is error-prone, time-consuming, and susceptible to compliance oversights.

This platform aims to provide an **AI-powered, automated bid compliance verification system** tailored for GeM procurement.

### Planned Modules & Roadmap:
1. **Task 1 — Foundation (Current Stage)**: Modular FastAPI backend, Next.js frontend, PostgreSQL/Supabase database layer, health checks, and foundational connectivity.
2. **Document Processing & OCR Engine**: Extraction from complex tender PDFs, scanned certificates, and financial tables.
3. **Statutory Verifications**: Automated verification against GST, PAN, Udyam, and OEM authorization sources.
4. **Tender Intelligence & Compliance Engine**: Cross-referencing bidder documents against tender-specific requirements.
5. **Risk Assessment & Scoring Engine**: Automated compliance scoring and anomaly detection.
6. **Audit Trail & Reporting**: Immutable verification logs and downloadable compliance summary reports.

---

## 🏗️ Architecture

```
Bid-Compilance-Verification-Platform/
├── backend/                  # Python FastAPI Backend
│   ├── app/
│   │   ├── api/v1/          # Versioned API routes & endpoints
│   │   ├── core/            # App configuration & settings (pydantic-settings)
│   │   ├── db/              # SQLAlchemy 2.0 async engine & session management
│   │   ├── models/          # Database models (DeclarativeBase)
│   │   ├── schemas/         # Pydantic data schemas
│   │   └── services/        # Business logic services (modular placeholders)
│   ├── tests/               # Pytest test suite
│   ├── main.py              # Application entry point with CORS
│   └── requirements.txt     # Python dependencies
├── frontend/                 # Next.js App Router + TypeScript Frontend
│   ├── src/
│   │   ├── app/             # Next.js App Router pages & layouts
│   │   ├── components/      # UI components (Health card, dashboards)
│   │   └── services/        # Frontend API client abstraction
│   └── package.json         # Node.js dependencies & scripts
└── README.md
```

---

## ⚙️ Prerequisites

- **Node.js**: `v18.0.0` or higher (tested with `v24.x`)
- **Python**: `3.11` to `3.14` (tested with `Python 3.14.2`)
- **npm**: `v9.0.0` or higher

---

## 🚀 Getting Started

### 1. Backend Setup (FastAPI)

1. Open a terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # Linux/macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   # Copy the template
   cp .env.example .env
   ```

   **Environment Variables (`backend/.env.example`):**
   | Variable | Description | Default |
   | :--- | :--- | :--- |
   | `PROJECT_NAME` | Name of the backend application | `GeM Bid Compliance Verification Platform` |
   | `API_V1_STR` | API v1 route prefix | `/api/v1` |
   | `BACKEND_CORS_ORIGINS` | Allowed frontend origins (JSON array) | `["http://localhost:3000"]` |
   | `DATABASE_URL` | PostgreSQL connection URL (asyncpg) | `postgresql+asyncpg://postgres:postgres@localhost:5432/gem_compliance_db` |

5. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   * The API will be accessible at: `http://localhost:8000`
   * Health Check: `http://localhost:8000/api/health`
   * Interactive OpenAPI Docs: `http://localhost:8000/docs`

6. Run backend tests:
   ```bash
   pytest
   ```

---

### 2. Frontend Setup (Next.js)

1. Open a new terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   # Copy the template
   cp .env.example .env.local
   ```

   **Environment Variables (`frontend/.env.example`):**
   | Variable | Description | Default |
   | :--- | :--- | :--- |
   | `NEXT_PUBLIC_API_URL` | FastAPI Backend base URL | `http://localhost:8000` |

4. Run the Next.js development server:
   ```bash
   npm run dev
   ```
   * The frontend application will be live at: `http://localhost:3000`

---

## 🗄️ Database Configuration

The backend is configured with **SQLAlchemy 2.0** and **asyncpg** for asynchronous database queries. It supports any standard PostgreSQL instance, including **Supabase PostgreSQL**.

To connect to Supabase or local PostgreSQL:
1. Provide the asynchronous connection string in `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql+asyncpg://<username>:<password>@<host>:<port>/<dbname>
   ```
2. Note: For Supabase connection strings, replace `postgresql://` with `postgresql+asyncpg://` to enable async driver support.
3. Database initialization is non-blocking during this foundation stage, allowing the backend to start and pass health checks even before a database instance is provisioned.

---

## ⚠️ Current Status: Task 1 (Foundation Stage)

> **Notice**: This repository is currently at **Task 1 — Foundation Stage**.
> The platform currently demonstrates system health, backend-to-frontend async connectivity, and modular directory scaffolding. Domain-specific verification logic (GST, PAN, Udyam, OEM verification, PDF document OCR, and compliance scoring) will be introduced in subsequent tasks.
