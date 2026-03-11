"""Shared fixtures for backend tests."""

import os
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch

# Set dummy env vars before importing app
os.environ.setdefault("JIRA_HOST", "https://test.atlassian.net")
os.environ.setdefault("JIRA_EMAIL", "test@test.com")
os.environ.setdefault("JIRA_API_TOKEN", "test-token")
os.environ.setdefault("APP_SECRET_KEY", "test-secret")

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config import get_settings


@pytest.fixture(autouse=True)
def _clear_settings_cache():
    """Clear the lru_cache so env overrides take effect."""
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def mock_jira():
    """Patch jira_request to return mock data without hitting Jira."""
    with patch("app.jira_client.jira_request", new_callable=AsyncMock) as mock:
        yield mock


@pytest_asyncio.fixture
async def client():
    """Async test client for the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
