from abc import ABC, abstractmethod
from typing import Optional, Tuple
from app.core.config import settings
from app.schemas.statutory import (
    GSTINRegistryRecord,
    OEMRegistryRecord,
    PANRegistryRecord,
    UdyamRegistryRecord,
    VerificationSource,
)
from app.services.compliance.mock_database import (
    MOCK_GSTIN_DB,
    MOCK_OEM_DB,
    MOCK_PAN_DB,
    MOCK_UDYAM_DB,
)


# ==============================================================================
# Abstract Provider Interfaces
# ==============================================================================

class BaseGSTNProvider(ABC):
    """Abstract interface for GSTN registry lookup providers."""

    @abstractmethod
    async def lookup_gstin(
        self, gstin: str
    ) -> Tuple[bool, Optional[GSTINRegistryRecord], str, VerificationSource]:
        """
        Lookup GSTIN in registry source.

        Returns:
            Tuple of (found, registry_record_or_None, status_message, verification_source)
        """
        pass


class BasePANProvider(ABC):
    """Abstract interface for PAN registry lookup providers."""

    @abstractmethod
    async def lookup_pan(
        self, pan: str
    ) -> Tuple[bool, Optional[PANRegistryRecord], str, VerificationSource]:
        """
        Lookup PAN in registry source.

        Returns:
            Tuple of (found, registry_record_or_None, status_message, verification_source)
        """
        pass


class BaseUdyamProvider(ABC):
    """Abstract interface for Udyam MSME registry lookup providers."""

    @abstractmethod
    async def lookup_udyam(
        self, udyam_number: str
    ) -> Tuple[bool, Optional[UdyamRegistryRecord], str, VerificationSource]:
        """
        Lookup Udyam Registration Number in registry source.

        Returns:
            Tuple of (found, registry_record_or_None, status_message, verification_source)
        """
        pass


class BaseOEMProvider(ABC):
    """Abstract interface for OEM MAF verification providers."""

    @abstractmethod
    async def lookup_oem(
        self, oem_name: str, partner_name: str, maf_number: Optional[str]
    ) -> Tuple[bool, Optional[OEMRegistryRecord], str, VerificationSource]:
        """
        Lookup OEM partner authorization record.

        Returns:
            Tuple of (found, registry_record_or_None, status_message, verification_source)
        """
        pass


# ==============================================================================
# Mock Provider Implementations (No Data Fabrication)
# ==============================================================================

class MockGSTNProvider(BaseGSTNProvider):
    """
    Mock GSTN registry provider querying a curated test database.
    Strictly avoids fabricating identity records for unregistered numbers.
    """

    async def lookup_gstin(
        self, gstin: str
    ) -> Tuple[bool, Optional[GSTINRegistryRecord], str, VerificationSource]:
        sanitized = gstin.strip().upper()
        if record := MOCK_GSTIN_DB.get(sanitized):
            return (
                True,
                record,
                "Record successfully matched in curated mock registry database.",
                VerificationSource.MOCK_REGISTRY,
            )

        return (
            False,
            None,
            f"GSTIN '{sanitized}' is structurally valid, but is not present in the curated mock registry.",
            VerificationSource.MOCK_REGISTRY,
        )


class MockPANProvider(BasePANProvider):
    """
    Mock PAN registry provider querying a curated test database.
    Strictly avoids fabricating identity records for unregistered numbers.
    """

    async def lookup_pan(
        self, pan: str
    ) -> Tuple[bool, Optional[PANRegistryRecord], str, VerificationSource]:
        sanitized = pan.strip().upper()
        if record := MOCK_PAN_DB.get(sanitized):
            return (
                True,
                record,
                "Record successfully matched in curated mock PAN database.",
                VerificationSource.MOCK_REGISTRY,
            )

        return (
            False,
            None,
            f"PAN '{sanitized}' is structurally valid, but is not present in the curated mock registry.",
            VerificationSource.MOCK_REGISTRY,
        )


class MockUdyamProvider(BaseUdyamProvider):
    """
    Mock Udyam registry provider querying a curated test database.
    Strictly avoids fabricating identity records for unregistered numbers.
    """

    async def lookup_udyam(
        self, udyam_number: str
    ) -> Tuple[bool, Optional[UdyamRegistryRecord], str, VerificationSource]:
        sanitized = udyam_number.strip().upper()
        if record := MOCK_UDYAM_DB.get(sanitized):
            return (
                True,
                record,
                "Record successfully matched in curated mock Udyam database.",
                VerificationSource.MOCK_REGISTRY,
            )

        return (
            False,
            None,
            f"Udyam number '{sanitized}' is structurally valid, but is not present in the curated mock registry.",
            VerificationSource.MOCK_REGISTRY,
        )


class MockOEMProvider(BaseOEMProvider):
    """
    Mock OEM provider querying curated authorization programs and MAF certificates.
    """

    async def lookup_oem(
        self, oem_name: str, partner_name: str, maf_number: Optional[str]
    ) -> Tuple[bool, Optional[OEMRegistryRecord], str, VerificationSource]:
        clean_oem = oem_name.strip().upper()
        clean_partner = partner_name.strip().upper()
        clean_maf = maf_number.strip().upper() if maf_number else None

        for record in MOCK_OEM_DB:
            # 1. Match by MAF certificate number if provided
            if clean_maf and record.maf_number.upper() == clean_maf:
                return (
                    True,
                    record,
                    f"MAF Certificate '{clean_maf}' recognized in OEM partner database.",
                    VerificationSource.MOCK_REGISTRY,
                )

            # 2. Match by OEM name & partner name tokens
            oem_match = any(token in record.oem_name.upper() for token in clean_oem.split() if len(token) > 3)
            partner_match = any(token in record.authorized_partner_name.upper() for token in clean_partner.split() if len(token) > 3)

            if oem_match and partner_match:
                return (
                    True,
                    record,
                    f"OEM partner relationship found for '{record.oem_name}' and '{record.authorized_partner_name}'.",
                    VerificationSource.MOCK_REGISTRY,
                )

        return (
            False,
            None,
            "OEM authorization or MAF reference was not found in the curated partner database.",
            VerificationSource.MOCK_REGISTRY,
        )


# ==============================================================================
# Dependency Injection / Provider Factory
# ==============================================================================

def get_gstn_provider() -> BaseGSTNProvider:
    """Return configured GSTN lookup provider instance."""
    # Future extension: if settings.STATUTORY_PROVIDER_MODE == "live": return LiveGSTNProvider(...)
    return MockGSTNProvider()


def get_pan_provider() -> BasePANProvider:
    """Return configured PAN lookup provider instance."""
    return MockPANProvider()


def get_udyam_provider() -> BaseUdyamProvider:
    """Return configured Udyam lookup provider instance."""
    return MockUdyamProvider()


def get_oem_provider() -> BaseOEMProvider:
    """Return configured OEM lookup provider instance."""
    return MockOEMProvider()
