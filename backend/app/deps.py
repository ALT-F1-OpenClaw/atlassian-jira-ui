"""Authentication strategy resolver + Jira API dependency.

Implements the Strategy Pattern for dual auth:
- API Token (Basic Auth): shared credentials from .env
- OAuth 2.0 (Bearer Token): per-user session tokens

Both can be enabled/disabled independently via AUTH_API_TOKEN_ENABLED
and AUTH_OAUTH_ENABLED environment variables.

Resolution order:
1. If OAuth enabled and user has active session → use Bearer token
2. If API Token enabled → use Basic Auth from .env
3. Neither → raise 401 Unauthorized
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from fastapi import Request, HTTPException
from .config import get_settings
from .jira_client import jira_request as _jira_request

logger = logging.getLogger(__name__)


# ── Auth Result ──────────────────────────────────────────────────────

@dataclass
class JiraAuth:
    """Resolved authentication credentials for Jira API calls."""
    oauth_token: str | None = None
    cloud_id: str | None = None
    method: str = "none"  # "basic", "oauth", "none"


# ── Strategy Interface ───────────────────────────────────────────────

class AuthStrategy(ABC):
    """Abstract auth strategy."""

    @abstractmethod
    def is_enabled(self) -> bool:
        """Check if this strategy is enabled."""
        ...

    @abstractmethod
    def resolve(self, request: Request) -> JiraAuth | None:
        """Try to resolve auth from the request. Returns None if not applicable."""
        ...


# ── Concrete Strategies ─────────────────────────────────────────────

class OAuthStrategy(AuthStrategy):
    """OAuth 2.0 Bearer Token strategy — per-user sessions."""

    def is_enabled(self) -> bool:
        s = get_settings()
        return s.auth_oauth_enabled and bool(s.atlassian_client_id and s.atlassian_client_secret)

    def resolve(self, request: Request) -> JiraAuth | None:
        if not self.is_enabled():
            return None
        from .routers.auth import get_session
        session = get_session(request)
        if not session:
            return None
        token = session.get("access_token")
        cloud_id = session.get("cloud_id")
        if token and cloud_id:
            return JiraAuth(oauth_token=token, cloud_id=cloud_id, method="oauth")
        return None


class ApiTokenStrategy(AuthStrategy):
    """API Token Basic Auth strategy — shared credentials from .env.
    Completely disabled in production (APP_ENV=production)."""

    def is_enabled(self) -> bool:
        s = get_settings()
        if s.app_env == "production":
            return False  # Never available in production
        return s.auth_api_token_enabled and bool(s.jira_api_token)

    def resolve(self, request: Request) -> JiraAuth | None:
        if not self.is_enabled():
            return None
        # Basic Auth uses None/None — jira_client falls back to .env credentials
        return JiraAuth(oauth_token=None, cloud_id=None, method="basic")


# ── Auth Resolver ────────────────────────────────────────────────────

# Strategy chain: OAuth first (per-user), then API Token (shared fallback)
_strategies: list[AuthStrategy] = [
    OAuthStrategy(),
    ApiTokenStrategy(),
]


def resolve_auth(request: Request) -> JiraAuth:
    """Resolve authentication using the strategy chain.

    Returns the first successful auth, or raises 401 if none work.
    """
    for strategy in _strategies:
        auth = strategy.resolve(request)
        if auth is not None:
            logger.debug("Auth resolved via %s", auth.method)
            return auth

    # Debug: log what cookies we received
    cookies = dict(request.cookies)
    logger.warning("No auth resolved. Cookies: %s", list(cookies.keys()))

    # No strategy resolved — check what's configured
    s = get_settings()
    if not s.auth_api_token_enabled and not s.auth_oauth_enabled:
        raise HTTPException(status_code=401, detail="No authentication method is enabled. Enable API Token or OAuth in Settings.")
    if s.auth_oauth_enabled and not s.auth_api_token_enabled:
        raise HTTPException(status_code=401, detail="OAuth is enabled but you are not logged in. Click Login in the header.")
    raise HTTPException(status_code=401, detail="Authentication required.")


# ── Authenticated Jira Request ───────────────────────────────────────

async def authed_jira_request(
    request: Request,
    method: str,
    path: str,
    *,
    base: str | None = None,
    params: dict | None = None,
    json: dict | None = None,
) -> dict | list | None:
    """Jira API request using the resolved auth strategy.

    Automatically picks OAuth (per-user) or Basic Auth (shared)
    based on session state and feature toggles.
    Auto-refreshes expired OAuth tokens before making the call.
    """
    auth = resolve_auth(request)

    # Auto-refresh expired OAuth tokens
    if auth.method == "oauth":
        import time
        from .routers.auth import get_session, _refresh_token, SESSION_COOKIE
        session = get_session(request)
        session_id = request.cookies.get(SESSION_COOKIE) or ""
        if session and session.get("expires_at", 0) < time.time() + 120:
            logger.info("OAuth token expired — attempting refresh")
            refreshed = await _refresh_token(session, session_id)
            if refreshed:
                auth = JiraAuth(
                    oauth_token=session["access_token"],
                    cloud_id=session.get("cloud_id"),
                    method="oauth",
                )
                logger.info("OAuth token refreshed successfully")
            else:
                logger.warning("OAuth token refresh failed — token may be revoked")

    return await _jira_request(
        method, path,
        base=base, params=params, json=json,
        oauth_token=auth.oauth_token, cloud_id=auth.cloud_id,
    )


# ── Auth Status (for frontend) ──────────────────────────────────────

def get_auth_status(request: Request) -> dict:
    """Get current auth configuration status for the Settings page."""
    s = get_settings()
    oauth_strategy = OAuthStrategy()
    token_strategy = ApiTokenStrategy()

    from .routers.auth import get_session
    session = get_session(request)

    return {
        "api_token": {
            "enabled": s.auth_api_token_enabled,
            "configured": bool(s.jira_api_token),
        },
        "oauth": {
            "enabled": s.auth_oauth_enabled,
            "configured": oauth_strategy.is_enabled(),
            "logged_in": session is not None,
        },
        "active_method": resolve_auth(request).method if any(st.resolve(request) for st in _strategies) else "none",
    }
