from datetime import datetime, timezone
from fastapi import APIRouter

from app.core.config import settings
from app.schemas.health import HealthCheckResponse
from app.services.documents.ocr_processor import TesseractOCRProcessor

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthCheckResponse,
    summary="Health Check",
    description="Returns backend service health status, version, OCR capability, and server timestamp.",
)
async def health_check() -> HealthCheckResponse:
    """Return backend operational status and service information."""
    ocr_ready = TesseractOCRProcessor().is_available()
    return HealthCheckResponse(
        status="ok",
        app_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        ocr_available=ocr_ready,
        ocr_engine="Tesseract OCR (Installed)" if ocr_ready else "Tesseract OCR (Fallback Mode / Digital PDF Parser Active)",
        timestamp=datetime.now(timezone.utc),
    )

