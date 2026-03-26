# Secure VPS Deployment Guide

Deploy Taskara on a hardened VPS (Contabo, OVHcloud, Hetzner) with Cloudflare Pro, OpenAppSec WAF, and zero exposed ports.

**Author**: Abdelkrim BOUJRAF — [ALT-F1 SRL](https://www.alt-f1.be), Brussels 🇧🇪

---

## User Reference

Every command shows which user runs it:

| Prompt | User | Context |
|--------|------|---------|
| `root#` | `root` | Initial VPS setup only (steps 2.1–2.5) |
| `deploy$` | `deploy` | Everything else — Docker, app, cloudflared |
| `local$` | Your laptop | SSH, Ansible, Cloudflare Tunnel login |

> **Rule**: After section 2, you should **never SSH as root again**. All tasks use the `deploy` user with `sudo` when needed.

---

## Architecture

```
Internet → Cloudflare Pro (CDN + WAF + DDoS)
                │
          cloudflared tunnel (encrypted)
                │
          ┌─────▼──────┐
          │   VPS       │  No ports open (80/443 closed!)
          │             │
          │  Portainer ──── :9443 (localhost only, SSH tunnel)
          │             │
          │  ┌────────────────────────────┐
          │  │ Docker Compose             │
          │  │                            │
          │  │  OpenAppSec ← cloudflared  │
          │  │      │                     │
          │  │  Frontend (nginx)          │
          │  │      │                     │
          │  │  Backend (FastAPI)         │
          │  │      │                     │
          │  │  Redis (sessions)          │
          │  │                            │
          │  │  Watchtower (auto-update)  │
          │  └────────────────────────────┘
          └──────────────┘
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed diagrams of all deployment variants.

**Key principle**: No ports exposed to the internet. All traffic flows through Cloudflare Tunnel.

---

## 1. VPS Provider Setup

### Recommended specs

| Provider | Plan | CPU | RAM | Storage | Price |
|----------|------|-----|-----|---------|-------|
| **Hetzner** | CX22 | 2 vCPU | 4 GB | 40 GB NVMe | ~€4/mo |
| **Contabo** | VPS S | 4 vCPU | 8 GB | 200 GB | ~€6/mo |
| **OVHcloud** | VPS Starter | 2 vCPU | 4 GB | 40 GB | ~€6/mo |

- **OS**: Ubuntu 24.04 LTS (or Debian 12)
- **Location**: EU (Frankfurt, Düsseldorf, Gravelines) for GDPR compliance
- **IPv4**: Required for Cloudflare Tunnel
- **SSH key**: Add your public key during provisioning

---

## 2. Initial Server Hardening

> ⚠️ **All commands in this section run as `root`** — this is the only time you use root.

### 2.1 Create deploy user

```bash
root# adduser deploy
root# usermod -aG sudo deploy

root# mkdir -p /home/deploy/.ssh
root# echo "ssh-ed25519 AAAA... your-public-key" > /home/deploy/.ssh/authorized_keys
root# chmod 700 /home/deploy/.ssh
root# chmod 600 /home/deploy/.ssh/authorized_keys
root# chown -R deploy:deploy /home/deploy/.ssh
```

### 2.2 Disable root login + password auth

> ⚠️ **CRITICAL — `AllowUsers` locks out ALL users not listed!**
> If your VPS has other SSH users (e.g., `ubuntu`, `admin`, your personal account), you **must** add them to the `AllowUsers` line or they will be permanently locked out after `sshd` restarts.
>
> **Check existing users first:**
> ```bash
> root# grep -E '/bin/(bash|sh|zsh)' /etc/passwd | cut -d: -f1
> ```
> Add every user that needs SSH access to the `AllowUsers` line below.

```bash
root# cat > /etc/ssh/sshd_config.d/hardened.conf << 'EOF'
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
# ⚠️ Add ALL users who need SSH access — unlisted users are LOCKED OUT!
# Example with multiple users: AllowUsers deploy ubuntu admin
AllowUsers deploy
EOF

root# systemctl restart sshd
```

> ⚠️ **Before closing this SSH session**, open a **new terminal** and verify:
> ```bash
> local$ ssh deploy@YOUR_VPS_IP    # Must work!
> ```
> If it fails, you still have the root session open to fix it. **Never close root until deploy SSH works.**

### 2.3 Firewall (UFW)

```bash
root# apt install -y ufw
root# ufw default deny incoming
root# ufw default allow outgoing
root# ufw allow ssh
root# ufw enable
root# ufw status verbose
```

> **No port 80/443 needed** — Cloudflare Tunnel creates outbound connections only.

### 2.4 Automatic security updates

```bash
root# apt install -y unattended-upgrades
root# dpkg-reconfigure -plow unattended-upgrades
```

### 2.5 Fail2Ban

```bash
root# apt install -y fail2ban
root# cat > /etc/fail2ban/jail.local << 'EOF'
[sshd]
enabled = true
port = ssh
maxretry = 3
bantime = 3600
findtime = 600
EOF

root# systemctl enable fail2ban
root# systemctl start fail2ban
```

> ✅ **Root is done.** Log out and SSH as `deploy` from now on.
> ```bash
> root# exit
> local$ ssh deploy@YOUR_VPS_IP
> ```

---

## 3. Docker + Portainer

> All commands from here run as `deploy` (use `sudo` when needed).

### 3.1 Install Docker

```bash
deploy$ curl -fsSL https://get.docker.com | sh
deploy$ sudo usermod -aG docker deploy
deploy$ newgrp docker

# Verify
deploy$ docker --version
deploy$ docker compose version
```

### 3.2 Install Portainer CE (optional)

```bash
deploy$ docker volume create portainer_data
deploy$ docker run -d \
  --name portainer \
  --restart unless-stopped \
  -p 127.0.0.1:9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

> Portainer bound to **localhost only**. Access via SSH tunnel from your laptop:
> ```bash
> local$ ssh -L 9443:localhost:9443 deploy@YOUR_VPS_IP
> # Then open https://localhost:9443 in your browser
> ```

---

## 4. Cloudflare Setup

### 4.1 Add domain to Cloudflare

> These steps are done in the **Cloudflare web dashboard** (not on the VPS).

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Add site `alt-f1.be` (or your domain)
3. Update nameservers at your registrar to Cloudflare's
4. Upgrade to **Cloudflare Pro** ($20/mo) for WAF rules + advanced DDoS

### 4.2 SSL/TLS settings (Cloudflare dashboard)

- **Encryption mode**: Full (strict)
- **Always Use HTTPS**: On
- **Minimum TLS Version**: TLS 1.2
- **HSTS**: Enable (max-age 6 months, include subdomains)

### 4.3 Cloudflare WAF rules (Cloudflare dashboard, Pro plan)

- OWASP Core Ruleset: **Enabled**
- Managed Rules: Cloudflare Managed Ruleset
- Rate Limiting: **100 requests/10 seconds per IP**
- Challenge suspicious User-Agents (optional)

### 4.4 Create Cloudflare Tunnel

```bash
# On your LAPTOP first (one-time auth):
local$ cloudflared tunnel login
# This opens a browser to authenticate with Cloudflare

local$ cloudflared tunnel create taskara
# Output: Created tunnel taskara with id a1b2c3d4-...
# Note the tunnel ID!

# Copy the credentials file to the VPS:
local$ scp ~/.cloudflared/a1b2c3d4-....json deploy@YOUR_VPS_IP:~/
```

### 4.5 DNS record (Cloudflare dashboard)

```
Type: CNAME
Name: taskara
Target: <tunnel-id>.cfargotunnel.com
Proxy: ✅ (orange cloud — must be proxied)
```

### 4.6 Configure cloudflared on VPS

```bash
deploy$ sudo apt update && sudo apt install -y cloudflared

deploy$ mkdir -p ~/.cloudflared
deploy$ mv ~/a1b2c3d4-....json ~/.cloudflared/

deploy$ cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: <TUNNEL_ID>
credentials-file: /home/deploy/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: taskara.alt-f1.be
    service: http://localhost:8080
    originRequest:
      noTLSVerify: true
  - service: http_status:404
EOF
```

### 4.7 Run cloudflared as service

```bash
deploy$ sudo cloudflared service install
deploy$ sudo systemctl enable cloudflared
deploy$ sudo systemctl start cloudflared

# Verify
deploy$ sudo systemctl status cloudflared
deploy$ cloudflared tunnel info taskara
```

---

## 5. Application Deployment

### 5.1 Create app directory

```bash
deploy$ sudo mkdir -p /srv/taskara
deploy$ sudo chown deploy:deploy /srv/taskara
deploy$ cd /srv/taskara
```

### 5.2 Get deployment files

```bash
deploy$ git clone --depth 1 https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui.git /tmp/taskara-repo
deploy$ cp /tmp/taskara-repo/deploy/public/.env.example .env
deploy$ rm -rf /tmp/taskara-repo
```

### 5.3 Create docker-compose.yml

```bash
deploy$ cat > /srv/taskara/docker-compose.yml << 'YAML'
services:
  redis:
    image: redis:7-alpine
    container_name: taskara-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --maxmemory 128mb --maxmemory-policy allkeys-lru

  backend:
    image: ghcr.io/alt-f1-openclaw/atlassian-jira-ui-backend:${APP_VERSION:-latest}
    container_name: taskara-backend
    restart: unless-stopped
    dns: [1.1.1.1, 8.8.8.8]
    env_file: .env
    environment:
      - CORS_ORIGINS=https://${DOMAIN:-taskara.alt-f1.be}
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis

  frontend:
    image: ghcr.io/alt-f1-openclaw/atlassian-jira-ui-frontend:${APP_VERSION:-latest}
    container_name: taskara-frontend
    restart: unless-stopped
    environment:
      - BACKEND_HOST=backend
    depends_on:
      - backend

  watchtower:
    image: containrrr/watchtower:latest
    container_name: taskara-watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - WATCHTOWER_POLL_INTERVAL=300
      - WATCHTOWER_CLEANUP=true

volumes:
  redis-data:
YAML
```

> **Note**: No Traefik — Cloudflare handles TLS. Frontend port is NOT exposed — OpenAppSec (next section) or direct cloudflared handles routing.

### 5.4 Configure .env

```bash
deploy$ nano /srv/taskara/.env
```

Minimal production `.env`:

```env
DOMAIN=taskara.alt-f1.be
ATLASSIAN_CLIENT_ID=your-client-id
ATLASSIAN_CLIENT_SECRET=your-client-secret
APP_SECRET_KEY=<run: openssl rand -base64 48>
APP_ENV=production
AUTH_API_TOKEN_ENABLED=false
AUTH_OAUTH_ENABLED=true
```

Generate the secret key:

```bash
deploy$ openssl rand -base64 48
# Paste the output as APP_SECRET_KEY value
```

### 5.5 Start the application

```bash
deploy$ cd /srv/taskara
deploy$ docker compose up -d

# Verify
deploy$ docker compose ps
deploy$ curl -s http://localhost:8080/api/health | jq
```

> If not using OpenAppSec, add `ports: ["127.0.0.1:8080:80"]` to the `frontend` service.

---

## 6. OpenAppSec WAF (Optional)

> Run as `deploy`. Adds ML-based web application firewall.

### 6.1 Add WAF to docker-compose.yml

```bash
deploy$ cat >> /srv/taskara/docker-compose.yml << 'YAML'

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
YAML
```

### 6.2 Remove frontend port (WAF sits in front)

If frontend has `ports:`, remove that section — OpenAppSec handles port 8080 now.

### 6.3 Restart

```bash
deploy$ cd /srv/taskara
deploy$ docker compose up -d

# Verify WAF
deploy$ docker logs taskara-waf --tail 10
```

**OpenAppSec docs**: [docs.openappsec.io](https://docs.openappsec.io/)

---

## 7. Atlassian OAuth Setup

> Done in the **Atlassian developer console** (not on the VPS).

1. Go to [developer.atlassian.com/console/myapps](https://developer.atlassian.com/console/myapps/)
2. Select your OAuth app (or create one)
3. Set **Callback URL**: `https://taskara.alt-f1.be/auth/callback`
4. Verify scopes: `read:jira-work`, `write:jira-work`, `manage:jira-project`, `read:jira-user`, `offline_access`, Jira Software scopes

---

## 8. Monitoring & Maintenance

> All commands run as `deploy`.

### Health checks

```bash
deploy$ docker compose ps                                    # Container status
deploy$ curl -s http://localhost:8080/api/health | jq         # App health
deploy$ cloudflared tunnel info taskara                       # Tunnel status
deploy$ docker logs taskara-backend --tail 20                 # Backend logs
deploy$ docker logs taskara-waf --tail 20                     # WAF logs (if enabled)
```

### Updates

```bash
# Automatic: Watchtower pulls new :latest images every 5 min

# Manual update:
deploy$ cd /srv/taskara
deploy$ docker compose pull
deploy$ docker compose up -d

# Pin to specific version:
# Edit .env: APP_VERSION=v1.62.5
deploy$ docker compose up -d

# OS security updates:
deploy$ sudo apt update && sudo apt upgrade -y
```

### Backups

```bash
# Only .env needs backup (contains secrets)
deploy$ cp /srv/taskara/.env /srv/taskara/.env.backup.$(date +%F)

# Redis data is ephemeral (sessions auto-expire after 7 days)
# No Jira data stored server-side — nothing else to back up
```

---

## 9. Security Checklist

| # | Item | User | Done |
|---|------|------|------|
| 1 | Deploy user created, root SSH disabled | root (once) | ☐ |
| 2 | SSH key-only auth, password disabled | root (once) | ☐ |
| 3 | UFW firewall: only port 22 open | root (once) | ☐ |
| 4 | Fail2Ban on SSH | root (once) | ☐ |
| 5 | Automatic security updates | root (once) | ☐ |
| 6 | Docker installed for `deploy` user | deploy | ☐ |
| 7 | Portainer on localhost only (SSH tunnel) | deploy | ☐ |
| 8 | Cloudflare Pro with WAF rules | Cloudflare dashboard | ☐ |
| 9 | Cloudflare Tunnel (no ports 80/443) | deploy | ☐ |
| 10 | SSL Full (Strict) + HSTS | Cloudflare dashboard | ☐ |
| 11 | APP_ENV=production (API Token disabled) | deploy (.env) | ☐ |
| 12 | APP_SECRET_KEY changed from default | deploy (.env) | ☐ |
| 13 | Redis on internal Docker network only | deploy (compose) | ☐ |
| 14 | Frontend/WAF bound to 127.0.0.1 only | deploy (compose) | ☐ |
| 15 | OpenAppSec WAF active (optional) | deploy | ☐ |
| 16 | Watchtower auto-update enabled | deploy (compose) | ☐ |
| 17 | OAuth callback URL configured | Atlassian console | ☐ |

---

## 10. Cost Estimate

| Service | Monthly Cost |
|---------|-------------|
| VPS (Hetzner CX22) | ~€4 |
| Cloudflare Pro | ~€18 ($20) |
| Domain (.be) | ~€1 (amortized) |
| **Total** | **~€23/mo** |

---

## 11. Automation

For fully automated deployment, use the **Ansible playbook**:

```bash
local$ cd deploy/ansible
local$ cp hosts.example hosts && nano hosts        # Set VPS IP
local$ cp group_vars/all.example.yml group_vars/all.yml && nano group_vars/all.yml  # Set secrets
local$ ansible-playbook -i hosts site.yml          # Full deploy
```

See [deploy/ansible/README.md](../deploy/ansible/README.md) for details.

---

## Quick Reference — Who Does What

| Task | User | When |
|------|------|------|
| Create deploy user, harden SSH, UFW, Fail2Ban | `root` | First setup only |
| Install Docker | `deploy` (with sudo) | First setup only |
| Install/configure cloudflared | `deploy` (with sudo for service) | First setup only |
| Deploy app (docker compose) | `deploy` | First setup + updates |
| Update containers | `deploy` | Ongoing (or Watchtower auto) |
| Manage .env secrets | `deploy` | As needed |
| OS updates | `deploy` (with sudo) | Monthly |
| Cloudflare WAF/DNS/SSL config | Browser (Cloudflare dashboard) | First setup |
| Atlassian OAuth config | Browser (Atlassian console) | First setup |
| Access Portainer | `local` (SSH tunnel) | As needed |
