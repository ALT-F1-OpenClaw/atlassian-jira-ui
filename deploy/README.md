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
│  │  frontend → backend   │  │  frontend → backend   │ │
│  │  :latest (auto)       │  │  :v1.49.1 (pinned)   │ │
│  └───────────────────────┘  └──────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

## URLs

| Environment | URL | Update |
|---|---|---|
| **Prod** | `https://atlf1be-raspberry-pi-4.tail981e59.ts.net:4443` | Manual: `./deploy-prod.sh vX.Y.Z` |
| **Dev** | `https://atlf1be-raspberry-pi-4.tail981e59.ts.net:9443` | Auto (Watchtower polls GHCR every 5 min) |
| **Traefik** | `http://atlf1be-raspberry-pi-4.tail981e59.ts.net:8080` | Dashboard |

## Prerequisites

- Docker Engine + Docker Compose
- Tailscale (for TLS certs + private network access)
- User in `docker` group

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

# 4. Create nginx configs (replace ENVNAME with prod/dev)
for env in prod dev; do
  sed "s/ENVNAME/${env}/g" deploy/nginx.conf.template > /srv/atlassian-jira-ui/$env/nginx.conf
done

# 5. Create .env files for each environment
cat > /srv/atlassian-jira-ui/prod/.env << EOF
JIRA_HOST=https://yourcompany.atlassian.net
JIRA_EMAIL=you@company.com
JIRA_API_TOKEN=your-api-token
APP_SECRET_KEY=$(openssl rand -base64 32)
EOF
cp /srv/atlassian-jira-ui/prod/.env /srv/atlassian-jira-ui/dev/.env

# 6. Start everything
cd /srv/atlassian-jira-ui
docker compose up -d

# 7. Enable auto-start on boot
sudo systemctl enable jira-ui.service
```

## Deploy to Production

```bash
# Pin a specific version
./deploy-prod.sh v1.49.1

# Check current prod version
docker inspect prod-backend --format '{{.Config.Image}}'

# Rollback
./deploy-prod.sh v1.48.0
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
```

## CI/CD Flow

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

## Systemd Service

Located at `/etc/systemd/system/jira-ui.service`. Auto-starts on boot.

```bash
sudo systemctl status jira-ui
sudo systemctl restart jira-ui
sudo systemctl stop jira-ui
```
