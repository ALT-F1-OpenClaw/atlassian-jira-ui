# ADR-023: Public Deployment with Let's Encrypt + Redis

**Status**: Accepted
**Date**: 2026-03-24
**Deciders**: Abdelkrim BOUJRAF

## Context

The app was deployed on a Raspberry Pi behind Tailscale (private network, Tailscale TLS certs, ports 4443/9443). To go public as a SaaS at `taskara.alt-f1.be`, we need:

- A real domain with browser-trusted TLS certificates
- Standard ports (80/443) for public access
- Redis for session storage (replaces file-based sessions)
- Proper `/auth/` routing through the reverse proxy (was missing)

## Decision

Create a separate `deploy/public/` directory with a self-contained Docker Compose stack for public VPS deployment.

### Architecture

```
Internet → :80/:443
              │
         ┌────▼────┐
         │ Traefik  │  Let's Encrypt ACME (HTTP-01)
         └────┬─────┘
              │
         ┌────▼────────┐
         │  Frontend    │  Nginx + React SPA
         │  /api/ ──────┤──→ Backend (FastAPI :35400)
         │  /auth/ ─────┤
         │  /* → SPA    │
         └──────────────┘
              │
         ┌────▼────────┐
         │   Backend    │  APP_ENV=production, OAuth only
         │   Redis ◄────┤  Sessions + CSRF (encrypted, 7d TTL)
         └──────────────┘
```

### Containers (5)

| Container | Image | Role |
|-----------|-------|------|
| `taskara-traefik` | `traefik:v3.4` | Reverse proxy, ACME TLS |
| `taskara-redis` | `redis:7-alpine` | Session store |
| `taskara-backend` | GHCR backend | FastAPI + OAuth |
| `taskara-frontend` | GHCR frontend | Nginx + React |
| `taskara-watchtower` | `watchtower` | Auto-update |

### TLS

- Traefik ACME with HTTP-01 challenge
- Let's Encrypt certificates auto-renewed
- HTTP → HTTPS redirect on port 80
- Certificate storage in Docker volume `letsencrypt`

### Nginx Routing Fix

The existing `nginx.conf.template` only proxied `/api/` to the backend. `/auth/` routes (OAuth login, callback, logout) were missing, causing OAuth to fail when accessed through Nginx. Fixed by adding:

```nginx
location /auth/ {
    proxy_pass http://backend:35400;
    proxy_set_header X-Forwarded-Proto $scheme;
    ...
}
```

Same fix applied to Traefik `dynamic.yml` for the Pi deployment.

### Networks

- `web`: Traefik ↔ Frontend ↔ Backend (external traffic)
- `internal`: Backend ↔ Redis (no external exposure)

## Consequences

**Good**:
- Public SaaS deployment with 3 commands (clone, configure, `docker compose up`)
- Automatic TLS — no manual cert management
- Redis sessions shared across container restarts
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Watchtower auto-updates from GHCR

**Bad**:
- Requires a VPS with ports 80/443 open (can't run behind another proxy easily)
- HTTP-01 challenge requires the domain to resolve to the server before first deploy
- Redis adds memory overhead (~30MB idle)

## Related

- ADR-012: Traefik Docker Production (Pi deployment)
- ADR-014: Tailscale TLS (Pi deployment — superseded for public)
- ADR-022: Redis Session Store
- Roadmap #57: Production docker-compose + Let's Encrypt
