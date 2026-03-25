# Secure VPS Deployment Guide

Deploy Taskara on a hardened VPS (Contabo, OVHcloud, Hetzner) with Cloudflare Pro, OpenAppSec WAF, and zero exposed ports.

**Author**: Abdelkrim BOUJRAF — [ALT-F1 SRL](https://www.alt-f1.be), Brussels 🇧🇪

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

---

## 2. Initial Server Hardening

### 2.1 Create deploy user (no root)

```bash
# As root on fresh VPS
adduser deploy
usermod -aG sudo deploy

# SSH key auth only
mkdir -p /home/deploy/.ssh
# Paste your public key:
echo "ssh-ed25519 AAAA... your-key" > /home/deploy/.ssh/authorized_keys
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

### 2.2 Disable root login + password auth

```bash
cat > /etc/ssh/sshd_config.d/hardened.conf << 'EOF'
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
AllowUsers deploy
EOF

systemctl restart sshd
```

### 2.3 Firewall (UFW)

```bash
# BLOCK everything — no ports open!
# cloudflared creates outbound tunnels, no inbound needed
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh          # SSH only (port 22)
ufw enable
ufw status verbose
```

> **No port 80/443 needed** — Cloudflare Tunnel handles everything via outbound connections.

### 2.4 Automatic security updates

```bash
apt install unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

### 2.5 Fail2Ban

```bash
apt install fail2ban
cat > /etc/fail2ban/jail.local << 'EOF'
[sshd]
enabled = true
port = ssh
maxretry = 3
bantime = 3600
findtime = 600
EOF

systemctl enable fail2ban
systemctl start fail2ban
```

---

## 3. Docker + Portainer

### 3.1 Install Docker

```bash
# As deploy user
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker deploy
newgrp docker
```

### 3.2 Install Portainer CE

```bash
docker volume create portainer_data
docker run -d \
  --name portainer \
  --restart unless-stopped \
  -p 127.0.0.1:9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

# Access via SSH tunnel:
# ssh -L 9443:localhost:9443 deploy@your-vps-ip
# Then open https://localhost:9443 in your browser
```

> Portainer is bound to **localhost only** — not exposed to the internet. Access via SSH tunnel.

---

## 4. Cloudflare Setup

### 4.1 Add domain to Cloudflare

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Add site `alt-f1.be` (or your domain)
3. Update nameservers at your registrar to Cloudflare's
4. Enable **Cloudflare Pro** ($20/mo) for WAF rules + advanced DDoS

### 4.2 DNS record

```
Type: CNAME
Name: taskara
Target: <tunnel-id>.cfargotunnel.com
Proxy: ✅ (orange cloud — must be proxied)
```

### 4.3 SSL/TLS settings

- **Encryption mode**: Full (strict)
- **Always Use HTTPS**: On
- **Minimum TLS Version**: TLS 1.2
- **HSTS**: Enable (max-age 6 months, include subdomains)

### 4.4 Cloudflare WAF rules (Pro)

```
# Block common attacks
- OWASP Core Ruleset: Enabled
- Managed Rules: Cloudflare Managed Ruleset
- Rate Limiting: 100 requests/10 seconds per IP

# Custom rules
- Block access to /api/settings from non-authenticated IPs
- Challenge suspicious User-Agents
- Country block if needed (optional)
```

### 4.5 Create Cloudflare Tunnel

```bash
# On the VPS as deploy user
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install cloudflared

# Login and create tunnel
cloudflared tunnel login
cloudflared tunnel create taskara

# Note the tunnel ID (e.g., a1b2c3d4-...)
```

### 4.6 Tunnel config

```bash
mkdir -p /home/deploy/.cloudflared
cat > /home/deploy/.cloudflared/config.yml << 'EOF'
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
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## 5. Application Deployment

### 5.1 Directory structure

```bash
sudo mkdir -p /srv/taskara
sudo chown deploy:deploy /srv/taskara
cd /srv/taskara
```

### 5.2 Docker Compose

```bash
# Clone just the deploy config
git clone --depth 1 https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui.git /tmp/taskara-repo
cp /tmp/taskara-repo/deploy/public/docker-compose.yml .
cp /tmp/taskara-repo/deploy/public/.env.example .env
rm -rf /tmp/taskara-repo

# Edit config
nano .env
```

### 5.3 Modified docker-compose for Cloudflare (no Traefik needed!)

Since Cloudflare handles TLS, we don't need Traefik. Simplified compose:

```yaml
# /srv/taskara/docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    container_name: taskara-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --maxmemory 128mb --maxmemory-policy allkeys-lru

  backend:
    image: ghcr.io/alt-f1-openclaw/atlassian-jira-ui-backend:latest
    container_name: taskara-backend
    restart: unless-stopped
    dns: [1.1.1.1, 8.8.8.8]
    env_file: .env
    environment:
      - CORS_ORIGINS=https://taskara.alt-f1.be
      - REDIS_URL=redis://redis:6379/0
      - APP_ENV=production
    depends_on:
      - redis

  frontend:
    image: ghcr.io/alt-f1-openclaw/atlassian-jira-ui-frontend:latest
    container_name: taskara-frontend
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:80"   # Only localhost — cloudflared connects here
    depends_on:
      - backend

  # OpenAppSec WAF (optional — sits between cloudflared and frontend)
  # See section 6 below

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
```

> **Note**: Frontend port bound to `127.0.0.1:8080` — not exposed to the internet. Only cloudflared can reach it.

### 5.4 Start

```bash
docker compose up -d
```

---

## 6. OpenAppSec WAF (Optional)

Add ML-based web application firewall in front of the frontend:

```yaml
  # Add to docker-compose.yml
  openappsec:
    image: ghcr.io/openappsec/open-appsec-gateway:latest
    container_name: taskara-waf
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:80"   # cloudflared → WAF → frontend
    environment:
      - BACKEND=http://frontend:80
      - LEARNING_MODE=false
      - LOG_LEVEL=info
    depends_on:
      - frontend
```

If using OpenAppSec, update `frontend` to remove its port binding (WAF sits in front):

```yaml
  frontend:
    # Remove ports: section — WAF handles incoming traffic
    ...
```

And update cloudflared config to point to the WAF port:

```yaml
  - hostname: taskara.alt-f1.be
    service: http://localhost:8080   # → OpenAppSec → frontend → backend
```

**OpenAppSec docs**: [docs.openappsec.io](https://docs.openappsec.io/)

---

## 7. Monitoring & Maintenance

### Health checks

```bash
# Check all containers
docker compose ps

# Check app health
curl -s http://localhost:8080/api/health | jq

# Check cloudflared tunnel
cloudflared tunnel info taskara

# Check Cloudflare dashboard for traffic/threats
```

### Updates

```bash
# Automatic: Watchtower pulls new :latest images every 5 min

# Manual (pin version):
# In .env: APP_VERSION=v1.62.4
docker compose pull && docker compose up -d

# OS updates
sudo apt update && sudo apt upgrade -y
```

### Backups

```bash
# Only .env needs backup (contains secrets)
cp /srv/taskara/.env /srv/taskara/.env.backup.$(date +%F)

# Redis data is ephemeral (sessions auto-expire)
# No Jira data stored — nothing else to back up
```

### Log rotation

```bash
# Docker logs auto-rotate with default driver
# Check container logs:
docker logs taskara-backend --tail 50
docker logs taskara-frontend --tail 50
docker logs taskara-waf --tail 50  # if using OpenAppSec
```

---

## 8. Security Checklist

| Item | Status |
|------|--------|
| SSH key-only auth, root disabled | ☐ |
| Firewall: only port 22 open | ☐ |
| Fail2Ban on SSH | ☐ |
| Automatic security updates | ☐ |
| Docker installed (non-root user) | ☐ |
| Portainer on localhost only (SSH tunnel) | ☐ |
| Cloudflare Pro with WAF rules | ☐ |
| Cloudflare Tunnel (no ports 80/443) | ☐ |
| SSL Full (Strict) mode | ☐ |
| HSTS enabled | ☐ |
| APP_ENV=production (API Token disabled) | ☐ |
| APP_SECRET_KEY changed from default | ☐ |
| Redis on internal network only | ☐ |
| Frontend bound to 127.0.0.1 only | ☐ |
| OpenAppSec WAF (optional) | ☐ |
| Watchtower auto-update enabled | ☐ |

---

## 9. Cost Estimate

| Service | Monthly Cost |
|---------|-------------|
| VPS (Hetzner CX22) | ~€4 |
| Cloudflare Pro | ~€18 ($20) |
| Domain (.be) | ~€1 (amortized) |
| **Total** | **~€23/mo** |

Contabo/OVHcloud options are slightly more expensive for the VPS but offer more resources.

---

## 10. Differences from Pi Deployment

| Feature | Raspberry Pi | Secure VPS |
|---------|-------------|------------|
| Access | Tailscale (private) | Public internet |
| TLS | Tailscale certs | Cloudflare (Let's Encrypt not needed) |
| WAF | None | Cloudflare Pro + OpenAppSec |
| DDoS | None | Cloudflare |
| Ports open | 4443, 9443 | **None** (SSH only) |
| Reverse proxy | Traefik | Cloudflare Tunnel |
| Management | SSH | Portainer + SSH |
| Sessions | File-based | Redis |
| Auto-update | Watchtower (dev only) | Watchtower (all) |
