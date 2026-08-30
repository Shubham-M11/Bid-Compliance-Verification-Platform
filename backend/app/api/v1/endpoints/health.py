from datetime import datetime, timezone
from fastapi import APIRouter

from app.core.config import settings
from app.schemas.health import HealthCheckResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthCheckResponse,
    summary="Health Check",
    description="Returns backend service health status, version, and server timestamp.",
)
async def health_check() -> HealthCheckResponse:
    """Return backend operational status and service information."""
    return HealthCheckResponse(
        status="ok",
        app_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(timezone.utc),
    )
