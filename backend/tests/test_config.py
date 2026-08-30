from app.core.config import Settings


def test_default_settings():
    """Test default settings initialization."""
    settings = Settings()
    assert settings.PROJECT_NAME == "GeM Bid Compliance Verification Platform"
    assert settings.API_V1_STR == "/api/v1"
    assert "http://localhost:3000" in settings.BACKEND_CORS_ORIGINS
    assert "postgresql" in settings.DATABASE_URL


def test_cors_origins_parsing_list():
    """Test parsing list of CORS origins."""
    settings = Settings(BACKEND_CORS_ORIGINS=["http://localhost:3000", "http://localhost:8000"])
    assert len(settings.BACKEND_CORS_ORIGINS) == 2
    assert "http://localhost:3000" in settings.BACKEND_CORS_ORIGINS


def test_cors_origins_parsing_json_string():
    """Test parsing JSON string format of CORS origins."""
    settings = Settings(BACKEND_CORS_ORIGINS='["http://localhost:3000", "https://example.com"]')
    assert len(settings.BACKEND_CORS_ORIGINS) == 2
    assert "https://example.com" in settings.BACKEND_CORS_ORIGINS


def test_cors_origins_parsing_comma_separated():
    """Test parsing comma-separated format of CORS origins."""
    settings = Settings(BACKEND_CORS_ORIGINS="http://localhost:3000, https://example.com")
    assert len(settings.BACKEND_CORS_ORIGINS) == 2
    assert "https://example.com" in settings.BACKEND_CORS_ORIGINS
