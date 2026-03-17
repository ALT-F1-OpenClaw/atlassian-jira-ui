"""Label endpoints."""

from fastapi import APIRouter, Request
from ..jira_client import jira_request
from ..deps import authed_jira_request

router = APIRouter(prefix="/api/labels", tags=["labels"])


@router.get("")
async def list_labels(request: Request):
    """List all available labels from Jira."""
    data = await authed_jira_request(request, "GET", "/label")
    return (data or {}).get("values", [])
