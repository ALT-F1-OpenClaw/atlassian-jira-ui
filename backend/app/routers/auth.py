"""OAuth 2.0 (3LO) authentication with Atlassian.

Multi-tenant isolation (ADR-021):
- OAuth tokens encrypted at rest (Fernet symmetric encryption)
- Sessions bound to IP + User-Agent fingerprint
- Cloud ID validated on every API call
- Settings write endpoints blocked in production for OAuth users
"""

import hashlib
import logging
import secrets
import time
from urllib.parse import urlencode

from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Request, Response, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse
import httpx
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)

from ..config import get_settings

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/auth", tags=["auth"])

# File-backed session store — survives container restarts
# Stored at /app/sessions.json (mount a volume for persistence)
from ..session_store import get_session_store


# ── Token encryption (Fernet) ───────────────────────────────────────

def _get_fernet() -> Fernet:
    """Derive Fernet key from APP_SECRET_KEY."""
    s = get_settings()
    # Derive a 32-byte key from the app secret using SHA-256
    import base64
    key = base64.urlsafe_b64encode(hashlib.sha256(s.app_secret_key.encode()).digest())
    return Fernet(key)


def _encrypt(value: str) -> str:
    """Encrypt a string value."""
    if not value:
        return ""
    return _get_fernet().encrypt(value.encode()).decode()


def _decrypt(value: str) -> str:
    """Decrypt an encrypted string value."""
    if not value:
        return ""
    try:
        return _get_fernet().decrypt(value.encode()).decode()
    except (InvalidToken, Exception) as e:
        logger.warning("Token decryption failed: %s", e)
        return ""


# ── Session fingerprinting ──────────────────────────────────────────

def _session_fingerprint(request: Request) -> str:
    """Generate a fingerprint from client IP + User-Agent to bind sessions."""
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    if "," in ip:
        ip = ip.split(",")[0].strip()
    ua = request.headers.get("user-agent", "")
    raw = f"{ip}:{ua}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


# Session store is accessed via get_session_store() — Redis or file-based

ATLASSIAN_AUTH_URL = "https://auth.atlassian.com/authorize"
ATLASSIAN_TOKEN_URL = "https://auth.atlassian.com/oauth/token"
ATLASSIAN_RESOURCES_URL = "https://api.atlassian.com/oauth/token/accessible-resources"
# Jira Platform + Jira Software scopes
ATLASSIAN_SCOPES = " ".join([
    # Jira Platform (classic)
    "read:jira-work",
    "write:jira-work",
    "manage:jira-project",
    "read:jira-user",
    # Jira Software (Agile — boards, sprints, epics)
    "read:board-scope:jira-software",
    "read:sprint:jira-software",
    "write:sprint:jira-software",
    "read:issue:jira-software",
    "read:epic:jira-software",
    # Refresh tokens
    "offline_access",
])

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
@limiter.limit(get_settings().rate_limit_auth)
async def login(request: Request):
    """Redirect user to Atlassian OAuth consent screen."""
    s = get_settings()
    if not s.atlassian_client_id or not s.atlassian_client_secret:
        raise HTTPException(status_code=500, detail="OAuth not configured. Set Client ID and Secret in Settings.")

    # Generate CSRF state token
    store = get_session_store()
    state = secrets.token_urlsafe(32)
    await store.set_state(state)

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
@limiter.limit(get_settings().rate_limit_auth)
async def callback(request: Request, code: str = "", state: str = "", error: str = ""):
    """Handle OAuth callback from Atlassian."""
    if error:
        return RedirectResponse(f"/?auth_error={error}")

    # Verify CSRF state
    store = get_session_store()
    if not await store.consume_state(state):
        return RedirectResponse("/?auth_error=invalid_state")

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

    # Create session — tokens encrypted at rest, fingerprinted to client
    session_id = secrets.token_urlsafe(48)
    session_data = {
        "access_token": _encrypt(access_token),
        "refresh_token": _encrypt(refresh_token),
        "expires_at": time.time() + expires_in,
        "cloud_id": cloud_id,
        "resources": resources,
        "fingerprint": _session_fingerprint(request),
        "user": {
            "accountId": user.get("accountId", ""),
            "displayName": user.get("displayName", ""),
            "emailAddress": user.get("emailAddress", ""),
            "avatarUrl": user.get("avatarUrls", {}).get("48x48", ""),
        },
    }
    await store.set(session_id, session_data)

    logger.info("OAuth callback success: user=%s cloud_id=%s resources=%d",
                user.get("displayName", "?"), cloud_id, len(resources))

    # Set session cookie and redirect to app
    response = RedirectResponse("/")
    # Note: secure=False because backend sees HTTP from Traefik (TLS terminated at proxy)
    # The browser still sees HTTPS — cookies are safe in transit
    response.set_cookie(
        SESSION_COOKIE,
        session_id,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=False,
    )
    return response


@router.get("/me")
async def get_current_user(request: Request):
    """Get the current authenticated user (if any)."""
    session = await get_session(request)  # Fingerprint-validated + decrypted
    session_id = request.cookies.get(SESSION_COOKIE) or ""
    if not session:
        return {"authenticated": False}

    # Check if token needs refresh
    if session["expires_at"] < time.time() + 60:  # Refresh 1 min before expiry
        refreshed = await _refresh_token(session, session_id)
        if not refreshed:
            store = get_session_store()
            await store.delete(session_id)
            return {"authenticated": False}

    return {
        "authenticated": True,
        "user": session["user"],
        "cloud_id": session["cloud_id"],
        "resources": session.get("resources", []),
    }


@router.post("/logout")
@limiter.limit(get_settings().rate_limit_auth)
async def logout(request: Request, response: Response):
    """Clear the session."""
    session_id = request.cookies.get(SESSION_COOKIE)
    if session_id:
        store = get_session_store()
        await store.delete(session_id)

    resp = JSONResponse({"status": "logged_out"})
    resp.delete_cookie(SESSION_COOKIE)
    return resp


@router.get("/sites")
async def list_sites(request: Request):
    """List Jira sites the user has access to."""
    session = await get_session(request)
    if not session:
        return {"sites": [], "current_cloud_id": ""}
    resources = session.get("resources", [])
    return {
        "sites": [
            {
                "id": r.get("id", ""),
                "name": r.get("name", ""),
                "url": r.get("url", ""),
                "avatarUrl": r.get("avatarUrl", ""),
                "scopes": r.get("scopes", []),
            }
            for r in resources
        ],
        "current_cloud_id": session.get("cloud_id", ""),
    }


@router.post("/select-site")
@limiter.limit(get_settings().rate_limit_auth)
async def select_site(request: Request):
    """Switch to a different Jira site."""
    session = await get_session(request)  # Decrypted copy
    session_id = request.cookies.get(SESSION_COOKIE) or ""
    if not session or session_id not in _sessions:
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = await request.json()
    cloud_id = body.get("cloud_id", "")
    if not cloud_id:
        raise HTTPException(status_code=400, detail="cloud_id is required")

    # Verify the site is in accessible resources
    resources = session.get("resources", [])
    site = next((r for r in resources if r.get("id") == cloud_id), None)
    if not site:
        raise HTTPException(status_code=403, detail="Site not accessible")

    # Update the persistent session with new cloud_id
    store = get_session_store()
    updates: dict = {"cloud_id": cloud_id}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            user_resp = await client.get(
                f"https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/myself",
                headers={"Authorization": f"Bearer {session['access_token']}"},
            )
            if user_resp.status_code == 200:
                user = user_resp.json()
                updates["user"] = {
                    "accountId": user.get("accountId", ""),
                    "displayName": user.get("displayName", ""),
                    "emailAddress": user.get("emailAddress", ""),
                    "avatarUrl": user.get("avatarUrls", {}).get("48x48", ""),
                }
    except Exception:
        pass

    await store.update(session_id, updates)
    logger.info("Site switched to cloud_id=%s (%s)", cloud_id, site.get("name", "?"))
    return {"status": "switched", "cloud_id": cloud_id, "site_name": site.get("name", "")}


async def _refresh_token(session: dict, session_id: str | None = None) -> bool:
    """Refresh an expired access token.

    Args:
        session: Decrypted session dict (from get_session).
        session_id: Session key in _sessions — if provided, encrypts and
                    writes new tokens back to the persistent store.
    """
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
        new_access = tokens["access_token"]
        new_refresh = tokens.get("refresh_token", session["refresh_token"])
        new_expires = time.time() + tokens.get("expires_in", 3600)

        # Update the decrypted session (in-memory for this request)
        session["access_token"] = new_access
        session["refresh_token"] = new_refresh
        session["expires_at"] = new_expires

        # Persist encrypted tokens to store
        if session_id:
            store = get_session_store()
            await store.update(session_id, {
                "access_token": _encrypt(new_access),
                "refresh_token": _encrypt(new_refresh),
                "expires_at": new_expires,
            })
        return True


async def get_session(request: Request) -> dict | None:
    """Get the current session with fingerprint validation.

    Returns a copy with decrypted tokens for in-memory use.
    Rejects sessions where the client fingerprint doesn't match
    (prevents stolen cookie reuse from a different IP/browser).
    """
    session_id = request.cookies.get(SESSION_COOKIE)
    if not session_id:
        return None

    store = get_session_store()
    session = await store.get(session_id)
    if session is None:
        return None

    # Fingerprint validation — reject if client changed
    stored_fp = session.get("fingerprint", "")
    if stored_fp and stored_fp != _session_fingerprint(request):
        logger.warning("Session fingerprint mismatch for user=%s (possible stolen cookie)",
                       session.get("user", {}).get("displayName", "?"))
        # Don't delete — could be a legitimate IP change. Just reject this request.
        return None

    # Return a copy with decrypted tokens (never expose encrypted values)
    return {
        **session,
        "access_token": _decrypt(session.get("access_token", "")),
        "refresh_token": _decrypt(session.get("refresh_token", "")),
    }


async def get_jira_auth(request: Request) -> tuple[str | None, str | None]:
    """Get OAuth token + cloud_id from session, or (None, None) for Basic Auth fallback."""
    session = await get_session(request)
    if not session:
        return None, None
    return session.get("access_token"), session.get("cloud_id")
