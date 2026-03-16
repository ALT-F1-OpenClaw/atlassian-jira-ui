# ADR-013: Port-Based Environment Separation

**Status**: Accepted
**Date**: 2026-03-16
**Deciders**: Abdelkrim BOUJRAF

## Context

Need 3 environments (dev/staging/prod) on a single Raspberry Pi with HTTPS. Tailscale certs only cover the machine hostname — no subdomain certs available.

## Alternatives Considered

1. **Subdomain-based** (`jira.host`, `jira-dev.host`) — cleanest URLs but no Tailscale cert for subdomains
2. **Path-based** (`/`, `/staging/`, `/dev/`) — SPA routing breaks with path prefixes
3. **Port-based** (`:4443`, `:8443`, `:9443`) — works with single Tailscale cert

## Decision

Port-based routing with Traefik entrypoints:

| Environment | Port | URL |
|-------------|------|-----|
| Prod | 4443 | `https://atlf1be-raspberry-pi-4.tail981e59.ts.net:4443` |
| Staging | 8443 | `https://atlf1be-raspberry-pi-4.tail981e59.ts.net:8443` |
| Dev | 9443 | `https://atlf1be-raspberry-pi-4.tail981e59.ts.net:9443` |
| Traefik dashboard | 8080 | `http://...:8080` |

Port 443 reserved for Tailscale Serve (OpenClaw).

## Consequences

**Good**: Single TLS cert covers all environments, no DNS configuration needed, clean separation.
**Bad**: Users must remember port numbers, non-standard HTTPS ports may confuse bookmarks.
