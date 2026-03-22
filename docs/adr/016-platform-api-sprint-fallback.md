# ADR-016: Platform API Fallback for Sprints

**Status**: Accepted
**Date**: 2026-03-23
**Deciders**: Abdelkrim BOUJRAF

## Context

The Jira Agile API (`/rest/agile/1.0/*`) provides board and sprint endpoints but requires:
- Jira Software product enabled on the instance
- Granular OAuth scopes (`read:board-scope:jira-software`, `read:sprint:jira-software`)

These scopes fail with `FAILURE_CLIENT_SCOPE_CHECK` on Jira instances that don't have Jira Software as a separate product (e.g., Jira Free/Work Management). The scopes appear in the token but Atlassian's server rejects them.

API Token (Basic Auth) bypasses this because it has admin-level access, but OAuth 2.0 (3LO) respects granular scopes strictly.

## Decision

Implement a **dual-path architecture** for sprint data:

1. **Primary**: Agile API (`/rest/agile/1.0/board`, `/board/{id}/sprint`)
2. **Fallback**: Platform API via JQL (`/rest/api/3/search/jql`)

The fallback uses JQL functions:
- `sprint in openSprints()` — active sprints
- `sprint in futureSprints()` — planned sprints
- `sprint in closedSprints()` — completed sprints

Sprint metadata is extracted from `customfield_10020` on each issue.

## Architecture

```
Sprint request
      │
      ├── Try Agile API (/rest/agile/1.0/board)
      │   ├── Success → use Agile API response
      │   └── Fail (401 scope error)
      │               │
      │               ▼
      └── Fallback: Platform API
          ├── JQL: sprint in openSprints()
          ├── Extract sprint data from customfield_10020
          └── Deduplicate by sprint ID
          └── Return same response shape as Agile path
```

## Consequences

**Good**:
- Works on ALL Jira instances (Software, Work Management, Free)
- Works with both API Token and OAuth authentication
- Transparent fallback — frontend doesn't need to know which path was used
- Agile API remains primary when available (richer data)

**Bad**:
- Platform API fallback has no board name (not available in `customfield_10020`)
- Fallback requires fetching issues to discover sprints (less efficient)
- `customfield_10020` is a Jira convention, not guaranteed (but standard on Cloud)
- Sprint CRUD operations (create/start/complete/delete) still require Agile API

## Related

- ADR-012: Traefik + Docker Compose for production
- ADR-015: No server-side Jira data storage
- Roadmap #55: Refactor sprints/boards to Platform API
