# AGENTS.md

Instructions for AI agents working on this codebase.

## Task Reference

Tasks are tracked in `ROADMAP.md` with numbered IDs (e.g., `2.1`, `3.3`). When asked to "implement 2.1", find the corresponding task there.

## Implementation Workflow

1. Read the task description in `ROADMAP.md`
2. Read relevant existing code before making changes
3. Implement the feature (backend first if new endpoint needed, then frontend)
4. Write BDD tests in `frontend/src/App.test.tsx` (unit) and `frontend/e2e/app.spec.ts` (E2E)
5. Run tests: `cd frontend && npm test` (255 unit) / `npx playwright test` (22 E2E) / `cd backend && python -m pytest tests/ -v` (25 backend)
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
- **Light mode contrast**: zinc-400 through zinc-100 are mapped to progressively darker values (#3f3f46 → #09090b) so text using zinc-400/zinc-300/zinc-200 stays readable on white/near-white backgrounds. Avoid `text-zinc-500`+ for important text — use `text-zinc-400` or darker. WCAG AA minimum: 4.5:1 contrast ratio
- State that affects multiple components gets lifted to `App()` and passed as props
- Reset pagination to page 0 when filters, sort, or project change
- Board view uses `@dnd-kit/core` for drag-and-drop; mobile fallback uses ← → arrow buttons (`sm:hidden`)
- Mobile-only UI patterns: use `sm:hidden` to show on mobile, `hidden sm:block` to show on desktop
- Keyboard shortcuts: global `useEffect` keydown listener in `App()`, `isInputFocused()` helper to skip shortcuts when typing in inputs/textareas/selects/contenteditable. Shortcuts: j/k (list nav), Enter (open issue), Escape (close panel), b/l/s (view switch: board/list/sprint), c (create issue), ? (help overlay)
- SearchableSelect: custom autocomplete dropdown with search-as-you-type, keyboard navigation, `autoOpen` prop. Used for 7 dropdowns: project filter, type/status/assignee filters, create modal project + assignee, bulk assign, inline edit priority + assignee. Tests use `selectSearchableOption()` helper
- Create submenu: `+ Create` button shows dropdown with Issue + Project options. `c` shortcut opens Issue modal directly
- Create issue modal: `CreateIssueModal` — project/summary/type/priority/assignee/description, form validation, optimistic cache update
- Create project modal: `CreateProjectModal` — name (required), key (auto-generated from name initials), type (software/service_desk/business), lead (SearchableSelect), description. Backend `POST /api/projects`
- Saved filters: `SavedFiltersDropdown` component with save/apply/rename/delete, `SavedFilter` interface (`id`, `name`, `project`, `filters`), persisted via `localStorage` (`jira-ui-saved-filters` key), save button appears only when filters are active
- Sprint dashboard: `SprintDashboard` component with `recharts` (PieChart, LineChart, BarChart). Fetches from `/api/sprints`, `/api/sprints/{id}/issues`, `/api/sprints/{id}/burndown`, `/api/sprints/{id}/velocity`. Sprint selector dropdown, issue counts by status category, progress bar, burndown chart, velocity chart, scope change tracking. `s` shortcut switches to sprint view
- Sprint CRUD: `CreateSprintModal` (name/goal/start date/end date → `POST /api/sprints`), `EditSprintModal` (pre-filled with current sprint data → `PATCH /api/sprints/{id}`), `ConfirmDialog` reusable component for start/complete/delete confirmations. Start sprint (`POST /api/sprints/{id}/start`), complete sprint (`POST /api/sprints/{id}/complete`), delete sprint (`DELETE /api/sprints/{id}`). `ManageSprintScopeModal` for adding (`POST /api/sprints/{id}/issues`) and removing (`DELETE /api/sprints/{id}/issues/{key}`) issues. Action buttons in sprint dashboard header. Backend uses Jira Agile API (`POST/PUT/DELETE /rest/agile/1.0/sprint/{id}`, `POST /rest/agile/1.0/sprint/{id}/issue`, `POST /rest/agile/1.0/backlog/issue`)
- Time tracking: `IssueTimer` component (start/stop/pause) in issue detail header. Timer state persisted in `localStorage` (`jira-ui-timers` key) via `useIssueTimer` hook. `LogWorkModal` for manual time entry (sends `POST /api/issues/{key}/worklog`). `TimeTrackingBar` shows logged vs estimated progress. `WorklogHistory` fetches and displays `GET /api/issues/{key}/worklog` entries. Issue detail response includes `timeTracking` object
- Offline mode: `useOnlineStatus` hook (navigator.onLine + online/offline events), `useOfflineQueue` hook (IndexedDB mutation queue + auto-sync on reconnect), `OfflineIndicator` component (dismissable banner + header dot), `offlineFetch` wrapper queues mutations when offline. Workbox runtime caching (`NetworkFirst`) for API responses configured in `vite.config.ts`. IndexedDB store: `jira-ui-offline` → `mutations`. Mutations passed through `isOnline` + `queueMutation` props on `IssueDetailPanel`, `BoardView`, `CreateIssueModal`
- UI navigation: `Sidebar` component (collapsible, projects list, saved filters, view shortcuts), `Breadcrumbs` component (Home → View → Issue path), `DashboardPage` component (quick actions, active sprints summary, recent issues, project cards), `EmptyState` reusable component (icon + title + description + optional action button). View switcher is a segmented control (`role="tablist"`) with icons and `aria-selected` active indicator. Sidebar state via `sidebarOpen` in App(). Dashboard fetches `/api/sprints?state=active` and `/api/issues?sort_by=updated&sort_order=DESC&max_results=5`. Keyboard shortcut `d` switches to dashboard view
- About / Features page: `AboutPage` component with `FEATURES_LIST` constant (21 features with name, version, description). Shows app version (`__APP_VERSION__`), build date, GitHub and changelog links. Responsive card-based grid layout. Tech stack section. Accessible from sidebar navigation ("About" link with ⓘ icon). `View` type includes `"about"`. No API calls — all data is static/hardcoded

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

// Sprints: GET /api/sprints?project=&state=
{ sprints: { id: number, name: string, state: string, startDate: string, endDate: string, goal: string, boardId: number, boardName: string }[] }

// Create sprint: POST /api/sprints
// Body: { name: string, board_id: number, goal?: string, start_date?: string, end_date?: string }
// Returns: { status: string, sprint: object }

// Update sprint: PATCH /api/sprints/{id}
// Body: { name?: string, goal?: string, start_date?: string, end_date?: string }
// Returns: { status: string, sprint: object }

// Start sprint: POST /api/sprints/{id}/start
// Returns: { status: string, sprint: object }

// Complete sprint: POST /api/sprints/{id}/complete
// Returns: { status: string, sprint: object }

// Delete sprint: DELETE /api/sprints/{id}
// Returns: { status: string }

// Add issues to sprint: POST /api/sprints/{id}/issues
// Body: { issues: string[] }
// Returns: { status: string, added: string[] }

// Remove issue from sprint: DELETE /api/sprints/{id}/issues/{key}
// Returns: { status: string, removed: string }

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

### Backend Tests (pytest)

- 25 tests in `backend/tests/` — config, health, projects, issues, priorities, labels, search
- All Jira API calls mocked with `unittest.mock.patch` + `AsyncMock`
- Uses `pytest-asyncio` with `@pytest_asyncio.fixture` for async HTTPX client
- Dummy env vars set in `conftest.py` (JIRA_HOST, JIRA_EMAIL, JIRA_API_TOKEN)
- Run: `cd backend && source .venv/bin/activate && python -m pytest tests/ -v`
- CI runs pytest in the backend job alongside import verification

### E2E Tests (Playwright)

- 22 tests in `frontend/e2e/app.spec.ts` — all major UI flows
- Mock data in `frontend/e2e/fixtures.ts` — matches backend response format exactly
- `mockAllApiRoutes()` intercepts all `/api/*` via `page.route()` (regex for issues, globs for others)
- **PWA service worker must be disabled** — block `sw.js`, `registerSW.js`, `workbox-*.js` to prevent Workbox `NetworkFirst` from intercepting mocked routes
- Mock `MOCK_ISSUE` must use `descriptionAdf` (not `description`), `status.category` (not `statusCategory`), `dueDate` (not `duedate`), `timeTracking` (not `timetracking`) — match `_format_issue()` output
- Uses `vite preview` (port 4173) — build before running: `npm run build && npx playwright test`
- `e2e/` excluded from vitest via `test.exclude` in `vite.config.ts`

### CI/CD Pipeline

6 GitHub Actions workflows:

```
git push → CI (test matrix) → PASS → tag push → Release + Docker + GHCR
                             → FAIL → CI Auto-Fix → create issue + notify Discord
Always: CodeQL (weekly) + Dependabot (weekly)
```

- **CI** (`ci.yml`): Frontend (Node 20/22: tsc + vitest + build) + Backend (Python 3.11-3.13: pytest + imports)
- **CI Auto-Fix** (`ci-autofix.yml`): On failure → extract logs → categorize (7 types) → create GitHub issue (label: `ci-autofix`) → Discord notification
- **Release** (`release.yml`): Create GitHub release on tag push
- **Docker Validate** (`docker.yml`): Build + compose validation
- **Publish Docker** (`publish-docker.yml`): Multi-arch (amd64+arm64) images to GHCR on tag
- **CodeQL** (`codeql.yml`): Weekly JS/TS + Python security scanning
- **Dependabot** (`dependabot.yml`): Weekly npm + pip + Actions version updates

Error categories: `test-runner-conflict`, `missing-module`, `typescript-error`, `test-failure`, `dependency-error`, `lint-error`, `build-error`

### Screenshots

- 17 auto-generated screenshots in `docs/APP_SCREENSHOTS.md`
- Generated by `frontend/e2e/screenshots.spec.ts` using same mock fixtures
- Run: `cd frontend && npm run build && npx playwright test e2e/screenshots.spec.ts`
- Output: `docs/screenshots/` (committed to repo)

## Rules

- Never include `Co-Authored-By` in commit messages
- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- Do not split `App.tsx` into separate component files unless explicitly asked
- Do not add dependencies without implementing a feature that uses them
- Keep filter dropdown order matching table column order: Type → Status → Assignee
- Page size is 50 (Jira API default) — do not change without discussion
- Always run tests before marking a task complete
- Do not push to remote — let the user decide when to push
- **Bug fix workflow**: create a GitHub issue first (label: `bug`), then fix, reference the issue in the commit (`fixes #N`), issue gets closed automatically on merge
- **All fixes must have a GitHub issue** — this provides traceability (what broke, root cause, fix, version)
- Issue template: title starts with `fix:`, body includes Bug description, Root cause, Fix description, Fixed in version
- After code changes: update README.md to reflect new features, endpoints, test counts, and project structure
- When adding a new feature: update the About / Features page (task 14) with the feature name and its release version
- CI/CD: backend CI needs dummy env vars (JIRA_HOST, JIRA_EMAIL, JIRA_API_TOKEN, APP_SECRET_KEY) for import verification
- CI/CD: Docker workflow creates a dummy backend/.env for docker-compose validation
- CI/CD: backend/.env is gitignored — never commit real credentials
- CI/CD: use latest GitHub Actions versions — `actions/checkout@v6`, `actions/setup-node@v5`, `actions/setup-python@v6` (Node.js 24 compatible)
- CI/CD: `softprops/action-gh-release@v2` is latest for release workflow
- Docker: images published to GHCR on tag push (`ghcr.io/alt-f1-openclaw/atlassian-jira-ui-backend` + `-frontend`)
- Docker: multi-arch builds (linux/amd64 + linux/arm64) via QEMU + Buildx
- Docker: `docker-compose.ghcr.yml` for pulling pre-built images; `docker-compose.yml` for building from source
- Caching: tiered `staleTime` — `CACHE_STATIC` (30min) for priorities/projects/members/sprints, `CACHE_LIST` (2min) for issue lists, `CACHE_DETAIL` (1min) for single issues. Default gcTime 10min. `refetchOnWindowFocus: "always"` for stale data
- Code splitting: `manualChunks` in `vite.config.ts` — vendor-tiptap (prosemirror), vendor-charts (recharts+d3), vendor-dnd, vendor-query. App chunk ~300KB, no chunk >500KB
- Description editing: always uses TipTap rich text editor (no plain textarea fallback). Edit button visible for all issues, even without existing description
- Sprint charts: each chart has explanatory subtitle with best/worst case indicators
