# AGENTS.md

Instructions for AI agents working on this codebase.

## Task Reference

Tasks are tracked in `ROADMAP.md` with numbered IDs (e.g., `2.1`, `3.3`). When asked to "implement 2.1", find the corresponding task there.

## Implementation Workflow

1. Read the task description in `ROADMAP.md`
2. Read relevant existing code before making changes
3. Implement the feature (backend first if new endpoint needed, then frontend)
4. Write BDD tests in `frontend/src/App.test.tsx`
5. Run tests: `cd frontend && npm test -- --run`
6. Update `ROADMAP.md`: check the box, add BDD test count
7. Wait for user to request commit + version bump

## Code Patterns

### Backend (FastAPI)

- All endpoints are async and live in `backend/app/routers/`
- Jira API calls go through `jira_client.py` → `jira_request(method, path, params=, json=)`
- Normalize Jira responses with `_format_issue()` / `_format_user()` before returning
- JQL is built dynamically from query params; always sanitize with double quotes
- Use Pydantic `BaseModel` for request bodies, `Query()` for query params

### Frontend (React + TypeScript)

- All UI lives in `frontend/src/App.tsx` (single-file for now)
- Data fetching: TanStack Query `useQuery` / `useMutation`
- Include all state variables in `queryKey` arrays for automatic refetch
- Styling: Tailwind CSS utility classes, dark/light theme via CSS variable overrides (zinc palette remapped in `index.css`), **fully responsive** (mobile-first, must work on phone/tablet/desktop). Theme toggled via `.dark` class on `<html>`, `useTheme` hook in `App()`. Inline script in `index.html` prevents flash. Use `dark:` Tailwind variant only for non-zinc overrides (e.g. `dark:prose-invert`)
- State that affects multiple components gets lifted to `App()` and passed as props
- Reset pagination to page 0 when filters, sort, or project change
- Board view uses `@dnd-kit/core` for drag-and-drop; mobile fallback uses ← → arrow buttons (`sm:hidden`)
- Mobile-only UI patterns: use `sm:hidden` to show on mobile, `hidden sm:block` to show on desktop
- Keyboard shortcuts: global `useEffect` keydown listener in `App()`, `isInputFocused()` helper to skip shortcuts when typing in inputs/textareas/selects/contenteditable. Shortcuts: j/k (list nav), Enter (open issue), Escape (close panel), b/l/s (view switch: board/list/sprint), c (create issue), ? (help overlay)
- Create issue modal: `CreateIssueModal` component with project/summary/type/priority/assignee/description fields, form validation, `useMutation` + optimistic cache update via `setQueriesData`, `+ Create` button in header
- Saved filters: `SavedFiltersDropdown` component with save/apply/rename/delete, `SavedFilter` interface (`id`, `name`, `project`, `filters`), persisted via `localStorage` (`jira-ui-saved-filters` key), save button appears only when filters are active
- Sprint dashboard: `SprintDashboard` component with `recharts` (PieChart, LineChart, BarChart). Fetches from `/api/sprints`, `/api/sprints/{id}/issues`, `/api/sprints/{id}/burndown`, `/api/sprints/{id}/velocity`. Sprint selector dropdown, issue counts by status category, progress bar, burndown chart, velocity chart, scope change tracking. `s` shortcut switches to sprint view
- Time tracking: `IssueTimer` component (start/stop/pause) in issue detail header. Timer state persisted in `localStorage` (`jira-ui-timers` key) via `useIssueTimer` hook. `LogWorkModal` for manual time entry (sends `POST /api/issues/{key}/worklog`). `TimeTrackingBar` shows logged vs estimated progress. `WorklogHistory` fetches and displays `GET /api/issues/{key}/worklog` entries. Issue detail response includes `timeTracking` object
- Offline mode: `useOnlineStatus` hook (navigator.onLine + online/offline events), `useOfflineQueue` hook (IndexedDB mutation queue + auto-sync on reconnect), `OfflineIndicator` component (dismissable banner + header dot), `offlineFetch` wrapper queues mutations when offline. Workbox runtime caching (`NetworkFirst`) for API responses configured in `vite.config.ts`. IndexedDB store: `jira-ui-offline` → `mutations`. Mutations passed through `isOnline` + `queueMutation` props on `IssueDetailPanel`, `BoardView`, `CreateIssueModal`

### Testing (Vitest + Testing Library)

- BDD naming: `"Given [context], when [action], then [expected result]"`
- Mock `fetch` globally with `vi.fn()` — match on URL path, return appropriate fixture
- Use `within(screen.getByRole("rowgroup"))` to scope assertions to `<tbody>` (avoids collisions with dropdown options)
- Use `userEvent` (not `fireEvent`) for user interactions
- Use `findBy*` (async) for elements that appear after data loads
- When testing filters/sort, `await` for data to load before asserting on UI state

### API Contract

Backend returns normalized shapes — not raw Jira format:

```typescript
// Issue list: GET /api/issues?project=&status=&type=&assignee=&sort_by=&sort_order=&start_at=&max_results=
{ issues: Issue[], total: number }

// Issue detail: GET /api/issues/{key}
Issue & { transitions: { id: string, name: string }[], timeTracking: { originalEstimate: string, remainingEstimate: string, timeSpent: string, originalEstimateSeconds: number, remainingEstimateSeconds: number, timeSpentSeconds: number } }

// Create issue: POST /api/issues
// Body: { project: string, summary: string, issue_type?: string, priority?: string, assignee?: string, description?: string }
// Returns: { id: string, key: string, self: string }

// Projects: GET /api/projects
{ key: string, name: string, id: string }[]

// Project members: GET /api/projects/{key}/members
{ accountId: string, displayName: string, avatarUrl: string, active: boolean }[]

// Priorities: GET /api/priorities
{ id: string, name: string, iconUrl: string }[]

// Labels: GET /api/labels
string[]

// Sprints: GET /api/sprints?project=
{ sprints: { id: number, name: string, state: string, startDate: string, endDate: string, goal: string, boardId: number, boardName: string }[] }

// Sprint issues: GET /api/sprints/{id}/issues
{ issues: SprintIssue[], total: number, statusCounts: { status: string, count: number }[], categoryCounts: { todo: number, inProgress: number, done: number } }

// Sprint burndown: GET /api/sprints/{id}/burndown?board_id=
{ burndown: { date: string, remaining: number, ideal: number }[], sprint: object }

// Sprint velocity: GET /api/sprints/{id}/velocity?board_id=
{ velocity: { sprintId: number, sprintName: string, state: string, committedPoints: number, completedPoints: number, committedCount: number, completedCount: number }[] }

// Log work: POST /api/issues/{key}/worklog
// Body: { timeSpent: string, comment?: string }
// Returns: { status: string, key: string, worklog: object }

// Worklogs: GET /api/issues/{key}/worklog
{ worklogs: { id: string, timeSpent: string, timeSpentSeconds: number, comment: string, created: string, updated: string, author: { accountId: string, displayName: string, avatarUrl: string } }[], total: number }
```

### Screenshots

- Screenshots use **mock data only** — never production/private Jira data
- `scripts/screenshots.mjs` intercepts API calls via Playwright `page.route()` and returns mock fixtures
- Mock data mirrors the test fixtures from `App.test.tsx` — keep them in sync
- Only the frontend dev server is needed (no backend required)
- Run: `cd frontend && npm run dev`, then `node scripts/screenshots.mjs`
- Output: `docs/screenshots/` (gitignored)

## Rules

- Never include `Co-Authored-By` in commit messages
- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- Do not split `App.tsx` into separate component files unless explicitly asked
- Do not add dependencies without implementing a feature that uses them
- Keep filter dropdown order matching table column order: Type → Status → Assignee
- Page size is 50 (Jira API default) — do not change without discussion
- Always run tests before marking a task complete
- Do not push to remote — let the user decide when to push
- After code changes: update README.md to reflect new features, endpoints, test counts, and project structure
- When adding a new feature: update the About / Features page (task 13) with the feature name and its release version
