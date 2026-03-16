"""Settings endpoints — view/update Jira connection config."""

import os
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

from ..config import get_settings

router = APIRouter(prefix="/api/settings", tags=["settings"])

# Find the .env file (same dir as backend/)
_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"


class JiraConnection(BaseModel):
    """Jira connection settings (safe to expose)."""
    jira_host: str
    jira_email: str
    jira_api_token_masked: str  # last 4 chars only


class UpdateJiraConnection(BaseModel):
    """Update Jira connection settings."""
    jira_host: str | None = None
    jira_email: str | None = None
    jira_api_token: str | None = None


class TestConnectionResult(BaseModel):
    """Result of testing Jira connection."""
    success: bool
    message: str
    server_title: str | None = None
    user_display_name: str | None = None


@router.get("")
async def get_settings_view():
    """Get current settings (token masked)."""
    s = get_settings()
    token = s.jira_api_token
    masked = f"••••{token[-4:]}" if len(token) > 4 else "••••"
    return {
        "jira_host": s.jira_host,
        "jira_email": s.jira_email,
        "jira_api_token_masked": masked,
    }


@router.post("/test")
async def test_connection(body: UpdateJiraConnection | None = None):
    """Test Jira connection with current or provided credentials."""
    s = get_settings()
    host = (body.jira_host if body and body.jira_host else s.jira_host).rstrip("/")
    email = body.jira_email if body and body.jira_email else s.jira_email
    token = body.jira_api_token if body and body.jira_api_token else s.jira_api_token

    if not host.startswith("http"):
        host = f"https://{host}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Test with /myself endpoint
            resp = await client.get(
                f"{host}/rest/api/3/myself",
                auth=(email, token),
            )
            if resp.status_code == 200:
                data = resp.json()
                # Also get server info
                server_resp = await client.get(
                    f"{host}/rest/api/3/serverInfo",
                    auth=(email, token),
                )
                server_title = ""
                if server_resp.status_code == 200:
                    server_title = server_resp.json().get("serverTitle", "")
                return TestConnectionResult(
                    success=True,
                    message="Connection successful",
                    server_title=server_title,
                    user_display_name=data.get("displayName", ""),
                )
            elif resp.status_code == 401:
                return TestConnectionResult(
                    success=False,
                    message="Authentication failed — check email and API token",
                )
            elif resp.status_code == 403:
                return TestConnectionResult(
                    success=False,
                    message="Access forbidden — check API token permissions",
                )
            else:
                return TestConnectionResult(
                    success=False,
                    message=f"Unexpected response: {resp.status_code}",
                )
    except httpx.ConnectError:
        return TestConnectionResult(
            success=False,
            message=f"Cannot connect to {host} — check the URL",
        )
    except Exception as e:
        return TestConnectionResult(
            success=False,
            message=f"Connection error: {str(e)}",
        )


@router.patch("")
async def update_settings(body: UpdateJiraConnection):
    """Update Jira connection settings. Writes to .env file and reloads config."""
    if not _ENV_PATH.exists():
        raise HTTPException(status_code=500, detail=".env file not found")

    # Read current .env
    env_lines = _ENV_PATH.read_text().splitlines()
    env_dict: dict[str, str] = {}
    for line in env_lines:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            env_dict[key.strip()] = value.strip()

    # Update only provided fields
    changed = []
    if body.jira_host is not None:
        env_dict["JIRA_HOST"] = body.jira_host
        changed.append("JIRA_HOST")
    if body.jira_email is not None:
        env_dict["JIRA_EMAIL"] = body.jira_email
        changed.append("JIRA_EMAIL")
    if body.jira_api_token is not None:
        env_dict["JIRA_API_TOKEN"] = body.jira_api_token
        changed.append("JIRA_API_TOKEN")

    if not changed:
        return {"status": "no_changes", "changed": []}

    # Write back .env
    new_content = "\n".join(f"{k}={v}" for k, v in env_dict.items()) + "\n"
    _ENV_PATH.write_text(new_content)

    # Clear cached settings so next request picks up new values
    get_settings.cache_clear()

    # Update environment variables for current process
    for key in changed:
        os.environ[key] = env_dict[key]

    return {"status": "updated", "changed": changed}
