from datetime import datetime
from pydantic import BaseModel, Field


class HealthCheckResponse(BaseModel):
    """Schema for health check endpoint response."""
    status: str = Field(default="ok", description="Current system operational status")
    app_name: str = Field(description="Name of the backend service")
    version: str = Field(description="Service version")
    environment: str = Field(description="Deployment environment")
    ocr_available: bool = Field(default=False, description="Whether Tesseract OCR binary is ready on system")
    ocr_engine: str = Field(default="Tesseract OCR", description="Configured OCR engine")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="UTC timestamp of the check"
    )
