# Deployment Guide

Production deployment on Raspberry Pi 4 (ARM64) with Docker + Traefik.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Raspberry Pi 4                      │
│                                                       │
│  ┌─────────┐  ┌───────────┐                          │
│  │ Traefik │  │Watchtower │                          │
│  │  :4443  │  │  5 min    │                          │
│  │  :9443  │  │  poll     │                          │
│  └────┬────┘  └───────────┘                          │
│       │                                               │
│  ┌────┴──────────────────┐  ┌──────────────────────┐ │
│  │   DEV (:9443)         │  │   PROD (:4443)       │ │
│  │  :latest (auto)       │  │  pinned version      │ │
│  │  APP_ENV=development  │  │  APP_ENV=production   │ │
│  │  Both auth methods    │  │  OAuth only           │ │
│  └───────────────────────┘  └──────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

## Environments

| | Dev | Prod |
|---|---|---|
| **URL** | `https://atlf1be-raspberry-pi-4.tail981e59.ts.net:9443` | `https://atlf1be-raspberry-pi-4.tail981e59.ts.net:4443` |
| **Image tag** | `:latest` (auto-updated by Watchtower) | Pinned (e.g., `:1.58.0`) |
| **Updates** | Automatic on every push (~5 min delay) | Manual: `./deploy-prod.sh vX.Y.Z` |
| **APP_ENV** | `development` | `production` |
| **API Token auth** | ✅ Available (toggle in Settings) | ❌ Disabled — not even a fallback |
| **OAuth auth** | ✅ Available | ✅ Only method |
| **Purpose** | Testing, development, preview | Stable, customer-facing |
| **Dashboard** | `http://...:8080/dashboard/` (Traefik) | Same |

## Environment Variables

### Required (both environments)

| Variable | Description | Example |
|----------|-------------|---------|
| `JIRA_HOST` | Jira Cloud URL | `https://yourcompany.atlassian.net` |
| `JIRA_EMAIL` | Jira account email | `you@company.com` |
| `JIRA_API_TOKEN` | [API token](https://id.atlassian.com/manage-profile/security/api-tokens) | `ABCdef123...` |
| `APP_SECRET_KEY` | Random secret for sessions | `openssl rand -base64 32` |
| `ATLASSIAN_CLIENT_ID` | OAuth 2.0 Client ID | From [developer.atlassian.com](https://developer.atlassian.com/console/myapps/) |
| `ATLASSIAN_CLIENT_SECRET` | OAuth 2.0 Client Secret | From Developer Console |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENV` | `development` | `production` disables API Token auth entirely |
| `AUTH_API_TOKEN_ENABLED` | `true` | Toggle API Token auth (ignored in production) |
| `AUTH_OAUTH_ENABLED` | `true` | Toggle OAuth auth |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed CORS origins (set by docker-compose) |

### Production `.env` example

```env
JIRA_HOST=https://yourcompany.atlassian.net
JIRA_EMAIL=you@company.com
JIRA_API_TOKEN=your-api-token
APP_SECRET_KEY=random-secret-key
ATLASSIAN_CLIENT_ID=your-client-id
ATLASSIAN_CLIENT_SECRET=your-client-secret
APP_ENV=production
AUTH_API_TOKEN_ENABLED=false
AUTH_OAUTH_ENABLED=true
```

### Dev `.env` example

```env
JIRA_HOST=https://yourcompany.atlassian.net
JIRA_EMAIL=you@company.com
JIRA_API_TOKEN=your-api-token
APP_SECRET_KEY=random-secret-key
ATLASSIAN_CLIENT_ID=your-client-id
ATLASSIAN_CLIENT_SECRET=your-client-secret
AUTH_API_TOKEN_ENABLED=true
AUTH_OAUTH_ENABLED=true
```

## Deploy to Production

```bash
# Deploy a specific version
./deploy-prod.sh v1.58.0

# Check current prod version
docker inspect prod-backend --format '{{.Config.Image}}'

# Rollback to previous version
./deploy-prod.sh v1.57.3
```

## Dev Auto-Update Flow

```
git push → GitHub CI (tests) → publish :latest to GHCR
                                    │
                    Watchtower polls every 5 min
                                    │
                                    ▼
                            Dev auto-updates
                                    │
                            Tested & approved?
                                    │
                        ./deploy-prod.sh vX.Y.Z
                                    │
                                    ▼
                            Prod pinned to vX.Y.Z
```

## Initial Setup

```bash
# 1. Create directory structure
sudo mkdir -p /srv/atlassian-jira-ui/{dev,prod,traefik}
sudo chown -R $USER:$USER /srv/atlassian-jira-ui

# 2. Generate Tailscale TLS cert
sudo tailscale cert atlf1be-raspberry-pi-4.tail981e59.ts.net
sudo cp /var/lib/tailscale/certs/*.crt /srv/atlassian-jira-ui/traefik/
sudo cp /var/lib/tailscale/certs/*.key /srv/atlassian-jira-ui/traefik/
sudo chown $USER:$USER /srv/atlassian-jira-ui/traefik/*.crt /srv/atlassian-jira-ui/traefik/*.key

# 3. Copy config files
cp deploy/docker-compose.yml /srv/atlassian-jira-ui/
cp deploy/deploy-prod.sh /srv/atlassian-jira-ui/
cp deploy/traefik/* /srv/atlassian-jira-ui/traefik/
chmod +x /srv/atlassian-jira-ui/deploy-prod.sh

# 4. Create nginx configs
for env in prod dev; do
  cat > /srv/atlassian-jira-ui/$env/nginx.conf << EOF
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    location /api/ { proxy_pass http://${env}-backend:35400; proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; }
    location /auth/ { proxy_pass http://${env}-backend:35400; proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; }
    location / { try_files \$uri \$uri/ /index.html; }
}
EOF
done

# 5. Create .env files (see examples above)
# 6. Create session/state files
echo '{}' > /srv/atlassian-jira-ui/dev/sessions.json
echo '{}' > /srv/atlassian-jira-ui/dev/oauth_states.json
echo '{}' > /srv/atlassian-jira-ui/prod/sessions.json
echo '{}' > /srv/atlassian-jira-ui/prod/oauth_states.json

# 7. Start everything
cd /srv/atlassian-jira-ui
docker compose up -d

# 8. Enable auto-start on boot
sudo systemctl enable jira-ui.service
```

## Operations

```bash
# Status
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

# Logs
docker logs prod-backend --tail 50 -f
docker logs dev-frontend --tail 50 -f

# Restart all
cd /srv/atlassian-jira-ui && docker compose restart

# Stop all
cd /srv/atlassian-jira-ui && docker compose down

# Update Traefik
docker compose pull traefik && docker compose up -d traefik

# Force pull latest dev images
docker compose pull dev-backend dev-frontend && docker compose up -d dev-backend dev-frontend
```

## Systemd Service

Located at `/etc/systemd/system/jira-ui.service`. Auto-starts on boot.

```bash
sudo systemctl status jira-ui
sudo systemctl restart jira-ui
sudo systemctl stop jira-ui
```

## File Structure

```
/srv/atlassian-jira-ui/
├── docker-compose.yml              ← 6 containers
├── deploy-prod.sh                  ← Pin prod to version tag
├── .env                            ← PROD_VERSION for pinning
├── traefik/
│   ├── traefik.yml                 ← Static config (entrypoints, TLS)
│   ├── dynamic.yml                 ← Routing rules (/api, /auth → backend)
│   └── *.crt / *.key              ← Tailscale TLS certificates
├── prod/
│   ├── .env                        ← Jira creds + APP_ENV=production
│   ├── nginx.conf                  ← Routes /api + /auth to prod-backend
│   ├── sessions.json               ← OAuth sessions (persisted)
│   └── oauth_states.json           ← CSRF tokens (persisted)
└── dev/
    ├── .env                        ← Jira creds + APP_ENV=development
    ├── nginx.conf                  ← Routes /api + /auth to dev-backend
    ├── sessions.json               ← OAuth sessions (persisted)
    └── oauth_states.json           ← CSRF tokens (persisted)
```
