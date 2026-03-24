#!/bin/bash
# Taskara — Update deployment configs from git
#
# Run from the deploy directory on the Pi:
#   cd /srv/atlassian-jira-ui && bash update-config.sh
#
# What it does:
#   1. Clones latest configs from git (shallow, temp dir)
#   2. Updates traefik/dynamic.yml and nginx configs
#   3. Preserves .env files (never overwritten)
#   4. Restarts affected containers
#   5. Cleans up

set -euo pipefail

REPO="https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui.git"
DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
TMP_DIR=$(mktemp -d)

echo "📦 Fetching latest configs from git..."
git clone --depth 1 "$REPO" "$TMP_DIR" 2>/dev/null

echo ""
echo "📋 Updating configs..."

# Traefik dynamic config
if [ -f "$DEPLOY_DIR/traefik/dynamic.yml" ]; then
    cp "$TMP_DIR/deploy/traefik/dynamic.yml" "$DEPLOY_DIR/traefik/dynamic.yml"
    echo "  ✅ traefik/dynamic.yml updated"
fi

# Traefik static config
if [ -f "$DEPLOY_DIR/traefik/traefik.yml" ]; then
    cp "$TMP_DIR/deploy/traefik/traefik.yml" "$DEPLOY_DIR/traefik/traefik.yml"
    echo "  ✅ traefik/traefik.yml updated"
fi

# Docker compose
cp "$TMP_DIR/deploy/docker-compose.yml" "$DEPLOY_DIR/docker-compose.yml"
echo "  ✅ docker-compose.yml updated"

# Nginx configs — generate from template for each environment
TEMPLATE="$TMP_DIR/deploy/nginx.conf.template"
if [ -f "$TEMPLATE" ]; then
    for env in prod dev; do
        if [ -d "$DEPLOY_DIR/$env" ]; then
            sed "s/\${BACKEND_HOST}/$env-backend/g" "$TEMPLATE" > "$DEPLOY_DIR/$env/nginx.conf"
            echo "  ✅ $env/nginx.conf updated"
        fi
    done
fi

# Deploy script
if [ -f "$TMP_DIR/deploy/deploy-prod.sh" ]; then
    cp "$TMP_DIR/deploy/deploy-prod.sh" "$DEPLOY_DIR/deploy-prod.sh"
    chmod +x "$DEPLOY_DIR/deploy-prod.sh"
    echo "  ✅ deploy-prod.sh updated"
fi

echo ""
echo "⚠️  .env files NOT touched (secrets preserved)"

# Cleanup
rm -rf "$TMP_DIR"

echo ""
echo "🔄 Restarting containers..."
cd "$DEPLOY_DIR"
docker compose restart traefik dev-frontend prod-frontend
docker compose up -d --remove-orphans

echo ""
echo "✅ Done! Configs updated and containers restarted."
echo ""
echo "Verify:"
echo "  docker compose ps"
echo "  curl -sI https://atlf1be-raspberry-pi-4.tail981e59.ts.net:9443/auth/login | head -5"
