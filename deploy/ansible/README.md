# Ansible Deployment — Taskara

Automated deployment of Taskara on a fresh VPS with Cloudflare Tunnel + OpenAppSec WAF.

## Prerequisites

On your **local machine** (not the VPS):

```bash
# Install Ansible
pip install ansible

# Or on macOS:
brew install ansible
```

- A VPS with Ubuntu 24.04 LTS (Hetzner, Contabo, OVHcloud)
- SSH key access to the VPS (root or sudo user)
- A Cloudflare account with `alt-f1.be` added
- Cloudflare Tunnel credentials (see step 3 below)

## Quick Start

### 1. Configure inventory

```bash
cp hosts.example hosts
nano hosts   # Set your VPS IP
```

### 2. Configure variables

```bash
cp group_vars/all.example.yml group_vars/all.yml
nano group_vars/all.yml   # Fill in secrets
```

### 3. Get Cloudflare Tunnel credentials

```bash
# On your local machine (one-time):
cloudflared tunnel login
cloudflared tunnel create taskara
# Note the tunnel ID and credentials file path
# Copy the credentials JSON content to group_vars/all.yml
```

### 4. Run the playbook

```bash
# Full deployment (first time):
ansible-playbook -i hosts site.yml

# Only update the app (redeploy containers):
ansible-playbook -i hosts site.yml --tags app

# Only update configs:
ansible-playbook -i hosts site.yml --tags config
```

## What It Does

| Role | Tasks |
|------|-------|
| **common** | Deploy user, SSH hardening, UFW firewall, Fail2Ban, auto-updates |
| **docker** | Install Docker Engine, add deploy user to docker group |
| **cloudflared** | Install cloudflared, configure tunnel, enable systemd service |
| **app** | Create /srv/taskara, deploy docker-compose + .env, start containers |
| **openappsec** | Add OpenAppSec WAF container, wire to frontend |
| **portainer** | Install Portainer CE on localhost (optional) |

## Tags

```bash
ansible-playbook -i hosts site.yml --tags common      # Server hardening only
ansible-playbook -i hosts site.yml --tags docker       # Docker install only
ansible-playbook -i hosts site.yml --tags cloudflared  # Tunnel setup only
ansible-playbook -i hosts site.yml --tags app          # App deployment only
ansible-playbook -i hosts site.yml --tags openappsec   # WAF only
ansible-playbook -i hosts site.yml --tags portainer    # Portainer only
ansible-playbook -i hosts site.yml --tags config       # Update configs only
ansible-playbook -i hosts site.yml --tags update       # Pull latest images + restart
```

## Idempotent

All tasks are idempotent — you can run the playbook multiple times safely. It only changes what's needed.
