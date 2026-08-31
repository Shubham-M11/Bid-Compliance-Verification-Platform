import pytest
from app.schemas.statutory import (
    EnterpriseMajorActivity,
    EnterpriseType,
    PANEntityType,
    TaxpayerStatus,
    VerificationSource,
)
from app.services.compliance.providers import (
    MockGSTNProvider,
    MockOEMProvider,
    MockPANProvider,
    MockUdyamProvider,
    get_gstn_provider,
    get_oem_provider,
    get_pan_provider,
    get_udyam_provider,
)


@pytest.mark.asyncio
class TestMockGSTNProvider:
    """Test MockGSTNProvider lookup behavior and strict zero-fabrication guardrail."""

    async def test_lookup_existing_gstin(self):
        provider = MockGSTNProvider()
        found, record, msg, source = await provider.lookup_gstin("27AAACT2727Q1ZW")

        assert found is True
        assert record is not None
        assert record.legal_name == "TECH MAHINDRA LIMITED"
        assert record.status == TaxpayerStatus.ACTIVE
        assert record.state == "Maharashtra"
        assert source == VerificationSource.MOCK_REGISTRY

    async def test_guardrail_zero_data_fabrication_for_unknown_valid_gstin(self):
        """
        MANDATORY GUARDRAIL: When a GSTIN is structurally valid but not in the mock DB,
        the provider MUST NOT fabricate a fake legal name, status, or registration record.
        It must return found=False, record=None.
        """
        provider = MockGSTNProvider()
        # 33AAACA6529K1Z1 is an authentic Ashok Leyland GSTIN not present in MOCK_GSTIN_DB
        found, record, msg, source = await provider.lookup_gstin("33AAACA6529K1Z1")

        assert found is False
        assert record is None
        assert "not present in the curated mock registry" in msg
        assert source == VerificationSource.MOCK_REGISTRY

    async def test_lookup_suspended_gstin(self):
        provider = MockGSTNProvider()
        found, record, msg, source = await provider.lookup_gstin("09AABCA5678A1ZT")

        assert found is True
        assert record is not None
        assert record.status == TaxpayerStatus.SUSPENDED
        assert record.is_filing_up_to_date is False


@pytest.mark.asyncio
class TestMockPANProvider:
    """Test MockPANProvider lookup and absence handling."""

    async def test_lookup_existing_pan(self):
        provider = MockPANProvider()
        found, record, msg, source = await provider.lookup_pan("AAACT2727Q")

        assert found is True
        assert record is not None
        assert record.full_name == "TECH MAHINDRA LIMITED"
        assert record.entity_type == PANEntityType.COMPANY

    async def test_lookup_unknown_pan_no_fabrication(self):
        provider = MockPANProvider()
        found, record, msg, source = await provider.lookup_pan("ZZZZZ9999Z")

        assert found is False
        assert record is None
        assert "not present in the curated mock registry" in msg


@pytest.mark.asyncio
class TestMockUdyamProvider:
    """Test MockUdyamProvider lookup and MSME policy/tender-dependent benefits."""

    async def test_lookup_existing_udyam_micro_manufacturer(self):
        provider = MockUdyamProvider()
        found, record, msg, source = await provider.lookup_udyam("UDYAM-DL-01-0012345")

        assert found is True
        assert record is not None
        assert record.enterprise_name == "NEXATECH INNOVATIONS LLP"
        assert record.enterprise_tier == EnterpriseType.MICRO
        assert record.major_activity == EnterpriseMajorActivity.MANUFACTURING
        assert "26201" in record.nic_codes

        # Policy advisory verification
        assert record.advisory_benefits.emd_exemption_eligible is True
        assert "MSME Order 2012" in record.advisory_benefits.emd_exemption_advisory
        assert "GFR Rule 173(i)" in record.advisory_benefits.prior_experience_advisory

    async def test_lookup_trading_udyam_entity_limitations(self):
        provider = MockUdyamProvider()
        found, record, msg, source = await provider.lookup_udyam("UDYAM-MH-12-0054321")

        assert found is True
        assert record is not None
        assert record.major_activity == EnterpriseMajorActivity.TRADING
        # Pure trading is flagged as not universally eligible for public procurement EMD waivers
        assert record.advisory_benefits.emd_exemption_eligible is False
        assert "trading" in record.advisory_benefits.emd_exemption_advisory.lower()

    async def test_lookup_unknown_udyam_no_fabrication(self):
        provider = MockUdyamProvider()
        found, record, msg, source = await provider.lookup_udyam("UDYAM-RJ-99-9999999")

        assert found is False
        assert record is None


@pytest.mark.asyncio
class TestMockOEMProvider:
    """Test MockOEMProvider matching by MAF number and partner relationship."""

    async def test_lookup_by_maf_number(self):
        provider = MockOEMProvider()
        found, record, msg, source = await provider.lookup_oem(
            oem_name="Cisco Systems India",
            partner_name="NexaTech Innovations LLP",
            maf_number="MAF-CSCO-2026-8891",
        )
        assert found is True
        assert record is not None
        assert record.maf_number == "MAF-CSCO-2026-8891"

    async def test_lookup_by_partner_tokens(self):
        provider = MockOEMProvider()
        found, record, msg, source = await provider.lookup_oem(
            oem_name="Hewlett Packard Enterprise",
            partner_name="Tech Mahindra Limited",
            maf_number=None,
        )
        assert found is True
        assert record is not None
        assert "TECH MAHINDRA" in record.authorized_partner_name

    async def test_lookup_unknown_oem(self):
        provider = MockOEMProvider()
        found, record, msg, source = await provider.lookup_oem(
            oem_name="Unknown Corp",
            partner_name="Random Vendor",
            maf_number="UNKNOWN-MAF-1234",
        )
        assert found is False
        assert record is None


class TestProviderFactories:
    """Test provider factory functions."""

    def test_factory_returns_mock_providers(self):
        assert isinstance(get_gstn_provider(), MockGSTNProvider)
        assert isinstance(get_pan_provider(), MockPANProvider)
        assert isinstance(get_udyam_provider(), MockUdyamProvider)
        assert isinstance(get_oem_provider(), MockOEMProvider)
