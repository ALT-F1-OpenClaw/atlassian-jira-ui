"""Async Jira API client with rate-limit retry."""

import asyncio
import logging
import httpx
from base64 import b64encode
from .config import get_settings

logger = logging.getLogger(__name__)

_client: httpx.AsyncClient | None = None


def _auth_header() -> str:
    s = get_settings()
    token = b64encode(f"{s.jira_email}:{s.jira_api_token}".encode()).decode()
    return f"Basic {token}"


async def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=30.0,
            headers={
                "Authorization": _auth_header(),
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        )
    return _client


async def jira_request(
    method: str,
    path: str,
    *,
    base: str | None = None,
    params: dict | None = None,
    json: dict | None = None,
    retries: int = 3,
    oauth_token: str | None = None,
    cloud_id: str | None = None,
) -> dict | list | None:
    """Make an authenticated Jira API request with rate-limit retry.

    Args:
        method: HTTP method (GET, POST, PUT, PATCH, DELETE)
        path: API path (e.g. /search/jql)
        base: Override base URL (default: REST API v3, use 'agile' for Agile API)
        params: Query parameters
        json: JSON body
        retries: Max retry attempts on 429
        oauth_token: OAuth 2.0 access token (overrides Basic Auth when provided)
        cloud_id: Atlassian Cloud ID (required with oauth_token)
    """
    s = get_settings()

    # OAuth 2.0: use Atlassian API gateway with cloud_id
    if oauth_token and cloud_id:
        if base == "agile":
            url = f"https://api.atlassian.com/ex/jira/{cloud_id}/rest/agile/1.0{path}"
        else:
            url = f"https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3{path}"
        headers = {
            "Authorization": f"Bearer {oauth_token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
    else:
        # Fallback: Basic Auth from .env
        if base == "agile":
            url = f"{s.jira_agile_url}{path}"
        else:
            url = f"{s.jira_base_url}{path}"
        headers = None  # Uses default client headers (Basic Auth)

    client = await get_client()

    for attempt in range(1, retries + 1):
        response = await client.request(method, url, params=params, json=json, headers=headers)

        if response.status_code == 429:
            retry_after = int(response.headers.get("retry-after", "5"))
            backoff = retry_after * attempt
            if attempt < retries:
                await asyncio.sleep(backoff)
                continue

        if response.status_code == 204:
            return None

        if response.status_code >= 400:
            body = response.text
            logger.error("Jira API error %s %s: %s %s", method, path, response.status_code, body)
            raise httpx.HTTPStatusError(
                f"Jira API error {response.status_code}: {body}",
                request=response.request,
                response=response,
            )
        return response.json()

    return None


async def close_client():
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None
