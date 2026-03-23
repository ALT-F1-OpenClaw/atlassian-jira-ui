# Known Limitations

Documented issues and constraints in the current version.

## Board View: Maximum 100 Issues (Roadmap #62)

**Impact**: Board and List views display at most 100 issues per project. If a project has more than 100 issues (e.g., 109), only the first 100 are shown.

**Cause**: Jira Cloud's search API (`/rest/api/3/search/jql`) returns a maximum of 100 results per request, regardless of the `maxResults` parameter value.

**Workaround**: Use filters (Type, Status, Assignee) to narrow down the issue list below 100.

**UI Indicator**: The board view shows a warning banner when issues are truncated:
```
⚠ Showing 100 of 109 — some issues are not displayed
```

**Status**: Accepted limitation. A warning banner is shown when issues are truncated. For projects with >100 issues, use the regular Jira UI.

---

## OAuth: Agile API Scope Limitations

**Impact**: When using OAuth 2.0 authentication, the Jira Agile API (`/rest/agile/1.0/*`) may return `401 Unauthorized; scope does not match` even with the correct scopes configured.

**Cause**: The granular Agile scopes (`read:board-scope:jira-software`, etc.) require the **Jira Software** product to be explicitly enabled on the Atlassian instance. Some Jira instances (particularly Jira Free) do not have Jira Software as a separate product.

**Workaround**: The app automatically falls back to the Platform API (`/rest/api/3/search/jql`) using JQL functions like `sprint in openSprints()`. Sprint data is extracted from `customfield_10020`. This fallback is transparent — the UI works the same.

**Limitation of fallback**:
- Sprint CRUD operations (create, start, complete, delete) still require the Agile API
- Board names are not available from the Platform API

**Related**: ADR-016 (Platform API fallback for sprints)

---

## OAuth: Session Persistence

**Impact**: OAuth sessions are stored in a JSON file (`sessions.json`). This is not suitable for horizontal scaling (multiple backend instances).

**Cause**: Production deployment currently uses a single backend instance with file-based session storage.

**Fix planned**: Roadmap #59 — Replace file-based sessions with Redis for atomic operations and horizontal scaling.

---

## Firefox: Tailscale TLS Certificate Warning

**Impact**: Firefox shows a certificate warning when accessing the app via Tailscale URLs (`*.ts.net`).

**Cause**: Firefox uses its own certificate store and does not trust Tailscale's root CA by default. Chrome and Edge trust it automatically via the system certificate store.

**Fix**: In Firefox, go to `about:config` → set `security.enterprise_roots.enabled` to `true`. This makes Firefox trust system-installed certificates including Tailscale's. One-time setting.

**For production**: Use Let's Encrypt certificates (trusted by all browsers) instead of Tailscale certs. See `docs/PRODUCTION_DEPLOYMENT.md`.

---

## Service Worker: Stale Cache After Auth Changes

**Impact**: If authentication mode changes (e.g., switching from API Token to OAuth), the service worker may serve cached error responses.

**Fix applied** (v1.56.11): Service worker now only caches `200 OK` responses. Error responses (401, 500) are never cached. `/auth/*` routes are excluded from navigation cache.

**If it still occurs**: Hard refresh (`Ctrl+Shift+R`) or open in a private/incognito window.

---

## Jira URL Patterns: Project Type Dependent

**Impact**: "Open in Jira" links (↗) must use different URL paths depending on the project type.

**Current support**:
| Project Type | URL Pattern | Status |
|---|---|---|
| Team-managed software | `/jira/software/projects/{key}/boards/{id}` | ✅ |
| Company-managed software | `/jira/software/c/projects/{key}/boards/{id}` | ✅ |
| Team-managed business | `/jira/core/projects/{key}/board` | ✅ |
| Company-managed business | `/jira/core/projects/{key}/board` | ⚠️ Untested |
| Jira Service Management | `/jira/servicedesk/projects/{key}/...` | 🔲 Planned (#60) |
| Jira Product Discovery | `/jira/discovery/projects/{key}/...` | 🔲 Planned (#61) |

**Related**: ADR-018 (Jira URL construction rules)
