# ADR-012: Traefik + Docker Compose for Production

**Status**: Accepted
**Date**: 2026-03-16
**Deciders**: Abdelkrim BOUJRAF

## Context

The app needs production deployment on Raspberry Pi 4 with dev/staging/prod environments running in parallel.

## Alternatives Considered

1. **Bare metal** (systemd + nginx) — lighter RAM, but manual management
2. **Docker Compose + Traefik** — containerized, isolated, uses existing GHCR images

## Decision

Option 2: Docker Compose with Traefik v3.4 as reverse proxy.

## Architecture

```
/srv/atlassian-jira-ui/
├── docker-compose.yml          ← 7 containers: traefik + 3×(frontend+backend)
├── traefik/
│   ├── traefik.yml             ← static config (entrypoints)
│   ├── dynamic.yml             ← routing rules
│   └── *.crt/*.key             ← Tailscale TLS certs
├── prod/.env + nginx.conf
├── staging/.env + nginx.conf
└── dev/.env + nginx.conf
```

Each environment gets:
- Its own backend container (env-specific `.env`)
- Its own frontend container (env-specific `nginx.conf` routing to correct backend)
- Separate Traefik entrypoint (port)

## Consequences

**Good**: Isolated environments, uses pre-built GHCR images, survives reboots (systemd), easy rollback via image tags.
**Bad**: 7 containers on a Pi 4 (8GB) — ~500MB RAM total, Docker daemon overhead.
