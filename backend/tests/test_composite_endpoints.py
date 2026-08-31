from datetime import date, timedelta
from fastapi.testclient import TestClient
import pytest
from main import app

client = TestClient(app)


class TestCompositeVerificationEndpoints:
    """Test composite compliance verification REST endpoints."""

    def test_verify_composite_with_explicit_requests(self):
        payload = {
            "explicit_gstin": {
                "gstin": "27AAACT2727Q1ZW",
                "expected_legal_name": "Tech Mahindra Limited",
                "expected_state_code": "27",
            },
            "explicit_pan": {
                "pan": "AAACT2727Q",
                "expected_legal_name": "Tech Mahindra Limited",
            },
            "explicit_oem": {
                "oem_name": "Hewlett Packard Enterprise India Private Limited",
                "authorized_partner_name": "Tech Mahindra Limited",
                "maf_number": "HPE-IND-MAF-2026-0045",
                "tender_ref_number": "GEM/2026/B/890123",
                "valid_from": str(date.today() - timedelta(days=30)),
                "valid_until": str(date.today() + timedelta(days=180)),
            },
            "bid_metadata": {
                "tender_ref_number": "GEM/2026/B/890123",
                "expected_bidder_name": "Tech Mahindra Limited",
            },
        }

        response = client.post("/api/v1/compliance/verify", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert "ver_" in data["verification_id"]
        assert data["overall_score"] >= 85
        assert data["risk_level"] == "LOW_RISK"
        # Decision-support wording check
        assert "proceed to standard tender evaluation" in data["risk_level_guidance"].lower()
        assert data["is_live_government_source"] is False

        # Check statutory verifications bundle
        stat = data["statutory_verifications"]
        assert stat["gstin"] is not None
        assert stat["gstin"]["deterministic"]["is_checksum_valid"] is True
        assert stat["pan"] is not None
        assert stat["oem"] is not None

        # Check consistency checks list
        consistency = data["consistency_checks"]
        assert len(consistency) >= 5
        r01 = next(c for c in consistency if c["rule_id"] == "R-01")
        assert r01["status"] == "PASS"

    def test_verify_composite_with_document_evidence(self):
        payload = {
            "documents": [
                {
                    "document_id": "doc_test_999",
                    "filename": "bidder_tech_pack.pdf",
                    "content_type": "application/pdf",
                    "file_size": 102400,
                    "page_count": 1,
                    "status": "processed",
                    "pages": [
                        {
                            "page_number": 1,
                            "text": (
                                "BIDDER PARTICULARS:\n"
                                "Name of Bidder: NexaTech Innovations LLP\n"
                                "GSTIN: 07AABFN1234F1ZS\n"
                                "Permanent Account Number: AABFN1234F\n"
                                "Udyam Reg: UDYAM-DL-01-0012345\n"
                                "OEM Authorization Ref: MAF-CSCO-2026-8891\n"
                                "Manufacturer: Cisco Systems India Private Limited\n"
                                "Tender Ref: GEM/2026/B/445566\n"
                            ),
                            "character_count": 250,
                            "has_text": True,
                            "extraction_method": "digital",
                        }
                    ],
                }
            ],
            "bid_metadata": {
                "tender_ref_number": "GEM/2026/B/445566",
                "expected_bidder_name": "NexaTech Innovations LLP",
            },
        }

        response = client.post("/api/v1/compliance/verify", json=payload)
        assert response.status_code == 200
        data = response.json()

        # Verify document extraction successfully fed into composite engine
        ext = data["extracted_entities"]
        assert len(ext["gstin_candidates"]) == 1
        assert ext["gstin_candidates"][0]["value"] == "07AABFN1234F1ZS"
        assert ext["gstin_candidates"][0]["document_id"] == "doc_test_999"

        # Verify statutory verifications were auto-populated from extracted entities
        stat = data["statutory_verifications"]
        assert stat["gstin"]["gstin"] == "07AABFN1234F1ZS"
        assert stat["pan"]["pan"] == "AABFN1234F"
        assert stat["udyam"]["udyam_registration_number"] == "UDYAM-DL-01-0012345"

        # Verify score and risk level
        assert data["overall_score"] >= 85
        assert data["risk_level"] == "LOW_RISK"

        # Verify evidence audit trail contains document citations
        audit = data["evidence_audit_trail"]
        assert len(audit) >= 4
        assert any(e["document_id"] == "doc_test_999" for e in audit)

    def test_verify_composite_high_risk_defaulter_scenario(self):
        payload = {
            "explicit_gstin": {
                "gstin": "09AABCA5678A1ZT",  # Suspended in mock DB
                "expected_legal_name": "Apex Infotech Private Limited",
            },
            "explicit_pan": {
                "pan": "AABCA5678A",
            },
            "explicit_oem": {
                "oem_name": "Dell International Services",
                "authorized_partner_name": "Apex Infotech Private Limited",
                "maf_number": "DELL-MAF-2024-9102",  # Expired/revoked
                "valid_until": str(date.today() - timedelta(days=120)),
            },
        }

        response = client.post("/api/v1/compliance/verify", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["risk_level"] == "HIGH_RISK"
        assert "manual officer review required" in data["risk_level_guidance"].lower()
        assert len(data["findings"]) >= 2
        assert any(f["severity"] == "CRITICAL" for f in data["findings"])

    def test_extract_entities_from_text_endpoint(self):
        payload = {
            "text": "Vendor: Infosys Limited, GSTIN: 29AAACH2702H1ZW, PAN: AAACH2702H",
            "document_id": "test_text_01",
        }
        response = client.post("/api/v1/compliance/extract-from-text", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert len(data["gstin_candidates"]) == 1
        assert data["gstin_candidates"][0]["value"] == "29AAACH2702H1ZW"
        assert len(data["legal_name_candidates"]) >= 1
