"""Priority endpoints."""

from fastapi import APIRouter
from ..jira_client import jira_request

router = APIRouter(prefix="/api/priorities", tags=["priorities"])


@router.get("")
async def list_priorities():
    """List all available priorities from Jira."""
    data = await jira_request("GET", "/priority")
    return [
        {
            "id": p["id"],
            "name": p["name"],
            "iconUrl": p.get("iconUrl", ""),
        }
        for p in (data or [])
    ]
