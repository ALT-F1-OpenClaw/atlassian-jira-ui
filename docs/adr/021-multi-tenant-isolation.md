# ADR-021: Multi-Tenant Data Isolation

**Status**: Accepted
**Date**: 2026-03-24
**Deciders**: Abdelkrim BOUJRAF

## Context

As the app moves to public SaaS with OAuth multi-user support, each user's Jira OAuth tokens must be isolated from other users. Without proper isolation:

- A stolen session cookie could be used from a different device to access another user's Jira
- OAuth tokens stored in plaintext in `sessions.json` could be read by anyone with file access
- The Settings endpoint could allow OAuth users to modify shared server configuration
- No mechanism prevents cross-tenant API calls using another user's cloud_id

## Decision

Implement four layers of multi-tenant isolation:

### 1. Token Encryption at Rest (Fernet)

OAuth access tokens and refresh tokens are encrypted before being persisted to `sessions.json` using Fernet symmetric encryption.

```python
# Key derived from APP_SECRET_KEY via SHA-256
key = base64.urlsafe_b64encode(hashlib.sha256(app_secret_key.encode()).digest())
fernet = Fernet(key)

# Stored encrypted
session["access_token"] = fernet.encrypt(token.encode()).decode()

# Decrypted only in-memory when needed
token = fernet.decrypt(session["access_token"].encode()).decode()
```

**Key rotation**: changing `APP_SECRET_KEY` invalidates all existing sessions (users must re-login). This is acceptable and provides a clean revocation mechanism.

### 2. Session Fingerprinting

Each session is bound to the client's IP address and User-Agent at creation time:

```python
fingerprint = sha256(f"{client_ip}:{user_agent}").hexdigest()[:16]
```

On every request, the fingerprint is validated. If it doesn't match (different IP or browser), the session is rejected (returns `None`). This prevents stolen cookie reuse from a different device/location.

**Trade-off**: Users behind dynamic IPs or switching networks will be logged out. This is acceptable for security — they simply re-authenticate.

### 3. Settings Endpoint Lockdown

In production mode (`APP_ENV=production`):
- `PATCH /api/settings` returns **403 Forbidden** — OAuth users cannot modify server config
- Settings view (`GET /api/settings`) still works (returns masked secrets)
- API Token auth is already disabled (ADR-017)

### 4. Cloud ID Scoping

Every Jira API call goes through `authed_jira_request()` which resolves auth via the Strategy Pattern. OAuth requests always use the session's own `cloud_id`:

```
Request → resolve_auth() → OAuthStrategy → session.cloud_id → Atlassian API gateway
```

Users can only switch to cloud_ids present in their own `accessible-resources` list (validated by `POST /auth/select-site`). There is no way to inject an arbitrary cloud_id.

### What's NOT Encrypted

- `cloud_id`: Not a secret (it's the Atlassian tenant identifier, visible in URLs)
- `user` metadata: Display name, email, avatar URL — not sensitive
- `resources`: List of accessible Jira sites — not sensitive

Only `access_token` and `refresh_token` are encrypted.

## Implementation Files

| File | Changes |
|------|---------|
| `backend/app/routers/auth.py` | `_encrypt()`, `_decrypt()`, `_session_fingerprint()`, updated `get_session()` with validation |
| `backend/app/deps.py` | Pass `session_id` to `_refresh_token()` for encrypted write-back |
| `backend/app/routers/settings.py` | Block `PATCH` in production mode |
| `backend/requirements.txt` | Explicit `cryptography>=43.0.0` dependency |

## Consequences

**Good**:
- OAuth tokens encrypted at rest — file system compromise doesn't leak tokens
- Stolen cookies can't be reused from different IP/browser
- Production settings immutable via API
- Cloud ID scoping prevents cross-tenant access
- Key rotation (changing APP_SECRET_KEY) cleanly revokes all sessions

**Bad**:
- Session fingerprinting may cause false-positive logouts on dynamic IPs / VPNs
- Encryption adds ~1ms per request (negligible)
- Existing sessions from before this change will fail to decrypt (users re-login once)
- In-memory session store still not horizontally scalable (#59 Redis needed)

## Related

- ADR-017: Dual Auth — Strategy Pattern
- ADR-020: Per-IP Rate Limiting
- Roadmap #36: Multi-tenant data isolation
- Roadmap #59: Redis session store (future)
