"""OAuth 2.0 (3LO) authentication with Atlassian."""

import secrets
import time
from urllib.parse import urlencode

from fastapi import APIRouter, Request, Response, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse
import httpx

from ..config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory session store (replace with Redis/DB for production)
# Key: session_id → { access_token, refresh_token, expires_at, cloud_id, user }
_sessions: dict[str, dict] = {}

# CSRF state tokens (temporary, expire after 10 min)
_oauth_states: dict[str, float] = {}

ATLASSIAN_AUTH_URL = "https://auth.atlassian.com/authorize"
ATLASSIAN_TOKEN_URL = "https://auth.atlassian.com/oauth/token"
ATLASSIAN_RESOURCES_URL = "https://api.atlassian.com/oauth/token/accessible-resources"
ATLASSIAN_SCOPES = "read:jira-work write:jira-work read:jira-user offline_access"

SESSION_COOKIE = "jira_ui_session"
SESSION_MAX_AGE = 7 * 24 * 3600  # 7 days


def _get_callback_url(request: Request) -> str:
    """Build callback URL from request origin."""
    # Use X-Forwarded headers if behind proxy (Traefik), fall back to Host header
    proto = request.headers.get("x-forwarded-proto", "https")
    host = (
        request.headers.get("x-forwarded-host")
        or request.headers.get("host")
        or request.url.netloc
    )
    return f"{proto}://{host}/auth/callback"


@router.get("/login")
async def login(request: Request):
    """Redirect user to Atlassian OAuth consent screen."""
    s = get_settings()
    if not s.atlassian_client_id or not s.atlassian_client_secret:
        raise HTTPException(status_code=500, detail="OAuth not configured. Set Client ID and Secret in Settings.")

    # Generate CSRF state token
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = time.time()

    # Clean expired states (older than 10 min)
    now = time.time()
    expired = [k for k, v in _oauth_states.items() if now - v > 600]
    for k in expired:
        del _oauth_states[k]

    params = {
        "audience": "api.atlassian.com",
        "client_id": s.atlassian_client_id,
        "scope": ATLASSIAN_SCOPES,
        "redirect_uri": _get_callback_url(request),
        "state": state,
        "response_type": "code",
        "prompt": "consent",
    }
    return RedirectResponse(f"{ATLASSIAN_AUTH_URL}?{urlencode(params)}")


@router.get("/callback")
async def callback(request: Request, code: str = "", state: str = "", error: str = ""):
    """Handle OAuth callback from Atlassian."""
    if error:
        return RedirectResponse(f"/?auth_error={error}")

    # Verify CSRF state
    if state not in _oauth_states:
        return RedirectResponse("/?auth_error=invalid_state")
    del _oauth_states[state]

    s = get_settings()

    # Exchange code for tokens
    async with httpx.AsyncClient(timeout=15.0) as client:
        token_resp = await client.post(
            ATLASSIAN_TOKEN_URL,
            json={
                "grant_type": "authorization_code",
                "client_id": s.atlassian_client_id,
                "client_secret": s.atlassian_client_secret,
                "code": code,
                "redirect_uri": _get_callback_url(request),
            },
        )

        if token_resp.status_code != 200:
            detail = token_resp.json().get("error_description", token_resp.text)
            return RedirectResponse(f"/?auth_error=token_exchange_failed&detail={detail}")

        tokens = token_resp.json()
        access_token = tokens["access_token"]
        refresh_token = tokens.get("refresh_token", "")
        expires_in = tokens.get("expires_in", 3600)

        # Get accessible resources (Jira sites)
        resources_resp = await client.get(
            ATLASSIAN_RESOURCES_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resources = resources_resp.json() if resources_resp.status_code == 200 else []

        # Get user info
        if resources:
            cloud_id = resources[0]["id"]
            user_resp = await client.get(
                f"https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/myself",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            user = user_resp.json() if user_resp.status_code == 200 else {}
        else:
            cloud_id = ""
            user = {}

    # Create session
    session_id = secrets.token_urlsafe(48)
    _sessions[session_id] = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_at": time.time() + expires_in,
        "cloud_id": cloud_id,
        "resources": resources,
        "user": {
            "accountId": user.get("accountId", ""),
            "displayName": user.get("displayName", ""),
            "emailAddress": user.get("emailAddress", ""),
            "avatarUrl": user.get("avatarUrls", {}).get("48x48", ""),
        },
    }

    # Set session cookie and redirect to app
    response = RedirectResponse("/")
    response.set_cookie(
        SESSION_COOKIE,
        session_id,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=True,
    )
    return response


@router.get("/me")
async def get_current_user(request: Request):
    """Get the current authenticated user (if any)."""
    session_id = request.cookies.get(SESSION_COOKIE)
    if not session_id or session_id not in _sessions:
        return {"authenticated": False}

    session = _sessions[session_id]

    # Check if token needs refresh
    if session["expires_at"] < time.time() + 60:  # Refresh 1 min before expiry
        refreshed = await _refresh_token(session)
        if not refreshed:
            del _sessions[session_id]
            return {"authenticated": False}

    return {
        "authenticated": True,
        "user": session["user"],
        "cloud_id": session["cloud_id"],
        "resources": session.get("resources", []),
    }


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Clear the session."""
    session_id = request.cookies.get(SESSION_COOKIE)
    if session_id and session_id in _sessions:
        del _sessions[session_id]

    resp = JSONResponse({"status": "logged_out"})
    resp.delete_cookie(SESSION_COOKIE)
    return resp


async def _refresh_token(session: dict) -> bool:
    """Refresh an expired access token."""
    s = get_settings()
    if not session.get("refresh_token"):
        return False

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            ATLASSIAN_TOKEN_URL,
            json={
                "grant_type": "refresh_token",
                "client_id": s.atlassian_client_id,
                "client_secret": s.atlassian_client_secret,
                "refresh_token": session["refresh_token"],
            },
        )
        if resp.status_code != 200:
            return False

        tokens = resp.json()
        session["access_token"] = tokens["access_token"]
        session["refresh_token"] = tokens.get("refresh_token", session["refresh_token"])
        session["expires_at"] = time.time() + tokens.get("expires_in", 3600)
        return True


def get_session(request: Request) -> dict | None:
    """Get the current session (for use by other routers)."""
    session_id = request.cookies.get(SESSION_COOKIE)
    if not session_id or session_id not in _sessions:
        return None
    return _sessions[session_id]


def get_jira_auth(request: Request) -> tuple[str | None, str | None]:
    """Get OAuth token + cloud_id from session, or (None, None) for Basic Auth fallback.

    Usage in routers:
        oauth_token, cloud_id = get_jira_auth(request)
        await jira_request("GET", "/path", oauth_token=oauth_token, cloud_id=cloud_id)
    """
    session = get_session(request)
    if not session:
        return None, None
    return session.get("access_token"), session.get("cloud_id")
