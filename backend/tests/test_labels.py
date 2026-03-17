"""Label endpoint tests."""

import pytest
from unittest.mock import patch, AsyncMock


@pytest.mark.asyncio
async def test_list_labels(client):
    """Given Jira returns labels, when GET /api/labels, then return list of label strings."""
    with patch("app.routers.labels.authed_jira_request", new_callable=AsyncMock) as mock:
        mock.return_value = {"values": ["bug", "feature", "urgent"], "total": 3}
        resp = await client.get("/api/labels")

    assert resp.status_code == 200
    data = resp.json()
    assert data == ["bug", "feature", "urgent"]


@pytest.mark.asyncio
async def test_list_labels_empty(client):
    """Given Jira returns no labels, when GET /api/labels, then return empty list."""
    with patch("app.routers.labels.authed_jira_request", new_callable=AsyncMock) as mock:
        mock.return_value = {"values": [], "total": 0}
        resp = await client.get("/api/labels")

    assert resp.status_code == 200
    assert resp.json() == []
