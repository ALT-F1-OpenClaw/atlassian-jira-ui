"""Priority endpoints."""

from fastapi import APIRouter, Request
from ..jira_client import jira_request
from ..deps import authed_jira_request

router = APIRouter(prefix="/api/priorities", tags=["priorities"])


@router.get("")
async def list_priorities(request: Request):
    """List all available priorities from Jira."""
    data = await authed_jira_request(request, "GET", "/priority")
    return [
        {
            "id": p["id"],
            "name": p["name"],
            "iconUrl": p.get("iconUrl", ""),
        }
        for p in (data or [])
    ]
