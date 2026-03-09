"""Search endpoints."""

from fastapi import APIRouter, Query
from ..jira_client import jira_request

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("")
async def jql_search(
    jql: str = Query(..., description="JQL query string"),
    max_results: int = Query(default=50, le=100),
):
    """Execute a JQL search."""
    fields = "summary,status,priority,issuetype,assignee,updated"
    data = await jira_request(
        "GET",
        "/search/jql",
        params={"jql": jql, "maxResults": max_results, "fields": fields},
    )
    return {
        "issues": [
            {
                "id": i["id"],
                "key": i["key"],
                "summary": i.get("fields", {}).get("summary", ""),
                "status": i.get("fields", {}).get("status", {}).get("name", ""),
                "priority": (i.get("fields", {}).get("priority") or {}).get("name", ""),
                "assignee": (i.get("fields", {}).get("assignee") or {}).get("displayName", ""),
                "type": (i.get("fields", {}).get("issuetype") or {}).get("name", ""),
                "updated": i.get("fields", {}).get("updated"),
            }
            for i in (data or {}).get("issues", [])
        ],
        "total": (data or {}).get("total", 0),
    }


@router.get("/quick")
async def quick_search(
    q: str = Query(..., description="Text to search for"),
    project: str | None = None,
    max_results: int = Query(default=20, le=50),
):
    """Quick fuzzy text search across issues."""
    jql = f'text ~ "{q}"'
    if project:
        jql = f'project = "{project}" AND {jql}'
    jql += " ORDER BY updated DESC"

    fields = "summary,status,project"
    data = await jira_request(
        "GET",
        "/search/jql",
        params={"jql": jql, "maxResults": max_results, "fields": fields},
    )
    return {
        "issues": [
            {
                "id": i["id"],
                "key": i["key"],
                "summary": i.get("fields", {}).get("summary", ""),
                "status": i.get("fields", {}).get("status", {}).get("name", ""),
                "project": i.get("fields", {}).get("project", {}).get("key", ""),
            }
            for i in (data or {}).get("issues", [])
        ],
        "total": (data or {}).get("total", 0),
    }
