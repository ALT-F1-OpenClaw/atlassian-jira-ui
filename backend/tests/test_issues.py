"""Issue endpoint tests."""

import pytest
from unittest.mock import patch, AsyncMock


MOCK_ISSUES_RESPONSE = {
    "issues": [
        {
            "id": "10001",
            "key": "PROJ-1",
            "fields": {
                "summary": "Fix login page",
                "status": {"name": "In Progress", "statusCategory": {"key": "indeterminate"}},
                "priority": {"name": "High"},
                "issuetype": {"name": "Bug"},
                "assignee": {"accountId": "u1", "displayName": "Alice", "avatarUrls": {"48x48": "https://a.png"}},
                "labels": ["bug"],
                "updated": "2026-03-11T10:00:00.000+0000",
                "duedate": "2026-04-01",
            },
        },
    ],
    "total": 1,
}

MOCK_ISSUE_DETAIL = {
    "id": "10001",
    "key": "PROJ-1",
    "fields": {
        "summary": "Fix login page",
        "description": "The login page is broken",
        "status": {"name": "In Progress", "statusCategory": {"key": "indeterminate"}},
        "priority": {"name": "High"},
        "issuetype": {"name": "Bug"},
        "assignee": {"accountId": "u1", "displayName": "Alice", "avatarUrls": {"48x48": ""}},
        "reporter": {"accountId": "u2", "displayName": "Bob", "avatarUrls": {"48x48": ""}},
        "labels": ["bug"],
        "updated": "2026-03-11T10:00:00.000+0000",
        "created": "2026-03-10T08:00:00.000+0000",
        "duedate": "2026-04-01",
        "project": {"key": "PROJ", "name": "My Project"},
    },
    "transitions": [
        {"id": "11", "name": "To Do"},
        {"id": "21", "name": "In Progress"},
        {"id": "31", "name": "Done"},
    ],
}


@pytest.mark.asyncio
async def test_list_issues_returns_mapped_data(client):
    """Given Jira returns issues, when GET /api/issues, then return mapped issue list."""
    with patch("app.routers.issues.authed_jira_request", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_ISSUES_RESPONSE
        resp = await client.get("/api/issues", params={"project": "PROJ"})

    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert len(data["issues"]) == 1
    issue = data["issues"][0]
    assert issue["key"] == "PROJ-1"
    assert issue["summary"] == "Fix login page"
    assert issue["status"]["name"] == "In Progress"
    assert issue["assignee"]["displayName"] == "Alice"


@pytest.mark.asyncio
async def test_list_issues_default_pagination(client):
    """Given no pagination params, when GET /api/issues, then default to max_results=50, start_at=0."""
    with patch("app.routers.issues.authed_jira_request", new_callable=AsyncMock) as mock:
        mock.return_value = {"issues": [], "total": 0}
        resp = await client.get("/api/issues")

    assert resp.status_code == 200
    call_args = mock.call_args
    params = call_args.kwargs.get("params", {})
    assert params.get("maxResults") == 50
    assert params.get("startAt") == 0


@pytest.mark.asyncio
async def test_list_issues_max_results_capped(client):
    """Given max_results=999, when GET /api/issues, then cap at 200."""
    with patch("app.routers.issues.authed_jira_request", new_callable=AsyncMock) as mock:
        mock.return_value = {"issues": [], "total": 0}
        resp = await client.get("/api/issues", params={"max_results": "999"})

    # Should be rejected by validation (le=200)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_get_issue_detail(client):
    """Given a valid issue key, when GET /api/issues/PROJ-1, then return full issue detail."""
    with patch("app.routers.issues.authed_jira_request", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_ISSUE_DETAIL
        resp = await client.get("/api/issues/PROJ-1")

    assert resp.status_code == 200
    data = resp.json()
    assert data["key"] == "PROJ-1"
    assert data["summary"] == "Fix login page"
    assert len(data["transitions"]) == 3


@pytest.mark.asyncio
async def test_create_issue(client):
    """Given valid issue data, when POST /api/issues, then create and return new issue."""
    with patch("app.routers.issues.authed_jira_request", new_callable=AsyncMock) as mock:
        mock.return_value = {"id": "10099", "key": "PROJ-99"}
        resp = await client.post("/api/issues", json={
            "project": "PROJ",
            "summary": "New issue",
            "issue_type": "Task",
        })

    assert resp.status_code == 200
    data = resp.json()
    assert data["key"] == "PROJ-99"
    mock.assert_called_once()


@pytest.mark.asyncio
async def test_create_issue_missing_summary(client):
    """Given missing summary, when POST /api/issues, then return 422."""
    resp = await client.post("/api/issues", json={
        "project": "PROJ",
        "issue_type": "Task",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_transition_issue(client):
    """Given a valid transition, when POST /api/issues/PROJ-1/transition, then transition succeeds."""
    with patch("app.routers.issues.authed_jira_request", new_callable=AsyncMock) as mock:
        mock.return_value = None  # 204 returns None
        resp = await client.post("/api/issues/PROJ-1/transition", json={"transition_id": "31"})

    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
