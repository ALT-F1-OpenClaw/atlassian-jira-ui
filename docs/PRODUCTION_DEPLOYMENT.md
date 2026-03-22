# Production Deployment Guide

Deploy the Jira UI to a public-facing VPS (Contabo, Hetzner, DigitalOcean, any Linux server).

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    VPS (Contabo)                      │
│                                                       │
│  ┌─────────┐  ┌────────────────────┐                 │
│  │ Traefik │  │  Let's Encrypt     │                 │
│  │  :443   │  │  jira.alt-f1.be    │                 │
│  │  :80    │  │  (auto-renew)      │                 │
│  └────┬────┘  └────────────────────┘                 │
│       │                                               │
│  ┌────┴──────────────────┐  ┌──────────────────────┐ │
│  │   PROD                │  │   DEV (optional)     │ │
│  │  frontend → backend   │  │  frontend → backend  │ │
│  │  pinned version       │  │  :latest (auto)      │ │
│  │  APP_ENV=production   │  │  APP_ENV=development │ │
│  └───────────────────────┘  └──────────────────────┘ │
│                                                       │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐          │
│  │Watchtower│  │  Redis    │  │  UFW     │          │
│  │ auto-pull│  │  sessions │  │ firewall │          │
│  └──────────┘  └───────────┘  └──────────┘          │
└──────────────────────────────────────────────────────┘
```

## vs Raspberry Pi Deployment

| | Raspberry Pi | VPS (Contabo) |
|---|---|---|
| **Access** | Tailscale only (private) | Public internet |
| **TLS** | Tailscale certs (browser warnings) | Let's Encrypt (trusted by all) |
| **Domain** | `*.ts.net:4443` | `jira.yourdomain.com` |
| **Performance** | ARM64, SD card, 8GB RAM | x86_64, SSD, 4-8GB RAM |
| **Uptime** | Home network | 99.9% SLA |
| **Cost** | Free (your hardware) | ~€5-10/month |
| **Sessions** | File-based (sessions.json) | Redis (scalable) |
| **Deploy user** | `abo` (existing user) | Dedicated `deploy` user |

## Prerequisites

- A VPS with Ubuntu 22.04+ or Debian 12+
- A domain name pointing to the VPS IP (e.g., `jira.alt-f1.be`)
- DNS A record: `jira.alt-f1.be → VPS_IP`

## Deployment Methods

### Method 1: Ansible (Recommended)

Ansible automates the entire setup — one command to go from bare VPS to running production.

```
ansible/
├── inventory.yml           ← your server(s)
├── playbook.yml            ← main deployment playbook
├── roles/
│   ├── common/             ← users, SSH, firewall
│   ├── docker/             ← install Docker
│   ├── app/                ← clone, configure, deploy
│   └── monitoring/         ← optional: logs, alerts
└── vars/
    └── production.yml      ← secrets (encrypted with ansible-vault)
```

**What Ansible does:**
1. Creates `deploy` user with Docker group access
2. Configures SSH key auth (disables password login)
3. Installs Docker Engine + Docker Compose
4. Clones the repo to `/opt/atlassian-jira-ui`
5. Creates `.env` files with production config
6. Starts docker-compose (Traefik + Let's Encrypt + app)
7. Configures UFW firewall (80, 443 only)
8. Sets up systemd service for auto-start
9. Installs Watchtower for dev auto-updates

**Usage:**
```bash
# First-time setup
ansible-playbook -i inventory.yml playbook.yml

# Update config
ansible-playbook -i inventory.yml playbook.yml --tags config

# Deploy new version
ansible-playbook -i inventory.yml playbook.yml --tags deploy
```

### Method 2: Manual

```bash
# 1. Create deploy user
sudo adduser deploy
sudo usermod -aG docker deploy

# 2. Install Docker
curl -fsSL https://get.docker.com | sudo sh

# 3. Clone repo
sudo mkdir -p /opt/atlassian-jira-ui
sudo chown deploy:deploy /opt/atlassian-jira-ui
su - deploy
git clone https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui.git /opt/atlassian-jira-ui

# 4. Configure
cd /opt/atlassian-jira-ui/deploy
cp docker-compose.production.yml docker-compose.yml

# 5. Create .env
cat > prod/.env << EOF
JIRA_HOST=https://yourcompany.atlassian.net
JIRA_EMAIL=you@company.com
JIRA_API_TOKEN=your-token
APP_SECRET_KEY=$(openssl rand -base64 32)
ATLASSIAN_CLIENT_ID=your-client-id
ATLASSIAN_CLIENT_SECRET=your-client-secret
APP_ENV=production
AUTH_API_TOKEN_ENABLED=false
AUTH_OAUTH_ENABLED=true
EOF

# 6. Start
docker compose up -d

# 7. Firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

## Key Differences from Pi Deployment

### TLS: Let's Encrypt instead of Tailscale

Traefik automatically obtains and renews Let's Encrypt certificates.
No browser warnings, no `about:config` hacks.

```yaml
# traefik.yml
certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@alt-f1.be
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web
```

### Sessions: Redis instead of JSON files

File-based sessions don't scale and can corrupt on concurrent writes.
Redis provides atomic operations and supports horizontal scaling.

```yaml
# docker-compose.production.yml
services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis-data:/data
```

### Security: Dedicated deploy user

Never deploy as root. The `deploy` user:
- Has Docker group access (no sudo needed for docker commands)
- SSH key auth only (password disabled)
- No sudo access (can't modify system)
- Owns only `/opt/atlassian-jira-ui`

### OAuth Callback URL

Update in Atlassian Developer Console:
```
https://jira.yourdomain.com/auth/callback
```

(Remove the Pi callback URL or keep both during migration.)

## Monitoring

### Logs
```bash
docker compose logs -f prod-backend    # Backend logs
docker compose logs -f traefik         # Traefik access logs
```

### Health Check
```bash
curl https://jira.yourdomain.com/api/health
# {"status":"ok","version":"1.59.8"}
```

### Watchtower
```bash
docker logs watchtower    # Image update history
```

## Rollback

```bash
# Pin to previous version
./deploy-prod.sh v1.58.0

# Or revert docker image
docker compose pull prod-backend prod-frontend
docker compose up -d
```

## Roadmap

- [ ] #56 — Ansible playbook for automated deployment
- [ ] #57 — Production docker-compose with Let's Encrypt
- [ ] #58 — Deploy user + SSH key auth
- [ ] #59 — Redis session store
