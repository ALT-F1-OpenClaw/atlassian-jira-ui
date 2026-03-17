"""Project endpoint tests."""

import pytest
from unittest.mock import patch, AsyncMock


MOCK_PROJECTS = [
    {
        "id": "10001",
        "key": "PROJ",
        "name": "My Project",
        "avatarUrls": {"48x48": "https://jira.test/avatar.png"},
        "style": "classic",
        "description": "A test project",
    },
    {
        "id": "10002",
        "key": "DEMO",
        "name": "Demo Project",
        "avatarUrls": {"48x48": "https://jira.test/demo.png"},
        "style": "next-gen",
        "description": "",
    },
]

MOCK_MEMBERS = [
    {
        "accountId": "user-1",
        "displayName": "Alice",
        "avatarUrls": {"48x48": "https://jira.test/alice.png"},
        "active": True,
        "accountType": "atlassian",
    },
    {
        "accountId": "user-2",
        "displayName": "Bob Bot",
        "avatarUrls": {"48x48": ""},
        "active": True,
        "accountType": "app",  # should be filtered out
    },
]


@pytest.mark.asyncio
async def test_list_projects_returns_mapped_data(client):
    """Given Jira returns projects, when GET /api/projects, then return mapped fields including avatarUrl."""
    with patch("app.routers.projects.authed_jira_request", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_PROJECTS
        resp = await client.get("/api/projects")

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["key"] == "PROJ"
    assert data[0]["name"] == "My Project"
    assert data[0]["avatarUrl"] == "https://jira.test/avatar.png"
    assert data[1]["key"] == "DEMO"


@pytest.mark.asyncio
async def test_list_projects_empty(client):
    """Given Jira returns no projects, when GET /api/projects, then return empty list."""
    with patch("app.routers.projects.authed_jira_request", new_callable=AsyncMock) as mock:
        mock.return_value = []
        resp = await client.get("/api/projects")

    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_members_filters_non_atlassian(client):
    """Given members include app accounts, when GET /api/projects/PROJ/members, then only atlassian users returned."""
    with patch("app.routers.projects.authed_jira_request", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_MEMBERS
        resp = await client.get("/api/projects/PROJ/members")

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["displayName"] == "Alice"
    assert data[0]["accountId"] == "user-1"


@pytest.mark.asyncio
async def test_list_members_empty_project(client):
    """Given project has no members, when GET /api/projects/EMPTY/members, then return empty list."""
    with patch("app.routers.projects.authed_jira_request", new_callable=AsyncMock) as mock:
        mock.return_value = []
        resp = await client.get("/api/projects/EMPTY/members")

    assert resp.status_code == 200
    assert resp.json() == []
