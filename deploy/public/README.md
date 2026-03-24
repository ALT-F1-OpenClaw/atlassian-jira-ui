# Taskara — Public Deployment

Deploy Taskara to any VPS with a public domain and automatic Let's Encrypt TLS.

## Prerequisites

- A Linux server (Ubuntu 22.04+, Debian 12+, or similar)
- Docker Engine + Docker Compose v2
- A domain name pointing to the server (e.g., `taskara.alt-f1.be`)
- Port 80 and 443 open on the firewall
- An Atlassian OAuth 2.0 app ([developer.atlassian.com](https://developer.atlassian.com))

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui.git
cd atlassian-jira-ui/deploy/public

# 2. Configure
cp .env.example .env
nano .env  # Fill in your domain, OAuth credentials, app secret

# 3. Point DNS
# Create an A record: taskara.alt-f1.be → your-server-ip

# 4. Deploy
docker compose up -d

# 5. Verify
curl -I https://taskara.alt-f1.be
# Should return 200 with valid TLS certificate
```

## Architecture

```
Internet → :80/:443
              │
         ┌────▼────┐
         │ Traefik  │  Let's Encrypt TLS
         │  :80/443 │  HTTP → HTTPS redirect
         └────┬─────┘
              │
         ┌────▼─────────┐
         │   Frontend    │  Nginx + React SPA
         │   (nginx)     │
         │  /api/ → ──────────┐
         │  /auth/ → ─────────┤
         │  /* → SPA          │
         └───────────────┘    │
                              │
         ┌────────────────────▼──┐
         │     Backend           │  FastAPI + OAuth 2.0
         │   (uvicorn:35400)     │
         │                       │
         │   REDIS_URL ──────────┤
         └───────────────────────┘
                              │
         ┌────────────────────▼──┐
         │      Redis            │  Sessions + CSRF states
         │   (redis:6379)        │  7-day TTL, encrypted
         └───────────────────────┘
```

## Containers

| Container | Image | Purpose |
|-----------|-------|---------|
| `taskara-traefik` | `traefik:v3.4` | Reverse proxy, Let's Encrypt TLS |
| `taskara-redis` | `redis:7-alpine` | Session store (encrypted tokens) |
| `taskara-backend` | GHCR backend | FastAPI API + OAuth |
| `taskara-frontend` | GHCR frontend | Nginx + React SPA |
| `taskara-watchtower` | `watchtower` | Auto-update (optional) |

## Updating

```bash
# Auto-update (Watchtower polls GHCR every 5 min)
# Or manual:
docker compose pull
docker compose up -d
```

## Pin to a version

```bash
# In .env:
APP_VERSION=v1.62.0

# Then:
docker compose up -d
```

## OAuth Callback URL

Set this in your Atlassian OAuth app settings:

```
https://taskara.alt-f1.be/auth/callback
```

## Backup

Sessions are in Redis (auto-expired). No persistent Jira data to back up.
Only back up your `.env` file (contains OAuth credentials and app secret).

## Differences from Tailscale deployment

| Feature | Tailscale (Pi) | Public (VPS) |
|---------|----------------|--------------|
| TLS | Tailscale certs | Let's Encrypt |
| Access | Private (Tailscale network) | Public internet |
| Domain | `*.tail*.ts.net:4443` | `taskara.alt-f1.be` |
| Sessions | File-based | Redis |
| Ports | 4443/9443 | 80/443 |
