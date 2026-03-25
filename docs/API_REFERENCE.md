# API Reference — Taskara Backend

Base URL: `https://taskara.alt-f1.be` (or your deployment URL)

All endpoints require authentication (OAuth 2.0 or API Token in dev mode).

---

## Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | GET | Redirect to Atlassian OAuth consent screen |
| `/auth/callback` | GET | OAuth callback — exchanges code for tokens |
| `/auth/me` | GET | Get current authenticated user + accessible sites |
| `/auth/logout` | POST | Clear session |
| `/auth/sites` | GET | List all accessible Jira sites |
| `/auth/select-site` | POST | Switch active Jira site (`{"cloud_id": "..."}`) |

### Rate limit: 10/minute

---

## Issues

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/issues` | GET | List issues (paginated, filterable) |
| `/api/issues` | POST | Create an issue |
| `/api/issues/{key}` | GET | Get issue detail with transitions + time tracking |
| `/api/issues/{key}` | PATCH | Update issue fields |
| `/api/issues/{key}/transition` | POST | Transition issue status |
| `/api/issues/{key}/worklog` | GET | Get work log entries |
| `/api/issues/{key}/worklog` | POST | Log work on issue |

### Query Parameters (GET /api/issues)

| Param | Type | Description |
|-------|------|-------------|
| `project` | string | Filter by project key |
| `status` | string | Filter by status name |
| `type` | string | Filter by issue type |
| `assignee` | string | Filter by assignee display name |
| `sort_by` | string | Sort field: `updated`, `created`, `priority`, `status` |
| `sort_order` | string | `ASC` or `DESC` |
| `start_at` | int | Pagination offset (default: 0) |
| `max_results` | int | Page size (default: 50, max: 100) |

### Create Issue (POST /api/issues)

```json
{
  "project": "PROJ",
  "summary": "Bug: login fails on mobile",
  "issue_type": "Bug",
  "priority": "High",
  "assignee": "accountId",
  "description": "Steps to reproduce..."
}
```

### Rate limit: 60/minute (read), 30/minute (write)

---

## Projects

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET | List all projects |
| `/api/projects` | POST | Create a project |
| `/api/projects/{key}/members` | GET | List assignable members |

### Create Project (POST /api/projects)

```json
{
  "name": "My Project",
  "key": "MP",
  "project_type": "software",
  "lead_account_id": "...",
  "description": "..."
}
```

---

## Sprints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sprints` | GET | List sprints (filterable by project + state) |
| `/api/sprints` | POST | Create a sprint |
| `/api/sprints/{id}` | PATCH | Update sprint (name, goal, dates) |
| `/api/sprints/{id}` | DELETE | Delete sprint |
| `/api/sprints/{id}/issues` | GET | Get sprint issues with status counts |
| `/api/sprints/{id}/issues` | POST | Add issues to sprint |
| `/api/sprints/{id}/issues/{key}` | DELETE | Remove issue from sprint |
| `/api/sprints/{id}/start` | POST | Start a sprint |
| `/api/sprints/{id}/complete` | POST | Complete a sprint |
| `/api/sprints/{id}/burndown` | GET | Get burndown chart data |
| `/api/sprints/{id}/velocity` | GET | Get velocity chart data |

### Query Parameters (GET /api/sprints)

| Param | Type | Description |
|-------|------|-------------|
| `project` | string | Filter by project key |
| `state` | string | Comma-separated: `active`, `future`, `closed` (default: `active`) |

### Rate limit: 60/minute (read), 30/minute (write)

---

## Boards

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/boards` | GET | List boards (optionally filtered by project) |
| `/api/boards/{id}` | GET | Get board details with columns |

---

## Search

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/search` | GET | JQL search (`?jql=...&max_results=50`) |
| `/api/search/quick` | GET | Quick fuzzy text search (`?q=...&project=...`) |

### Rate limit: 30/minute

---

## Other

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/priorities` | GET | List Jira priorities |
| `/api/labels` | GET | List Jira labels |
| `/api/settings` | GET | Get app settings (secrets masked) |
| `/api/settings` | PATCH | Update settings (dev/staging only, blocked in production) |
| `/api/settings/test` | POST | Test Jira connection |
| `/api/health` | GET | Health check (no auth required) |

---

## Error Responses

### 401 Unauthorized

```json
{
  "detail": "OAuth is enabled but you are not logged in. Click Login in the header."
}
```

### 429 Rate Limited

```json
{
  "error": "rate_limit_exceeded",
  "detail": "Too many requests. Limit: 60 per 1 minute"
}
```

Headers: `Retry-After: 60`

### 403 Forbidden (production settings)

```json
{
  "detail": "Settings cannot be modified in production mode"
}
```

### 500 Jira API Error

```json
{
  "detail": "Jira API error 400: {\"errorMessages\":[\"...\"]} "
}
```

---

## Data Flow

```
Frontend (React) → /api/* → nginx → Backend (FastAPI) → Jira Cloud REST API
                   /auth/* → nginx → Backend (OAuth)   → Atlassian OAuth
                                                        → Redis (sessions)
```

No Jira data is stored server-side. All API calls are proxied in real-time.
