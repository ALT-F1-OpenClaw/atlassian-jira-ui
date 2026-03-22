# ADR-017: Dual Auth — Strategy Pattern with Production Mode

**Status**: Accepted
**Date**: 2026-03-22
**Deciders**: Abdelkrim BOUJRAF

## Context

The app needs to support two authentication methods simultaneously:
- **API Token** (Basic Auth): shared credentials, single-user, for development/self-hosted
- **OAuth 2.0** (3LO): per-user login, multi-tenant, for production

In production, API Token must be **completely disabled** — not just hidden, but removed from the authentication chain entirely. No fallback from OAuth to API Token.

## Decision

Implement the **Strategy Pattern** with an environment-based gate:

### Auth Strategies

```python
class AuthStrategy(ABC):
    def is_enabled(self) -> bool: ...
    def resolve(self, request) -> JiraAuth | None: ...

class OAuthStrategy(AuthStrategy): ...      # Bearer token from session
class ApiTokenStrategy(AuthStrategy): ...   # Basic Auth from .env
```

### Resolution Chain

```
1. OAuthStrategy — check session cookie → Bearer token
2. ApiTokenStrategy — check .env → Basic Auth (BLOCKED in production)
3. Neither → 401 Unauthorized
```

### APP_ENV Values

| Value | API Token | OAuth | Use Case |
|-------|-----------|-------|----------|
| `development` | ✅ Available | ✅ Available | Local dev, self-hosted |
| `staging` | ✅ Available | ✅ Available | Pre-production testing |
| `production` | ❌ Disabled | ✅ Only method | Customer-facing |

### Production Behavior

- `ApiTokenStrategy.is_enabled()` returns `False` when `APP_ENV=production`
- Settings API returns `auth_api_token_enabled=false`
- Frontend hides API Token section and toggle entirely
- No fallback — expired OAuth session → login screen, not API Token

### Token Lifecycle

- OAuth tokens auto-refresh via refresh_token before API calls
- Sessions persisted to `sessions.json` (survives container restarts)
- CSRF state tokens persisted to `oauth_states.json`

## Consequences

**Good**:
- Clean separation of auth methods via Strategy Pattern
- Production guaranteed to never use shared credentials
- Both methods toggleable independently via Settings UI (in dev/staging)
- Auto-refresh keeps sessions alive without user intervention

**Bad**:
- In-memory → file-based session store is not suitable for horizontal scaling (need Redis/DB)
- Refresh token can be revoked by Atlassian, requiring re-login
- Production users see no fallback — if OAuth is down, app is inaccessible

## Related

- ADR-011: SearchableSelect custom dropdown (Settings UI)
- ADR-015: No server-side Jira data storage
- Roadmap #30: OAuth 2.0 (3LO)
- Roadmap #54: Production mode
