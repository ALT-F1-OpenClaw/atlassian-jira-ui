#!/bin/bash
# Deploy a specific version to production
# Usage: ./deploy-prod.sh v1.49.1

set -euo pipefail

VERSION="${1:-}"

if [ -z "$VERSION" ]; then
  echo "Usage: ./deploy-prod.sh <version>"
  echo "Example: ./deploy-prod.sh v1.49.1"
  echo ""
  echo "Current prod version:"
  docker inspect prod-backend --format '{{.Config.Image}}' 2>/dev/null || echo "  not running"
  exit 1
fi

# Strip leading 'v' if present (GHCR tags don't have it)
TAG="${VERSION#v}"

echo "🚀 Deploying v${TAG} to production..."
echo ""

# Update .env with version
echo "PROD_VERSION=${TAG}" > /srv/atlassian-jira-ui/.env

# Pull specific version
echo "📦 Pulling images..."
docker compose -f /srv/atlassian-jira-ui/docker-compose.yml pull prod-backend prod-frontend

# Restart prod containers
echo "🔄 Restarting prod containers..."
docker compose -f /srv/atlassian-jira-ui/docker-compose.yml up -d prod-backend prod-frontend

# Verify
echo ""
echo "✅ Production deployed!"
echo ""
docker ps --filter name=prod --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
echo ""

# Health check
sleep 3
HEALTH=$(curl -sk https://localhost:4443/api/health 2>/dev/null || echo '{"status":"error"}')
echo "Health: ${HEALTH}"
