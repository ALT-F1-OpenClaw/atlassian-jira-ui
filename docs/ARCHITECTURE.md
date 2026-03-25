# Architecture — Taskara

All infrastructure diagrams for every deployment scenario.

---

## 1. Application Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User's Browser                              │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Taskara Frontend                           │   │
│  │              React 19 + Vite + TypeScript                     │   │
│  │              Tailwind CSS 4 + TanStack Query                  │   │
│  │                                                               │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐          │   │
│  │  │Dashboard│ │  List   │ │  Board  │ │  Sprint  │          │   │
│  │  │  View   │ │  View   │ │  View   │ │Dashboard │          │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬─────┘          │   │
│  │       └───────────┼───────────┼────────────┘                │   │
│  │                   │                                          │   │
│  │            TanStack Query (cache)                            │   │
│  │            IndexedDB (offline queue)                          │   │
│  │            localStorage (prefs, filters, timers)             │   │
│  │            Service Worker (Workbox PWA)                       │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │ fetch /api/* + /auth/*                    │
└─────────────────────────┼──────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      nginx (in Docker image)                        │
│                                                                     │
│  /api/*  ──→ proxy_pass → backend:35400                             │
│  /auth/* ──→ proxy_pass → backend:35400                             │
│  /*      ──→ try_files → /index.html (SPA)                         │
│                                                                     │
│  Headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy  │
│  BACKEND_HOST env var (envsubst at startup)                         │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Taskara Backend                                  │
│               FastAPI + uvicorn (port 35400)                        │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Auth Strategy Chain                        │   │
│  │   1. OAuthStrategy → session cookie → Bearer token           │   │
│  │   2. ApiTokenStrategy → .env → Basic Auth (dev only)         │   │
│  └──────────┬───────────────────────────────────────────────────┘   │
│             │                                                       │
│  ┌──────────▼──────────┐  ┌─────────────────────────────────────┐  │
│  │   Session Store      │  │         Jira API Client             │  │
│  │                      │  │                                     │  │
│  │  Redis (preferred)   │  │  async httpx → api.atlassian.com    │  │
│  │    or                │  │  OAuth: Bearer token + cloud_id     │  │
│  │  File (fallback)     │  │  Basic: email + API token           │  │
│  │                      │  │  Rate-limit retry (429 backoff)     │  │
│  │  Fernet encryption   │  │                                     │  │
│  │  Session fingerprint │  │  Agile API fallback → JQL           │  │
│  │  7-day TTL           │  │                                     │  │
│  └──────────┬───────────┘  └──────────────┬──────────────────────┘  │
│             │                              │                        │
│  ┌──────────▼───────────┐                  │                        │
│  │   slowapi Rate       │                  │                        │
│  │   Limiting           │                  │                        │
│  │                      │                  │                        │
│  │  API:      60/min    │                  │                        │
│  │  Auth:     10/min    │                  │                        │
│  │  Search:   30/min    │                  │                        │
│  │  Mutation: 30/min    │                  │                        │
│  └──────────────────────┘                  │                        │
└────────────────────────────────────────────┼────────────────────────┘
                                             │
                          ┌──────────────────┼──────────────────┐
                          ▼                  ▼                  ▼
                   ┌────────────┐   ┌──────────────┐   ┌────────────┐
                   │   Redis    │   │ Jira Cloud   │   │ Atlassian  │
                   │  7-alpine  │   │ REST API v3  │   │ OAuth 2.0  │
                   │            │   │              │   │            │
                   │ Sessions   │   │ /issue       │   │ /authorize │
                   │ CSRF       │   │ /project     │   │ /token     │
                   │ 128MB AOF  │   │ /sprint      │   │ /resources │
                   └────────────┘   │ /board       │   └────────────┘
                                    │ /search      │
                                    └──────────────┘
```

---

## 2. Target Production — Cloudflare Pro + OpenAppSec + VPS

**This is the recommended production deployment.**

Zero exposed ports. All traffic via Cloudflare Tunnel.

```
                        ┌─────────────────────────────────────┐
                        │          Internet / Users            │
                        └────────────────┬────────────────────┘
                                         │
                        ┌────────────────▼────────────────────┐
                        │        Cloudflare Pro ($20/mo)       │
                        │                                      │
                        │  ✅ CDN (global edge caching)        │
                        │  ✅ WAF (OWASP managed rules)        │
                        │  ✅ DDoS protection (L3/L4/L7)       │
                        │  ✅ SSL/TLS Full (Strict)            │
                        │  ✅ HSTS (6 months)                  │
                        │  ✅ Rate limiting (100 req/10s)       │
                        │  ✅ Bot management                   │
                        │                                      │
                        │  DNS: taskara.alt-f1.be              │
                        │  CNAME → <tunnel-id>.cfargotunnel.com│
                        └────────────────┬────────────────────┘
                                         │
                              Cloudflare Tunnel
                              (encrypted, outbound only)
                                         │
┌────────────────────────────────────────▼────────────────────────────────────┐
│                              VPS (Hetzner CX22)                             │
│                           Ubuntu 24.04 LTS, EU                              │
│                                                                             │
│  🔒 Firewall: SSH only (port 22) — NO ports 80/443 exposed                │
│  🔒 Fail2Ban + unattended-upgrades                                         │
│  🔒 deploy user (no root SSH)                                              │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        cloudflared (systemd)                          │  │
│  │                                                                       │  │
│  │   config.yml:                                                         │  │
│  │     hostname: taskara.alt-f1.be → http://localhost:8080               │  │
│  └───────────────────────────────┬───────────────────────────────────────┘  │
│                                  │                                          │
│  ┌───────────────────────────────▼───────────────────────────────────────┐  │
│  │                     Docker Compose (/srv/taskara/)                     │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │              OpenAppSec WAF (port 127.0.0.1:8080)               │  │  │
│  │  │                                                                 │  │  │
│  │  │  ML-based threat detection                                      │  │  │
│  │  │  OWASP Top 10 protection                                        │  │  │
│  │  │  Request inspection + blocking                                  │  │  │
│  │  └────────────────────────────┬────────────────────────────────────┘  │  │
│  │                               │                                       │  │
│  │  ┌────────────────────────────▼────────────────────────────────────┐  │  │
│  │  │                   Frontend (nginx + React SPA)                  │  │  │
│  │  │                                                                 │  │  │
│  │  │  /api/*  ──→ backend:35400                                      │  │  │
│  │  │  /auth/* ──→ backend:35400                                      │  │  │
│  │  │  /*      ──→ index.html                                         │  │  │
│  │  │                                                                 │  │  │
│  │  │  BACKEND_HOST=backend (envsubst)                                │  │  │
│  │  │  Security headers (X-Frame-Options, etc.)                       │  │  │
│  │  └────────────────────────────┬────────────────────────────────────┘  │  │
│  │                               │                                       │  │
│  │  ┌────────────────────────────▼────────────────────────────────────┐  │  │
│  │  │              Backend (FastAPI + uvicorn :35400)                  │  │  │
│  │  │                                                                 │  │  │
│  │  │  APP_ENV=production (OAuth only, API Token disabled)            │  │  │
│  │  │  REDIS_URL=redis://redis:6379/0                                 │  │  │
│  │  │  Rate limiting (slowapi)                                        │  │  │
│  │  │  Token encryption (Fernet)                                      │  │  │
│  │  │  Session fingerprinting                                         │  │  │
│  │  └──────────┬──────────────────────────────────┬───────────────────┘  │  │
│  │             │                                   │                      │  │
│  │  ┌──────────▼──────────┐            ┌──────────▼──────────────────┐   │  │
│  │  │   Redis 7 Alpine    │            │   Jira Cloud API            │   │  │
│  │  │                     │            │   (api.atlassian.com)        │   │  │
│  │  │   Sessions (7d TTL) │            │                              │   │  │
│  │  │   CSRF states       │            │   OAuth Bearer tokens        │   │  │
│  │  │   128MB, AOF        │            │   Per-user cloud_id          │   │  │
│  │  │   Internal network  │            │                              │   │  │
│  │  └─────────────────────┘            └──────────────────────────────┘   │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    Watchtower (auto-update)                      │  │  │
│  │  │   Polls GHCR every 5 min → pulls new :latest images            │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    Portainer CE (optional)                             │  │
│  │   127.0.0.1:9443 — access via SSH tunnel only                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘

Traffic flow:
  User → Cloudflare CDN → Cloudflare WAF → Cloudflare Tunnel
       → cloudflared → OpenAppSec WAF → nginx → Backend → Redis / Jira API

Security layers:
  1. Cloudflare DDoS protection (L3/L4/L7)
  2. Cloudflare WAF (OWASP managed rules)
  3. Cloudflare rate limiting (100 req/10s)
  4. Cloudflare Tunnel (no open ports on VPS)
  5. OpenAppSec ML-based WAF (OWASP Top 10)
  6. UFW firewall (SSH only)
  7. Fail2Ban (SSH brute-force)
  8. Backend rate limiting (slowapi, per-IP)
  9. Token encryption (Fernet AES-128-CBC)
  10. Session fingerprinting (IP + User-Agent)
  11. CORS + CSRF protection
  12. HttpOnly SameSite cookies
```

---

## 3. Raspberry Pi — Private Deployment (Tailscale)

```
                    ┌──────────────────────────────────┐
                    │       Tailscale Network           │
                    │   (private, encrypted mesh VPN)   │
                    └────────────────┬─────────────────┘
                                     │
┌────────────────────────────────────▼──────────────────────────────────────┐
│                          Raspberry Pi 4 (ARM64)                           │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                  Traefik v3.4 (reverse proxy)                       │  │
│  │                                                                     │  │
│  │  :4443 (prod) ──→ prod-frontend / prod-backend                     │  │
│  │  :9443 (dev)  ──→ dev-frontend / dev-backend                       │  │
│  │                                                                     │  │
│  │  TLS: Tailscale certificates                                        │  │
│  │  Routes: /api → backend, /auth → backend, /* → frontend            │  │
│  └──────────────┬──────────────────────────────┬───────────────────────┘  │
│                 │                               │                         │
│    ┌────────────▼────────────┐    ┌────────────▼────────────┐            │
│    │    PROD (:4443)         │    │    DEV (:9443)           │            │
│    │                         │    │                          │            │
│    │  prod-frontend (nginx)  │    │  dev-frontend (nginx)    │            │
│    │  prod-backend (FastAPI) │    │  dev-backend (FastAPI)   │            │
│    │                         │    │                          │            │
│    │  Pinned version tag     │    │  :latest (auto-update)   │            │
│    │  Manual: deploy-prod.sh │    │  Watchtower (5 min poll) │            │
│    └─────────────────────────┘    └──────────────────────────┘            │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Watchtower — auto-updates dev containers from GHCR                 │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  systemd: jira-ui.service (auto-start on boot)                           │
└───────────────────────────────────────────────────────────────────────────┘

Prod URL: https://atlf1be-raspberry-pi-4.tail981e59.ts.net:4443
Dev URL:  https://atlf1be-raspberry-pi-4.tail981e59.ts.net:9443
```

---

## 4. CI/CD Pipeline

```
                    ┌──────────────┐
                    │   git push   │
                    │   to main    │
                    └──────┬───────┘
                           │
              ┌────────────▼────────────┐
              │      CI Workflow         │
              │                          │
              │  Frontend (Node 20/22)   │
              │  • tsc + vitest (255)    │
              │  • vite build            │
              │                          │
              │  Backend (Python 3.11-13)│
              │  • pytest (25)           │
              │  • import verification   │
              └─────┬──────────┬────────┘
                    │          │
                PASS ✅     FAIL ❌
                    │          │
                    │          ▼
                    │   ┌──────────────────┐
                    │   │  CI Auto-Fix      │
                    │   │  • Extract logs   │
                    │   │  • Create issue   │
                    │   │  • Discord notify  │
                    │   └──────────────────┘
                    │
             git push --tags (vX.Y.Z)
                    │
         ┌──────────┼──────────────┐
         ▼          ▼              ▼
    ┌─────────┐ ┌────────┐ ┌──────────────┐
    │ Release │ │ Docker │ │ Publish GHCR │
    │         │ │Validate│ │              │
    │ GitHub  │ │        │ │ Multi-arch   │
    │ release │ │ Build  │ │ amd64+arm64  │
    │         │ │ check  │ │              │
    └─────────┘ └────────┘ │ Discord      │
                            │ notification │
                            └──────────────┘

    Always: CodeQL (weekly) + Dependabot (weekly)
```

---

## 5. Data Flow — What Goes Where

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA STORAGE OVERVIEW                             │
│                                                                     │
│  ┌─── Server-side (encrypted) ───────────────────────────────────┐  │
│  │                                                                │  │
│  │  Redis / sessions.json:                                        │  │
│  │  • OAuth access token (Fernet encrypted)                       │  │
│  │  • OAuth refresh token (Fernet encrypted)                      │  │
│  │  • Session fingerprint (SHA-256 of IP + User-Agent)            │  │
│  │  • Cloud ID (Jira site identifier)                             │  │
│  │  • User profile (name, email, avatar — from Atlassian)         │  │
│  │  • CSRF state tokens (10-min TTL)                              │  │
│  │                                                                │  │
│  │  ❌ NO Jira issues, comments, attachments, or project data    │  │
│  │  ❌ NO analytics or tracking data                              │  │
│  │  ❌ NO passwords (OAuth only)                                  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─── Browser-side (user's device only) ─────────────────────────┐  │
│  │                                                                │  │
│  │  React Query (memory):     Jira issues, projects, sprints      │  │
│  │  IndexedDB (Workbox):      Cached API responses + offline queue│  │
│  │  localStorage:             Theme, saved filters, timer states, │  │
│  │                            cookie consent, site selection       │  │
│  │  Session cookie:           jira_ui_session (HttpOnly, 7 days)  │  │
│  │                                                                │  │
│  │  All cleared on logout or browser cache clear                  │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Container Inventory

### Production VPS (Cloudflare)

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `taskara-waf` | `openappsec/open-appsec-gateway` | 127.0.0.1:8080 | ML-based WAF |
| `taskara-frontend` | GHCR frontend | (internal) | nginx + React SPA |
| `taskara-backend` | GHCR backend | (internal) | FastAPI + OAuth |
| `taskara-redis` | `redis:7-alpine` | (internal) | Sessions |
| `taskara-watchtower` | `watchtower` | — | Auto-update |
| **cloudflared** | systemd service | — | Cloudflare Tunnel |
| **portainer** | `portainer-ce:lts` | 127.0.0.1:9443 | Management (optional) |

### Raspberry Pi (Tailscale)

| Container | Image | Purpose |
|-----------|-------|---------|
| `traefik` | `traefik:v3.4` | Reverse proxy + TLS |
| `prod-frontend` | GHCR frontend (pinned) | Prod nginx |
| `prod-backend` | GHCR backend (pinned) | Prod FastAPI |
| `dev-frontend` | GHCR frontend (latest) | Dev nginx |
| `dev-backend` | GHCR backend (latest) | Dev FastAPI |
| `watchtower` | `watchtower` | Auto-update dev |

---

*Last updated: March 2026*
