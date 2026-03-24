# ADR-022: Redis Session Store

**Status**: Accepted
**Date**: 2026-03-24
**Deciders**: Abdelkrim BOUJRAF

## Context

Sessions were stored in a Python dict backed by `sessions.json` on disk. This approach:

- Doesn't survive container restarts without volume mounts
- Can't scale to multiple backend workers (each has its own dict)
- Requires file I/O on every write
- Has no built-in TTL — expiry checked manually

## Decision

Introduce an abstract `SessionStore` interface with two implementations:

### Architecture

```
              ┌──────────────────┐
              │   SessionStore   │  (ABC)
              │  get/set/delete  │
              │  update/states   │
              └────────┬─────────┘
                       │
          ┌────────────┼────────────┐
          ▼                         ▼
┌──────────────────┐    ┌──────────────────┐
│ FileSessionStore │    │ RedisSessionStore │
│  sessions.json   │    │  redis[hiredis]   │
│  (fallback)      │    │  (preferred)      │
└──────────────────┘    └──────────────────┘
```

### Auto-detection

```python
# If REDIS_URL is set → Redis
# Otherwise → file-based (backward compatible)
REDIS_URL=redis://redis:6379/0
```

### Redis Key Schema

| Key Pattern | TTL | Content |
|-------------|-----|---------|
| `jira_ui:session:{id}` | 7 days | JSON (encrypted tokens, user, fingerprint, cloud_id) |
| `jira_ui:oauth_state:{state}` | 10 min | "1" (existence check) |

### Session Store Interface

```python
class SessionStore(ABC):
    async def get(session_id) -> dict | None
    async def set(session_id, data, ttl=7d)
    async def delete(session_id)
    async def update(session_id, updates)  # Partial merge
    async def set_state(state)             # OAuth CSRF
    async def consume_state(state) -> bool # Check + delete
```

### Breaking Changes

- `get_session()` and `get_jira_auth()` are now `async`
- `resolve_auth()` is now `async`
- All auth strategy `resolve()` methods are now `async`
- `get_auth_status()` is now `async`

These changes are internal — no API contract changes for the frontend.

## Consequences

**Good**:
- Sessions survive container restarts without volume mounts
- Multiple workers/containers share sessions via Redis
- Automatic TTL expiry (Redis handles it — no manual cleanup)
- ~10x faster than file I/O for read/write
- Rate limiting can also use Redis backend later
- Backward compatible — no Redis = file-based fallback

**Bad**:
- New dependency (`redis[hiredis]`)
- Requires Redis container in Docker Compose for production
- All session access is now async (minor code complexity increase)
- Redis is a new point of failure (mitigated by file fallback)

## Related

- ADR-021: Multi-Tenant Data Isolation (encryption stays)
- ADR-020: Per-IP Rate Limiting (can share Redis backend)
- Roadmap #59: Redis session store
