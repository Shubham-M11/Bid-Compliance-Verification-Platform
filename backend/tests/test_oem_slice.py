from datetime import date, timedelta
from fastapi.testclient import TestClient
import pytest
from httpx import AsyncClient, ASGITransport

from main import app
from app.schemas.composite import (
    BidMetadata,
    CheckStatus,
    CompositeVerificationRequest,
    EntitySource,
    EntityType,
    ExtractedEntityItem,
)
from app.schemas.statutory import (
    OEMValidationRequest,
    ValidationStatus,
)
from app.services.compliance.cross_consistency import cross_consistency_engine
from app.services.compliance.extractor import document_entity_extractor
from app.services.compliance.oem.health import oem_health_evaluator
from app.services.compliance.oem.normalizer import oem_normalizer
from app.services.compliance.oem.service import oem_module_service
from app.services.compliance.oem.validator import oem_structural_validator
from app.services.compliance.statutory_service import statutory_service


# ==============================================================================
# 1. OEM Normalization Tests
# ==============================================================================

def test_oem_normalizer_delimiter_cleanup():
    """Test standardizing delimiters in MAF references."""
    norm_val, details = oem_normalizer.normalize_maf_number("maf / csco / 2026 / 8891")
    assert norm_val == "MAF-CSCO-2026-8891"
    assert details.is_normalized is True
    assert details.raw_input == "maf / csco / 2026 / 8891"
    assert len(details.normalization_notes) > 0


def test_oem_normalizer_already_clean():
    """Clean MAF references require no transformation."""
    norm_val, details = oem_normalizer.normalize_maf_number("MAF-CSCO-2026-8891")
    assert norm_val == "MAF-CSCO-2026-8891"
    assert details.is_normalized is False


def test_oem_normalizer_empty():
    """Empty MAF returns None and un-normalized details."""
    norm_val, details = oem_normalizer.normalize_maf_number(None)
    assert norm_val is None
    assert details.is_normalized is False


def test_oem_normalizer_entity_suffix():
    """Entity normalizer standardizes corporate suffixes."""
    norm = oem_normalizer.normalize_entity_name("Cisco Systems India Pvt. Ltd.")
    assert "PRIVATE LIMITED" in norm or "PRIVATE" in norm


# ==============================================================================
# 2. Structural & Deterministic Validator Tests
# ==============================================================================

def test_oem_structural_validator_valid_window():
    """Valid active MAF window produces valid deterministic result."""
    today = date.today()
    req = OEMValidationRequest(
        oem_name="Cisco Systems India Private Limited",
        authorized_partner_name="NexaTech Innovations LLP",
        maf_number="MAF-CSCO-2026-8891",
        tender_ref_number="GEM/2026/B/445566",
        valid_from=today - timedelta(days=30),
        valid_until=today + timedelta(days=180),
        bid_submission_date=today,
        scope_of_authorization="Enterprise Networking & Switches",
        signatory_name="Rajesh Sharma",
        signatory_designation="Director Partner Sales",
    )
    res = oem_structural_validator.validate_maf_structure(req)
    assert res.is_oem_name_provided is True
    assert res.is_partner_name_provided is True
    assert res.is_maf_number_provided is True
    assert res.is_tender_ref_provided is True
    assert res.is_date_range_valid is True
    assert res.is_expired is False
    assert res.is_valid_on_bid_date is True
    assert res.days_until_expiry is not None and res.days_until_expiry > 0
    assert len(res.validation_errors) == 0
    assert res.structure_breakdown is not None
    assert res.structure_breakdown.temporal_standing == "ACTIVE"


def test_oem_structural_validator_expired():
    """Expired MAF is flagged accurately."""
    today = date.today()
    req = OEMValidationRequest(
        oem_name="Dell International Services India Private Limited",
        authorized_partner_name="Apex Infotech Private Limited",
        maf_number="DELL-MAF-2024-9102",
        valid_from=date(2024, 1, 1),
        valid_until=date(2024, 12, 31),
        bid_submission_date=today,
    )
    res = oem_structural_validator.validate_maf_structure(req)
    assert res.is_expired is True
    assert res.is_valid_on_bid_date is False
    assert res.days_until_expiry is not None and res.days_until_expiry < 0
    assert res.structure_breakdown.temporal_standing == "EXPIRED"
    assert any("expired" in err.lower() for err in res.validation_errors)


def test_oem_structural_validator_future_effective():
    """Future effective MAF is flagged as not yet effective."""
    today = date.today()
    req = OEMValidationRequest(
        oem_name="Cisco Systems India Private Limited",
        authorized_partner_name="NexaTech Innovations LLP",
        maf_number="MAF-CSCO-2027-0001",
        valid_from=today + timedelta(days=60),
        valid_until=today + timedelta(days=400),
        bid_submission_date=today,
    )
    res = oem_structural_validator.validate_maf_structure(req)
    assert res.is_expired is False
    assert res.is_valid_on_bid_date is False
    assert res.structure_breakdown.temporal_standing == "NOT_YET_EFFECTIVE"
    assert any("not yet effective" in err.lower() for err in res.validation_errors)


def test_oem_structural_validator_inverted_dates():
    """Inverted valid_until < valid_from fails date range check."""
    req = OEMValidationRequest(
        oem_name="Cisco Systems India Private Limited",
        authorized_partner_name="NexaTech Innovations LLP",
        valid_from=date(2026, 6, 1),
        valid_until=date(2026, 1, 1),
    )
    res = oem_structural_validator.validate_maf_structure(req)
    assert res.is_date_range_valid is False
    assert any("cannot precede" in err.lower() for err in res.validation_errors)


# ==============================================================================
# 3. Domain Service & Zero-Fabrication Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_oem_module_service_known_valid():
    """Valid known OEM partner verification succeeds."""
    today = date.today()
    req = OEMValidationRequest(
        oem_name="CISCO SYSTEMS INDIA PRIVATE LIMITED",
        authorized_partner_name="NEXATECH INNOVATIONS LLP",
        maf_number="MAF/CSCO/2026/8891",
        tender_ref_number="GEM/2026/B/445566",
        valid_from=today - timedelta(days=30),
        valid_until=today + timedelta(days=180),
        bid_submission_date=today,
    )
    resp = await oem_module_service.validate_oem(req)
    assert resp.overall_status == ValidationStatus.VALID
    assert resp.maf_number == "MAF-CSCO-2026-8891"
    assert resp.deterministic.normalization is not None
    assert resp.deterministic.normalization.is_normalized is True
    assert resp.registry.registry_found is True
    assert resp.registry.record is not None
    assert resp.registry.record.is_partner_in_oem_database is True
    assert resp.is_live_government_source is False


@pytest.mark.asyncio
async def test_oem_module_service_unknown_zero_fabrication():
    """Unknown MAF/OEM returns RECORD_NOT_FOUND without fabricated records."""
    req = OEMValidationRequest(
        oem_name="UNKNOWN ROBOTICS INC",
        authorized_partner_name="FICTIONAL BIDDER LTD",
        maf_number="MAF-UNKNOWN-9999",
        valid_from=date.today(),
        valid_until=date.today() + timedelta(days=100),
    )
    resp = await oem_module_service.validate_oem(req)
    assert resp.overall_status == ValidationStatus.RECORD_NOT_FOUND
    assert resp.registry.registry_found is False
    assert resp.registry.record is None
    assert resp.is_live_government_source is False


@pytest.mark.asyncio
async def test_statutory_service_oem_delegation():
    """StatutoryValidationService delegates validate_oem seamlessly."""
    req = OEMValidationRequest(
        oem_name="HEWLETT PACKARD ENTERPRISE INDIA PRIVATE LIMITED",
        authorized_partner_name="TECH MAHINDRA LIMITED",
        maf_number="HPE-IND-MAF-2026-0045",
        valid_from=date.today(),
        valid_until=date.today() + timedelta(days=100),
    )
    resp = await statutory_service.validate_oem(req)
    assert resp.overall_status == ValidationStatus.VALID
    assert resp.registry.registry_found is True
    assert resp.registry.record.authorization_status == "Active Platinum Partner"


# ==============================================================================
# 4. Cross-Document Verification & Consistency Tests
# ==============================================================================

def test_cross_consistency_r03_partner_match():
    """Rule R-03 passes when bidder name matches OEM authorized partner."""
    today = date.today()
    oem_det = oem_structural_validator.validate_maf_structure(
        OEMValidationRequest(
            oem_name="CISCO SYSTEMS INDIA PRIVATE LIMITED",
            authorized_partner_name="NEXATECH INNOVATIONS LLP",
            maf_number="MAF-CSCO-2026-8891",
            valid_from=today - timedelta(days=10),
            valid_until=today + timedelta(days=180),
        )
    )
    from app.schemas.statutory import OEMRegistryResult, OEMValidationResponse
    oem_resp = OEMValidationResponse(
        oem_name="CISCO SYSTEMS INDIA PRIVATE LIMITED",
        authorized_partner_name="NEXATECH INNOVATIONS LLP",
        maf_number="MAF-CSCO-2026-8891",
        deterministic=oem_det,
        registry=OEMRegistryResult(registry_found=True, source="mock_registry", status_message="Found"),
        overall_status=ValidationStatus.VALID,
    )
    bid_meta = BidMetadata(expected_bidder_name="NexaTech Innovations LLP")
    candidate_entities = [
        ExtractedEntityItem(
            entity_type=EntityType.LEGAL_NAME,
            value="NexaTech Innovations LLP",
            raw_match="NexaTech Innovations LLP",
            document_id="doc_1",
            filename="Bid_Submission_Form.pdf",
            page_number=1,
            confidence=0.95,
            context_snippet="Bidder Name: NexaTech Innovations LLP",
            source_type=EntitySource.DOCUMENT_EXTRACTED,
        ),
        ExtractedEntityItem(
            entity_type=EntityType.OEM_NAME,
            value="Cisco Systems",
            raw_match="Cisco Systems",
            document_id="doc_2",
            filename="OEM_Authorization_Form.pdf",
            page_number=4,
            confidence=0.92,
            context_snippet="OEM: Cisco Systems India Private Limited",
            source_type=EntitySource.DOCUMENT_EXTRACTED,
        ),
    ]

    checks = cross_consistency_engine.evaluate_all(
        gstin_resp=None,
        pan_resp=None,
        udyam_resp=None,
        oem_resp=oem_resp,
        bid_metadata=bid_meta,
        candidate_entities=candidate_entities,
    )

    r03 = next((r for r in checks if r.rule_id == "R-03"), None)
    assert r03 is not None
    assert r03.status == CheckStatus.PASS


def test_cross_consistency_r03_partner_mismatch():
    """Rule R-03 fails when MAF partner does not match bidder legal name."""
    today = date.today()
    oem_det = oem_structural_validator.validate_maf_structure(
        OEMValidationRequest(
            oem_name="CISCO SYSTEMS INDIA PRIVATE LIMITED",
            authorized_partner_name="DIFFERENT RESELLER PRIVATE LIMITED",
            maf_number="MAF-CSCO-2026-8891",
            valid_from=today - timedelta(days=10),
            valid_until=today + timedelta(days=180),
        )
    )
    from app.schemas.statutory import OEMRegistryResult, OEMValidationResponse
    oem_resp = OEMValidationResponse(
        oem_name="CISCO SYSTEMS INDIA PRIVATE LIMITED",
        authorized_partner_name="DIFFERENT RESELLER PRIVATE LIMITED",
        maf_number="MAF-CSCO-2026-8891",
        deterministic=oem_det,
        registry=OEMRegistryResult(registry_found=True, source="mock_registry", status_message="Found"),
        overall_status=ValidationStatus.VALID,
    )
    bid_meta = BidMetadata(expected_bidder_name="NexaTech Innovations LLP")

    checks = cross_consistency_engine.evaluate_all(
        gstin_resp=None,
        pan_resp=None,
        udyam_resp=None,
        oem_resp=oem_resp,
        bid_metadata=bid_meta,
    )

    r03 = next((r for r in checks if r.rule_id == "R-03"), None)
    assert r03 is not None
    assert r03.status == CheckStatus.FAIL


def test_cross_consistency_r04_tender_ref_match():
    """Rule R-04 passes when MAF tender ref matches bid tender ref."""
    today = date.today()
    oem_det = oem_structural_validator.validate_maf_structure(
        OEMValidationRequest(
            oem_name="CISCO SYSTEMS INDIA PRIVATE LIMITED",
            authorized_partner_name="NEXATECH INNOVATIONS LLP",
            maf_number="MAF-CSCO-2026-8891",
            tender_ref_number="GEM/2026/B/445566",
            valid_from=today - timedelta(days=10),
            valid_until=today + timedelta(days=180),
        )
    )
    from app.schemas.statutory import OEMRegistryResult, OEMValidationResponse
    oem_resp = OEMValidationResponse(
        oem_name="CISCO SYSTEMS INDIA PRIVATE LIMITED",
        authorized_partner_name="NEXATECH INNOVATIONS LLP",
        maf_number="MAF-CSCO-2026-8891",
        deterministic=oem_det,
        registry=OEMRegistryResult(registry_found=True, source="mock_registry", status_message="Found"),
        overall_status=ValidationStatus.VALID,
    )
    bid_meta = BidMetadata(tender_ref_number="GEM/2026/B/445566")

    checks = cross_consistency_engine.evaluate_all(
        gstin_resp=None,
        pan_resp=None,
        udyam_resp=None,
        oem_resp=oem_resp,
        bid_metadata=bid_meta,
    )

    r04 = next((r for r in checks if r.rule_id == "R-04"), None)
    assert r04 is not None
    assert r04.status == CheckStatus.PASS


def test_cross_consistency_r04_tender_ref_mismatch():
    """Rule R-04 fails when MAF tender ref differs from target tender ref."""
    today = date.today()
    oem_det = oem_structural_validator.validate_maf_structure(
        OEMValidationRequest(
            oem_name="CISCO SYSTEMS INDIA PRIVATE LIMITED",
            authorized_partner_name="NEXATECH INNOVATIONS LLP",
            maf_number="MAF-CSCO-2026-8891",
            tender_ref_number="GEM/2025/B/999999",
            valid_from=today - timedelta(days=10),
            valid_until=today + timedelta(days=180),
        )
    )
    from app.schemas.statutory import OEMRegistryResult, OEMValidationResponse
    oem_resp = OEMValidationResponse(
        oem_name="CISCO SYSTEMS INDIA PRIVATE LIMITED",
        authorized_partner_name="NEXATECH INNOVATIONS LLP",
        maf_number="MAF-CSCO-2026-8891",
        deterministic=oem_det,
        registry=OEMRegistryResult(registry_found=True, source="mock_registry", status_message="Found"),
        overall_status=ValidationStatus.VALID,
    )
    bid_meta = BidMetadata(tender_ref_number="GEM/2026/B/445566")

    checks = cross_consistency_engine.evaluate_all(
        gstin_resp=None,
        pan_resp=None,
        udyam_resp=None,
        oem_resp=oem_resp,
        bid_metadata=bid_meta,
    )

    r04 = next((r for r in checks if r.rule_id == "R-04"), None)
    assert r04 is not None
    assert r04.status == CheckStatus.FAIL


# ==============================================================================
# 5. Dedicated API Endpoint Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_api_oem_verify():
    """POST /api/v1/oem/verify returns structured response."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/oem/verify",
            json={
                "oem_name": "CISCO SYSTEMS INDIA PRIVATE LIMITED",
                "authorized_partner_name": "NEXATECH INNOVATIONS LLP",
                "maf_number": "MAF/CSCO/2026/8891",
                "valid_from": str(date.today()),
                "valid_until": str(date.today() + timedelta(days=90)),
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["overall_status"] == "VALID"
        assert data["maf_number"] == "MAF-CSCO-2026-8891"
        assert data["deterministic"]["normalization"]["is_normalized"] is True
        assert data["registry"]["registry_found"] is True


@pytest.mark.asyncio
async def test_api_oem_analyze_structure():
    """POST /api/v1/oem/analyze-structure executes deterministic parsing."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/oem/analyze-structure",
            json={
                "oem_name": "Cisco Systems India Private Limited",
                "authorized_partner_name": "NexaTech Innovations LLP",
                "maf_number": "MAF/CSCO/2026/8891",
                "tender_ref_number": "GEM/2026/B/445566",
                "valid_from": str(date.today() - timedelta(days=10)),
                "valid_until": str(date.today() + timedelta(days=100)),
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["is_date_range_valid"] is True
        assert data["is_expired"] is False
        assert data["structure_breakdown"]["temporal_standing"] == "ACTIVE"


@pytest.mark.asyncio
async def test_api_oem_manufacturers():
    """GET /api/v1/oem/manufacturers returns recognized OEM list."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/oem/manufacturers")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) >= 3
        oem_names = [it["oem_name"] for it in data]
        assert any("CISCO" in name for name in oem_names)


@pytest.mark.asyncio
async def test_api_statutory_oem_backward_compat():
    """POST /api/v1/statutory/oem/verify remains backward compatible."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/statutory/oem/verify",
            json={
                "oem_name": "HEWLETT PACKARD ENTERPRISE INDIA PRIVATE LIMITED",
                "authorized_partner_name": "TECH MAHINDRA LIMITED",
                "maf_number": "HPE-IND-MAF-2026-0045",
                "valid_from": str(date.today()),
                "valid_until": str(date.today() + timedelta(days=90)),
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["overall_status"] == "VALID"
        assert data["registry"]["registry_found"] is True
