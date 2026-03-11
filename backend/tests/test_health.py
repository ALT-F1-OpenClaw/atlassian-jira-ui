"""Health endpoint tests."""

import pytest


@pytest.mark.asyncio
async def test_health_returns_ok_and_version(client):
    """Given the API is running, when GET /api/health, then return status ok with version."""
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "version" in data
