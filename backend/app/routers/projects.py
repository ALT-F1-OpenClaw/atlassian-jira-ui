"""Project endpoints."""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from ..jira_client import jira_request


class CreateProjectRequest(BaseModel):
    """Request body for creating a Jira project."""
    key: str
    name: str
    project_type_key: str = "software"  # software, service_desk, business
    lead_account_id: str | None = None
    description: str = ""

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("")
async def list_projects():
    """List all accessible projects."""
    data = await jira_request("GET", "/project", params={"expand": "description"})
    return [
        {
            "id": p["id"],
            "key": p["key"],
            "name": p["name"],
            "avatarUrl": p.get("avatarUrls", {}).get("48x48"),
            "style": p.get("style"),
            "description": p.get("description", ""),
        }
        for p in (data or [])
    ]


@router.post("")
async def create_project(body: CreateProjectRequest):
    """Create a new Jira project."""
    payload: dict = {
        "key": body.key.upper(),
        "name": body.name,
        "projectTypeKey": body.project_type_key,
        "description": body.description,
    }
    if body.lead_account_id:
        payload["leadAccountId"] = body.lead_account_id
    result = await jira_request("POST", "/project", json=payload)
    return {"status": "created", "project": result}


@router.get("/{key}")
async def get_project(key: str):
    """Get project details."""
    return await jira_request("GET", f"/project/{key}")


@router.get("/{key}/members")
async def list_project_members(key: str, max_results: int = Query(default=50, le=1000)):
    """List users assignable to issues in a project."""
    data = await jira_request(
        "GET",
        "/user/assignable/search",
        params={"project": key, "maxResults": max_results},
    )
    return [
        {
            "accountId": u.get("accountId", ""),
            "displayName": u.get("displayName", ""),
            "avatarUrl": u.get("avatarUrls", {}).get("48x48", ""),
            "active": u.get("active", True),
        }
        for u in (data or [])
        if u.get("accountType") == "atlassian"
    ]
