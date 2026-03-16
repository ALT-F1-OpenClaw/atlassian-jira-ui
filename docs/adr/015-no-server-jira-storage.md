# ADR-015: No Server-Side Jira Data Storage

**Status**: Accepted
**Date**: 2026-03-11
**Deciders**: Abdelkrim BOUJRAF

## Context

Privacy compliance (GDPR, CCPA, etc.) is simplified if no Jira content is stored on the server. The backend acts as a proxy.

## Decision

- **Server stores**: only encrypted OAuth tokens + session data (Phase 5). Currently: API token in `.env`
- **Server never stores**: issues, boards, sprints, comments, worklogs, or any Jira content
- **Client-side caching**: React Query in-memory, Workbox service worker IndexedDB, localStorage for preferences

## Data Flow

```
Browser → Backend (proxy) → Jira Cloud API
              ↕                    ↕
         Session/tokens      Jira content
         (encrypted)         (never stored)
```

## Client-Side Cache

| Cache | Storage | Duration | Cleared by |
|-------|---------|----------|-----------|
| React Query | Memory | staleTime: 1-30 min | Page reload |
| Workbox API cache | IndexedDB | 24h, max 200 entries | SW update / manual |
| Preferences | localStorage | Permanent | Logout / manual |

## Consequences

**Good**: Simplified privacy compliance, no data breach risk for Jira content, no database needed.
**Bad**: No server-side search index, every request hits Jira API (mitigated by tiered caching), users must be informed about browser-side caching in Privacy Policy.
