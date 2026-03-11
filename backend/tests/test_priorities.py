"""Priority endpoint tests."""

import pytest
from unittest.mock import patch, AsyncMock


MOCK_PRIORITIES = [
    {"id": "1", "name": "Highest", "iconUrl": "https://jira.test/highest.png"},
    {"id": "2", "name": "High", "iconUrl": "https://jira.test/high.png"},
    {"id": "3", "name": "Medium", "iconUrl": ""},
    {"id": "4", "name": "Low", "iconUrl": "https://jira.test/low.png"},
    {"id": "5", "name": "Lowest", "iconUrl": "https://jira.test/lowest.png"},
]


@pytest.mark.asyncio
async def test_list_priorities(client):
    """Given Jira returns priorities, when GET /api/priorities, then return mapped list."""
    with patch("app.routers.priorities.jira_request", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_PRIORITIES
        resp = await client.get("/api/priorities")

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 5
    assert data[0]["name"] == "Highest"
    assert data[2]["iconUrl"] == ""


@pytest.mark.asyncio
async def test_list_priorities_empty(client):
    """Given Jira returns no priorities, when GET /api/priorities, then return empty list."""
    with patch("app.routers.priorities.jira_request", new_callable=AsyncMock) as mock:
        mock.return_value = []
        resp = await client.get("/api/priorities")

    assert resp.status_code == 200
    assert resp.json() == []
