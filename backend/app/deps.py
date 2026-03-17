"""Shared FastAPI dependencies."""

from fastapi import Request
from .jira_client import jira_request as _jira_request


def _get_auth(request: Request) -> tuple[str | None, str | None]:
    """Extract OAuth token + cloud_id from session cookie."""
    from .routers.auth import get_session
    session = get_session(request)
    if not session:
        return None, None
    return session.get("access_token"), session.get("cloud_id")


async def authed_jira_request(
    request: Request,
    method: str,
    path: str,
    *,
    base: str | None = None,
    params: dict | None = None,
    json: dict | None = None,
) -> dict | list | None:
    """Jira API request using OAuth session if available, else Basic Auth.

    Drop-in replacement for jira_request() that auto-detects auth method.
    """
    token, cloud_id = _get_auth(request)
    return await _jira_request(
        method, path,
        base=base, params=params, json=json,
        oauth_token=token, cloud_id=cloud_id,
    )
