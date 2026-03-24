# ADR-019: Per-User Jira Site Selection

**Status**: Accepted
**Date**: 2026-03-24
**Deciders**: Abdelkrim BOUJRAF

## Context

Users who authenticate via OAuth 2.0 may have access to multiple Jira Cloud sites (e.g., a personal site and a company site). After login, Atlassian's `accessible-resources` API returns all sites the user can access.

Previously, the app auto-selected the first site (`resources[0]`) after OAuth callback, and users could switch sites via a small menu item buried in the user avatar dropdown. This was not discoverable — many users wouldn't realize they could switch sites, especially on first login.

## Decision

Implement a **site picker screen** shown after OAuth login when the user has access to multiple Jira sites. The picker appears between the login redirect and the main application.

### Architecture

```
OAuth Callback → auto-select resources[0] → site picker (if >1 sites) → main app
                                           → main app (if 1 site, skip picker)
```

### Site Picker Behavior

1. **Trigger**: After OAuth login, if `resources.length > 1` and the user hasn't confirmed a site selection yet
2. **Display**: Full-screen card layout showing all accessible Jira sites with:
   - Site avatar/icon
   - Site name
   - Site URL
   - "✓ Current" badge on the auto-selected site
3. **Selection**: Clicking a site calls `POST /auth/select-site` to switch the active `cloud_id`, then enters the main app
4. **Persistence**: Site confirmation is stored in `localStorage` per user (`jira-ui-site-confirmed-{accountId}`) so the picker only shows once per user
5. **Subsequent visits**: After initial confirmation, the user goes directly to the main app. They can still switch sites from the user menu dropdown at any time

### Backend Endpoints (existing)

- `GET /auth/sites` — returns all accessible resources with `id`, `name`, `url`, `avatarUrl`, `scopes`, and the `current_cloud_id`
- `POST /auth/select-site` — switches the session's active `cloud_id`, re-fetches user info for the new site, persists to session store

### Frontend State

```typescript
const [siteConfirmed, setSiteConfirmed] = useState(false);

// Show site picker when:
// - OAuth is working (user is authenticated)
// - User has >1 accessible Jira sites
// - User hasn't confirmed site selection (in-memory or localStorage)
const needsSiteSelection = oauthWorks && oauthResources.length > 1 && !siteConfirmed
  && !localStorage.getItem(`jira-ui-site-confirmed-${authData?.user?.accountId}`);
```

### localStorage Key

| Key | Value | Purpose |
|-----|-------|---------|
| `jira-ui-site-confirmed-{accountId}` | `"1"` | Skip site picker on subsequent visits |

Cleared on logout (not implemented yet — user can clear manually or it gets a new key if they log in with a different Atlassian account).

## Consequences

**Good**:
- Users with multiple Jira sites immediately see all their options on first login
- Clear, discoverable UI — no need to hunt through dropdown menus
- One-time friction: picker only shows once, then auto-skipped
- Still switchable later via user menu (existing feature preserved)
- No backend changes needed — reuses existing `/auth/sites` and `/auth/select-site`

**Bad**:
- Adds one extra screen to the first-login flow for multi-site users
- `localStorage` confirmation means clearing browser data re-shows the picker (minor)
- Single-site users never see this screen (by design), so no benefit for them

## Related

- ADR-017: Dual Auth — Strategy Pattern
- ADR-015: No server-side Jira data storage
- Roadmap #30: OAuth 2.0 (3LO)
- Roadmap #31: Per-user session management
- Roadmap #33: Per-user Jira site selection
