from typing import List, Optional, Union
import json
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings managed by Pydantic."""
    PROJECT_NAME: str = "GeM Bid Compliance Verification Platform"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # CORS origins: defaults to Next.js local frontend and cloud deployments
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://bid-compliance-verification-platfor.vercel.app",
        "https://bid-compliance-verification-platform.vercel.app",
        "https://bid-compliance-verification-platform.onrender.com",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            "https://bid-compliance-verification-platfor.vercel.app",
            "https://bid-compliance-verification-platform.vercel.app",
            "https://bid-compliance-verification-platform.onrender.com",
        ]

    # Database connection URL (PostgreSQL / Supabase asyncpg)
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/gem_compliance_db"
    )

    # Document Upload Configuration (Task 2A)
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB limit
    ALLOWED_EXTENSIONS: List[str] = ["pdf"]
    ALLOWED_MIME_TYPES: List[str] = ["application/pdf"]

    # OCR Fallback Configuration (Task 2B)
    TESSERACT_CMD: Optional[str] = None
    OCR_MIN_TEXT_THRESHOLD: int = 15  # Minimum character count to classify as digital text
    OCR_DPI: int = 200  # Resolution for rendering scanned PDF pages to in-memory images

    # Statutory Compliance Verification (Task 3A)
    STATUTORY_PROVIDER_MODE: str = "mock"  # "mock", "sandbox", or "live"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
