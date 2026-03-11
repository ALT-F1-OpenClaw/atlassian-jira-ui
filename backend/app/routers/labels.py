"""Label endpoints."""

from fastapi import APIRouter
from ..jira_client import jira_request

router = APIRouter(prefix="/api/labels", tags=["labels"])


@router.get("")
async def list_labels():
    """List all available labels from Jira."""
    data = await jira_request("GET", "/label")
    return (data or {}).get("values", [])
