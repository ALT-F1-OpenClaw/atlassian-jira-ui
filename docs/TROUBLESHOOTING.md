# Troubleshooting Guide — Taskara

Common issues and their solutions.

---

## Authentication

### "OAuth callback failed — /auth/ routes not configured"

**Cause**: nginx or Traefik isn't routing `/auth/*` to the backend.

**Fix**:
```bash
# Pi deployment — update configs:
cd /srv/atlassian-jira-ui
curl -sO https://raw.githubusercontent.com/ALT-F1-OpenClaw/atlassian-jira-ui/main/deploy/update-config.sh
bash update-config.sh

# Docker — pull latest image (nginx.conf baked in since v1.62.1):
docker compose pull && docker compose up -d
```

### Login loops back to login page (no error shown)

**Cause**: Session cookie not being set (SameSite/Secure mismatch).

**Check**:
```bash
docker logs prod-backend --tail 30 | grep -i "auth\|session\|cookie"
```

**Common fixes**:
- Ensure `X-Forwarded-Proto: https` is set by your reverse proxy
- Check that the OAuth callback URL in [developer.atlassian.com](https://developer.atlassian.com) matches your deployment URL exactly
- Clear browser cookies and try again

### "TypeError: 'coroutine' object is not subscriptable"

**Cause**: Running backend version older than v1.62.2 (async session bug).

**Fix**: Upgrade to v1.62.2+:
```bash
./deploy-prod.sh v1.62.4  # or latest
```

---

## Sprints

### Sprint shows 0 issues despite having items in Jira

**Cause**: Agile API (`/sprint/{id}/issue`) returns empty for some project types (company-managed, OAuth without Jira Software scopes).

**Fix**: Upgrade to v1.62.4+ (JQL fallback added).

### Only 2 sprints shown with "All" filter

**Cause**: Agile API only returns sprints from boards visible to the current user. Some boards (Kanban-only) don't support sprints.

**Workaround**: The Platform API fallback (`JQL: sprint in closedSprints()`) handles most cases. If sprints are still missing, check that the board has sprint support enabled in Jira.

---

## Deployment

### "Bad Gateway" (502) after deploy

**Cause**: nginx can't reach the backend, or envsubst failed.

**Check**:
```bash
docker logs prod-frontend --tail 20
# Look for "Read-only file system" or "host not found"
```

**Fix**: If you see "Read-only file system":
```bash
# Old docker-compose has volume mount conflicting with baked config
# Remove the nginx.conf volume mount and add BACKEND_HOST:
# In docker-compose.yml, for frontend service:
#   environment:
#     - BACKEND_HOST=prod-backend
# Remove:
#   volumes:
#     - ./prod/nginx.conf:/etc/nginx/conf.d/default.conf:ro

docker compose up -d --force-recreate
```

### Watchtower doesn't update containers

**Check**:
```bash
docker logs watchtower --tail 30
```

**Common causes**:
- Container missing `com.centurylinklabs.watchtower.enable=true` label
- GHCR images not yet built (check [GitHub Actions](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/actions))
- Docker API version mismatch (set `DOCKER_API_VERSION=1.47`)

### Docker images not found on GHCR

**Cause**: Multi-arch build takes 5-10 minutes after tag push.

**Check**: <https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/actions/workflows/publish-docker.yml>

Wait for the workflow to complete, then:
```bash
docker pull ghcr.io/alt-f1-openclaw/atlassian-jira-ui-frontend:v1.62.4
```

---

## Performance

### Slow page load

**Check**: Browser DevTools → Network tab
- If Jira API calls are slow (>2s), the bottleneck is Jira Cloud, not Taskara
- Check rate limiting: `429` responses mean you're hitting Jira's limits

**Mitigations**:
- Smart caching is enabled (CACHE_STATIC: 30min, CACHE_LIST: 2min, CACHE_DETAIL: 1min)
- Reduce concurrent users per Jira site
- Check Jira Cloud status: [status.atlassian.com](https://status.atlassian.com)

### High memory usage

**Expected**:
- Backend: ~50-100 MB
- Frontend (nginx): ~10-20 MB
- Redis: ~30-50 MB

If significantly higher:
```bash
docker stats --no-stream
```

---

## Development

### Tests failing locally

```bash
# Frontend — make sure dependencies are installed:
cd frontend && npm install && npm test

# Backend — needs env vars:
cd backend && source .venv/bin/activate
JIRA_HOST=https://test.atlassian.net JIRA_EMAIL=t@t.com JIRA_API_TOKEN=t APP_SECRET_KEY=t python -m pytest tests/ -v

# E2E — needs build first:
cd frontend && npm run build && npx playwright test
```

### TypeScript errors after pulling

```bash
cd frontend && rm -rf node_modules && npm install
npx --no-install tsc --noEmit
```

### Playwright tests fail with "service worker" errors

PWA service worker intercepts mocked API routes. Tests should disable it:
```typescript
// Already handled in e2e/fixtures.ts — block sw.js, registerSW.js, workbox-*.js
```

---

## Getting Help

- **GitHub Issues**: <https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/new/choose>
- **Security**: See [SECURITY.md](../SECURITY.md) for vulnerability reporting
- **Docs**: Check [docs/](.) for guides and ADRs
