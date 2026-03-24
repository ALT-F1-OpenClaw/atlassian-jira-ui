# ADR-020: Per-IP Rate Limiting & Abuse Protection

**Status**: Accepted
**Date**: 2026-03-24
**Deciders**: Abdelkrim BOUJRAF

## Context

As the app moves toward public SaaS (#35), all API endpoints are exposed to the internet. Without rate limiting, a single bad actor (or misconfigured client) could:

- Exhaust Jira API quota for all users (Jira Cloud enforces per-tenant rate limits)
- Overload the backend with expensive JQL queries
- Brute-force the OAuth login/callback flow
- Degrade service for legitimate users

## Decision

Implement **tiered per-IP rate limiting** using `slowapi` (Redis-backed `limits` library, already in dependencies) with configurable limits per endpoint category.

### Rate Limit Tiers

| Tier | Default Limit | Endpoints | Rationale |
|------|---------------|-----------|-----------|
| **API** (default) | `60/minute` | All `GET /api/*` (issues, projects, sprints, boards, priorities, labels) | Standard read traffic |
| **Auth** | `10/minute` | `/auth/login`, `/auth/callback`, `/auth/logout`, `/auth/select-site` | Prevent brute-force, token harvesting |
| **Search** | `30/minute` | `/api/search`, `/api/search/quick` | JQL queries are expensive on Jira side |
| **Mutation** | `30/minute` | All `POST/PATCH/PUT/DELETE` on issues, sprints, projects | Write operations hit Jira harder, reduce abuse risk |

### Configuration

All limits are configurable via environment variables:

```env
RATE_LIMIT_API=60/minute        # General API reads
RATE_LIMIT_AUTH=10/minute       # Authentication endpoints
RATE_LIMIT_SEARCH=30/minute     # JQL search queries
RATE_LIMIT_MUTATION=30/minute   # Create/update/delete operations
```

### Implementation

- `slowapi.Limiter` per router with `get_remote_address` key function
- `@limiter.limit()` decorators on individual endpoints
- Global default (`60/minute`) as fallback for undecorated routes
- Custom 429 response with `Retry-After` header and structured JSON error:

```json
{
  "error": "rate_limit_exceeded",
  "detail": "Too many requests. Limit: 10 per 1 minute"
}
```

### Endpoint Coverage

**Auth** (4 endpoints): login, callback, logout, select-site
**Search** (2 endpoints): JQL search, quick search
**Mutations** (12 endpoints):
- Issues: create, update, transition, log work
- Sprints: create, update, start, complete, delete, add issues, remove issue
- Projects: create

**Reads** (remaining): covered by global default limit

### Key Function

Uses `get_remote_address` which reads `X-Forwarded-For` header (set by Traefik reverse proxy) or falls back to direct IP. This correctly identifies clients behind the proxy.

### Storage Backend

Currently in-memory (per-process). For horizontal scaling, configure `slowapi` with Redis storage via `RATELIMIT_STORAGE_URI=redis://host:6379` (aligns with #59 Redis session store).

## Consequences

**Good**:
- Protects Jira API quota from abusive clients
- Auth endpoints hardened against brute-force
- All limits tuneable without code changes (env vars)
- Structured 429 response with Retry-After helps well-behaved clients
- Compatible with future Redis backend (#59)

**Bad**:
- In-memory storage means limits reset on container restart and aren't shared across workers
- Per-IP limiting can be circumvented with rotating IPs (acceptable for initial protection)
- Legitimate power users may occasionally hit mutation limits during bulk operations

## Related

- Roadmap #35: Rate limiting & abuse protection
- Roadmap #59: Redis session store (enables shared rate limit storage)
- ADR-017: Dual Auth — Strategy Pattern
- ADR-012: Traefik Docker Production (X-Forwarded-For)
