"""Search endpoint tests."""

import pytest
from unittest.mock import patch, AsyncMock


MOCK_SEARCH_RESULT = {
    "issues": [
        {
            "id": "10001",
            "key": "PROJ-1",
            "fields": {
                "summary": "Fix login bug",
                "status": {"name": "In Progress"},
                "priority": {"name": "High"},
                "issuetype": {"name": "Bug"},
                "assignee": {"displayName": "Alice"},
                "updated": "2026-03-11T10:00:00.000+0000",
            },
        },
        {
            "id": "10002",
            "key": "PROJ-2",
            "fields": {
                "summary": "Add dark mode",
                "status": {"name": "To Do"},
                "priority": None,
                "issuetype": {"name": "Story"},
                "assignee": None,
                "updated": "2026-03-10T15:30:00.000+0000",
            },
        },
    ],
    "total": 2,
}


@pytest.mark.asyncio
async def test_jql_search_returns_mapped_issues(client):
    """Given Jira returns search results, when GET /api/search?jql=..., then return mapped issues."""
    with patch("app.routers.search.authed_jira_request", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_SEARCH_RESULT
        resp = await client.get("/api/search", params={"jql": "project = PROJ"})

    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["issues"]) == 2
    assert data["issues"][0]["key"] == "PROJ-1"
    assert data["issues"][0]["status"] == "In Progress"
    assert data["issues"][0]["priority"] == "High"
    assert data["issues"][1]["assignee"] == ""  # None assignee → empty string


@pytest.mark.asyncio
async def test_jql_search_requires_jql_param(client):
    """Given no JQL parameter, when GET /api/search, then return 422 validation error."""
    resp = await client.get("/api/search")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_quick_search_with_project_filter(client):
    """Given a project filter, when GET /api/search/quick?q=login&project=PROJ, then JQL includes project clause."""
    with patch("app.routers.search.authed_jira_request", new_callable=AsyncMock) as mock:
        mock.return_value = {"issues": [], "total": 0}
        resp = await client.get("/api/search/quick", params={"q": "login", "project": "PROJ"})

    assert resp.status_code == 200
    # Verify jira_request was called with JQL containing project filter
    call_args = mock.call_args
    jql = call_args.kwargs.get("params", {}).get("jql", "")
    assert 'project = "PROJ"' in jql
    assert 'text ~ "login"' in jql


@pytest.mark.asyncio
async def test_quick_search_without_project(client):
    """Given no project filter, when GET /api/search/quick?q=test, then JQL has no project clause."""
    with patch("app.routers.search.authed_jira_request", new_callable=AsyncMock) as mock:
        mock.return_value = {"issues": [], "total": 0}
        resp = await client.get("/api/search/quick", params={"q": "test"})

    assert resp.status_code == 200
    call_args = mock.call_args
    jql = call_args.kwargs.get("params", {}).get("jql", "")
    assert "project" not in jql
    assert 'text ~ "test"' in jql
