# VPS Deployment Checklist — Taskara

Step-by-step checklist to deploy Taskara on a VPS with Cloudflare Pro + OpenAppSec WAF.

**Target**: `taskara.alt-f1.be`
**Estimated time**: 2-3 hours
**Monthly cost**: ~€24 (VPS €4 + Cloudflare Pro €18 + domain ~€1)

See [SECURE_VPS_DEPLOYMENT.md](./SECURE_VPS_DEPLOYMENT.md) for detailed commands.

---

## 🖥️ VPS Setup (1-2 hours)

| # | Task | Done |
|---|------|------|
| 1 | Choose VPS provider + plan (Hetzner CX22 ~€4/mo recommended) | ☐ |
| 2 | Provision Ubuntu 24.04 LTS with SSH key | ☐ |
| 3 | Create `deploy` user, disable root SSH, disable password auth | ☐ |
| 4 | Firewall (UFW): allow SSH only, deny all incoming | ☐ |
| 5 | Install Fail2Ban (SSH brute-force protection) | ☐ |
| 6 | Enable automatic security updates (`unattended-upgrades`) | ☐ |
| 7 | Install Docker Engine + add `deploy` to docker group | ☐ |

## ☁️ Cloudflare Setup (30 min)

| # | Task | Done |
|---|------|------|
| 8 | Add `alt-f1.be` to Cloudflare (if not already) | ☐ |
| 9 | Upgrade to Cloudflare Pro ($20/mo) for WAF | ☐ |
| 10 | Create CNAME: `taskara` → `<tunnel-id>.cfargotunnel.com` (proxied ☁️) | ☐ |
| 11 | SSL/TLS → Full (Strict), Always HTTPS, min TLS 1.2 | ☐ |
| 12 | Enable HSTS (6 months, include subdomains) | ☐ |
| 13 | Enable Cloudflare WAF managed rules (OWASP Core Ruleset) | ☐ |
| 14 | Set rate limiting rule: 100 req/10s per IP | ☐ |

## 🔒 Cloudflare Tunnel — cloudflared (20 min)

| # | Task | Done |
|---|------|------|
| 15 | Install `cloudflared` on VPS | ☐ |
| 16 | `cloudflared tunnel login` (authenticate with Cloudflare) | ☐ |
| 17 | `cloudflared tunnel create taskara` (get tunnel ID) | ☐ |
| 18 | Write `~/.cloudflared/config.yml` (hostname → `http://localhost:8080`) | ☐ |
| 19 | `cloudflared service install` + `systemctl enable cloudflared` | ☐ |
| 20 | Verify tunnel: `cloudflared tunnel info taskara` | ☐ |

## 🐳 Application Deployment (20 min)

| # | Task | Done |
|---|------|------|
| 21 | Create `/srv/taskara/` directory | ☐ |
| 22 | Copy `docker-compose.yml` from `deploy/public/` (remove Traefik — Cloudflare handles TLS) | ☐ |
| 23 | Create `.env` from `.env.example` — fill in: | ☐ |
|    | — `DOMAIN=taskara.alt-f1.be` | |
|    | — `ATLASSIAN_CLIENT_ID` + `ATLASSIAN_CLIENT_SECRET` | |
|    | — `APP_SECRET_KEY` (random 64-char string: `openssl rand -base64 48`) | |
|    | — `JIRA_HOST`, `JIRA_EMAIL`, `JIRA_API_TOKEN` (for config validation) | |
|    | — `APP_ENV=production` | |
|    | — `AUTH_API_TOKEN_ENABLED=false` | |
|    | — `AUTH_OAUTH_ENABLED=true` | |
| 24 | `docker compose up -d` (Redis + Backend + Frontend + Watchtower) | ☐ |
| 25 | Verify: `curl http://localhost:8080/api/health` | ☐ |

## 🛡️ OpenAppSec WAF (15 min)

| # | Task | Done |
|---|------|------|
| 26 | Add `openappsec` service to docker-compose.yml: | ☐ |

```yaml
  openappsec:
    image: ghcr.io/openappsec/open-appsec-gateway:latest
    container_name: taskara-waf
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:80"
    environment:
      - BACKEND=http://frontend:80
      - LEARNING_MODE=false
      - LOG_LEVEL=info
    depends_on:
      - frontend
```

| # | Task | Done |
|---|------|------|
| 27 | Remove frontend port binding (`ports:` section) — WAF sits in front | ☐ |
| 28 | Update cloudflared config to point to WAF port (already `localhost:8080`) | ☐ |
| 29 | `docker compose up -d` + verify WAF logs: `docker logs taskara-waf --tail 20` | ☐ |

## 🔐 Atlassian OAuth (10 min)

| # | Task | Done |
|---|------|------|
| 30 | Go to [developer.atlassian.com](https://developer.atlassian.com/console/myapps/) | ☐ |
| 31 | Update OAuth callback URL to `https://taskara.alt-f1.be/auth/callback` | ☐ |
| 32 | Verify scopes are configured: | ☐ |
|    | — `read:jira-work`, `write:jira-work` | |
|    | — `manage:jira-project`, `read:jira-user` | |
|    | — `read:board-scope:jira-software`, `read:sprint:jira-software` | |
|    | — `write:sprint:jira-software`, `read:issue:jira-software` | |
|    | — `read:epic:jira-software`, `offline_access` | |

## 📊 Portainer — optional (5 min)

| # | Task | Done |
|---|------|------|
| 33 | Install Portainer CE (localhost only): | ☐ |

```bash
docker volume create portainer_data
docker run -d --name portainer --restart unless-stopped \
  -p 127.0.0.1:9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

| # | Task | Done |
|---|------|------|
| 34 | Access via SSH tunnel: `ssh -L 9443:localhost:9443 deploy@vps-ip` → `https://localhost:9443` | ☐ |

## ✅ Verification (10 min)

| # | Task | Done |
|---|------|------|
| 35 | Open `https://taskara.alt-f1.be` — login page loads with Taskara branding | ☐ |
| 36 | Click "Login with Atlassian" — OAuth flow completes, redirected to app | ☐ |
| 37 | Verify issues load in List view | ☐ |
| 38 | Switch to Board view — Kanban works | ☐ |
| 39 | Switch to Sprint Dashboard — sprints + charts show | ☐ |
| 40 | Check Cloudflare Analytics — traffic flowing through CDN | ☐ |
| 41 | Check WAF: `docker logs taskara-waf --tail 20` — OpenAppSec active | ☐ |
| 42 | Test rate limiting: `for i in $(seq 100); do curl -s -o /dev/null -w "%{http_code}\n" https://taskara.alt-f1.be/api/health; done | sort | uniq -c` | ☐ |
| 43 | Verify no ports exposed: `nmap -p 80,443 <vps-ip>` → filtered/closed | ☐ |
| 44 | Test Terms of Service page accessible | ☐ |
| 45 | Test Privacy Policy page accessible | ☐ |
| 46 | Test cookie consent banner appears | ☐ |

---

## 📁 Files Reference

| File | Purpose |
|------|---------|
| [`deploy/public/docker-compose.yml`](../deploy/public/docker-compose.yml) | Base compose (adapt for Cloudflare) |
| [`deploy/public/.env.example`](../deploy/public/.env.example) | All env vars documented |
| [`deploy/public/README.md`](../deploy/public/README.md) | Quick start guide |
| [`docs/SECURE_VPS_DEPLOYMENT.md`](./SECURE_VPS_DEPLOYMENT.md) | Detailed guide with all commands |

## 🚀 Post-Deploy

| Task | When |
|------|------|
| Monitor Cloudflare Analytics | Daily (first week) |
| Check `docker logs` for errors | Daily (first week) |
| Update `.env` → `APP_VERSION=vX.Y.Z` for pinned versions | On release |
| Watchtower auto-updates `:latest` images every 5 min | Automatic |
| Back up `.env` file | After any change |
| Review OpenAppSec WAF logs for false positives | Weekly |
| Rotate `APP_SECRET_KEY` if compromised | As needed (invalidates all sessions) |
