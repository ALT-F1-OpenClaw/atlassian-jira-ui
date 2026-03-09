"""Project endpoints."""

from fastapi import APIRouter
from ..jira_client import jira_request

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


@router.get("/{key}")
async def get_project(key: str):
    """Get project details."""
    return await jira_request("GET", f"/project/{key}")
