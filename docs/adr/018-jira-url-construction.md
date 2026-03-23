# ADR-018: Jira URL Construction Rules

**Status**: Accepted
**Date**: 2026-03-23
**Deciders**: Abdelkrim BOUJRAF

## Context

The app provides "Open in Jira" (↗) links throughout the UI. Jira Cloud URLs have specific patterns that vary by entity type and project style (classic vs next-gen).

## Decision

Document all Jira URL patterns and the data sources for constructing them.

## URL Patterns

### Issues

```
{jira_host}/browse/{issueKey}
```

Example: `https://altf1be.atlassian.net/browse/PITA-11`

**Data source**: `issue.key` — always available.

### Boards / Sprints

```
{jira_host}/jira/software/c/projects/{projectKey}/boards/{boardId}
```

Example: `https://altf1be.atlassian.net/jira/software/c/projects/PITA/boards/151`

**Note**: The `/c/` segment is required. Without it, some boards return "not found". The `/c/` path works for all project types (classic and next-gen).

**Data source for `projectKey`** (in priority order):
1. API response: `sprint.projectKey` (from `board.location.projectKey` via Agile API)
2. API response: `sprint.projectKey` (derived from issue project field via Platform API fallback)
3. Frontend: selected project filter in header
4. Frontend: first issue key in sprint (e.g., `PITA-11` → `PITA`)

**Data source for `boardId`**: `sprint.boardId` — always available from both Agile and Platform APIs.

### User Profile

```
{jira_host}/jira/people/me
```

Opens the current user's Jira profile. Always the same URL.

### Atlassian Account Settings

```
https://id.atlassian.com/manage-profile/profile-and-visibility
```

Global Atlassian account page — not instance-specific.

### Project Board List

```
{jira_host}/jira/software/projects/{projectKey}/boards
```

## Data Sources

| Entity | URL Field | Source (Agile API) | Source (Platform API) |
|--------|-----------|-------------------|----------------------|
| Issue key | `issueKey` | `issue.key` | `issue.key` |
| Board ID | `boardId` | `board.id` | `customfield_10020[].boardId` |
| Project key | `projectKey` | `board.location.projectKey` | `issue.fields.project.key` |
| Jira host | `jira_host` | `GET /api/settings` | `GET /api/settings` |

## Frontend Implementation

`OpenInJira` component + `JiraHostContext`:

```tsx
// Provides jira_host to all components via React Context
const JiraHostContext = createContext("");

// Renders ↗ link, stops click propagation (doesn't trigger row/card click)
function OpenInJira({ path, className }) {
  const host = useJiraHost();
  if (!host) return null;
  return <a href={`${host}${path}`} target="_blank" onClick={e => e.stopPropagation()}>↗</a>;
}
```

## Consequences

**Good**: Centralized URL patterns, API provides `projectKey` so frontend doesn't guess.
**Bad**: Platform API fallback derives `projectKey` from issues — may be wrong if sprint spans multiple projects.

## Related

- ADR-016: Platform API fallback for sprints
- Roadmap #51: "Open in Jira" button
