# Roadmap

## Phase 1 — Core Views

### 1. List view enhancements

- [x] **1.1** Basic table with issue key, type, summary, status, priority, assignee, updated — *BDD tests: `App.test.tsx` (11 scenarios)*
- [x] **1.2** Column sorting (click header to sort by field) — *BDD tests: `App.test.tsx` (6 scenarios)*
- [x] **1.3** Filter dropdowns (status, type, assignee) — *BDD tests: `App.test.tsx` (8 scenarios)*
- [x] **1.4** Pagination (offset-based, next/previous controls) — *BDD tests: `App.test.tsx` (7 scenarios)*

**Tech**: React state for sort/filter params, `useQuery` queryKey updates. Backend already supports `status`, `assignee`, `type` query params on `GET /api/issues`.

### 2. Issue detail panel

- [x] **2.1** Side panel or full-page view showing all issue fields — *BDD tests: `App.test.tsx` (3 scenarios)*
- [x] **2.2** ADF (Atlassian Document Format) description rendering — *BDD tests: `App.test.tsx` (5 scenarios)*
- [x] **2.3** Inline editing: summary, description, assignee, priority — *BDD tests: `App.test.tsx` (3 scenarios)*
- [x] **2.4** Status transitions via dropdown (using available transitions) — *BDD tests: `App.test.tsx` (2 scenarios)*
- [x] **2.5** Display labels, reporter, due date, created/updated timestamps — *BDD tests: `App.test.tsx` (6 scenarios)*

**Tech**: Backend `GET /api/issues/{key}`, `PATCH /api/issues/{key}`, `POST /api/issues/{key}/transition` — all exist. TanStack Query `useMutation` for updates. ADF-to-React renderer for description.

### 3. Board view (Kanban)

- [x] **3.1** Columns grouped by status category (To Do / In Progress / Done) — *BDD tests: `App.test.tsx` (5 scenarios)*
- [x] **3.2** Issue cards with key, summary, priority, assignee avatar — *BDD tests: `App.test.tsx` (6 scenarios)*
- [x] **3.3** Drag-and-drop between columns triggers status transition — *BDD tests: `App.test.tsx` (2 scenarios)*
- [x] **3.4** Swimlanes by assignee or priority (optional toggle) — *BDD tests: `App.test.tsx` (5 scenarios)*

**Tech**: `@dnd-kit/core` + `@dnd-kit/sortable` (already in `package.json`). Backend `GET /api/boards/{id}`, `POST /api/issues/{key}/transition`. Group issues by `status.category`.

### 4. Quick search / Command palette

- [x] **4.1** `Ctrl+K` opens command palette overlay — *BDD tests: `App.test.tsx` (5 scenarios)*
- [x] **4.2** Fuzzy search across issues with debounced input — *BDD tests: `App.test.tsx` (4 scenarios)*
- [x] **4.3** Navigate to issue detail or project from results — *BDD tests: `App.test.tsx` (4 scenarios)*
- [x] **4.4** Recent searches history — *BDD tests: `App.test.tsx` (4 scenarios)*

**Tech**: `cmdk` (already in `package.json`). Backend `GET /api/search/quick` exists. Debounced fetch, keyboard navigation.

---

## Phase 2 — Productivity

### 5. Keyboard shortcuts

- [x] **5.1** `j`/`k` navigate up/down in list view — *BDD tests: `App.test.tsx` (6 scenarios)*
- [x] **5.2** `Enter` opens issue detail — *BDD tests: `App.test.tsx` (2 scenarios)*
- [x] **5.3** `Escape` closes detail/modal — *BDD tests: `App.test.tsx` (2 scenarios)*
- [x] **5.4** `b`/`l` switch between board and list views — *BDD tests: `App.test.tsx` (2 scenarios)*
- [x] **5.5** `?` shows shortcut help overlay — *BDD tests: `App.test.tsx` (3 scenarios)*

**Tech**: `useEffect` keydown listeners, context-aware (disabled when typing in inputs/textareas/selects). `isInputFocused()` helper checks `document.activeElement`.

### 6. Quick create modal

- [x] **6.1** `c` key opens create issue modal — *BDD tests: `App.test.tsx` (4 scenarios)*
- [x] **6.2** Fields: project, summary, type, priority, assignee, description — *BDD tests: `App.test.tsx` (4 scenarios)*
- [x] **6.3** Form validation (project + summary required) — *BDD tests: `App.test.tsx` (3 scenarios)*
- [x] **6.4** Optimistic UI update after creation — *BDD tests: `App.test.tsx` (4 scenarios)*
- [x] **6.5** Create submenu (Issue + Project) — `+ Create` button opens dropdown with Issue and Project options — *v1.49.0*
- [x] **6.6** Create Project modal — name, auto-generated key, type (Software/Service Desk/Business), lead, description — *v1.49.0*

**Tech**: Backend `POST /api/issues` and `POST /api/projects` exist. `CreateIssueModal` + `CreateProjectModal` components. `+ Create` button shows dropdown submenu; `c` shortcut opens Issue modal directly. `SearchableSelect` for project lead picker. Key auto-generated from name initials.

### 7. Bulk actions

- [x] **7.1** Checkbox selection on list view rows — *BDD tests: `App.test.tsx` (4 scenarios)*
- [x] **7.2** Select all / deselect all — *BDD tests: `App.test.tsx` (3 scenarios)*
- [x] **7.3** Bulk transition (change status for selected issues) — *BDD tests: `App.test.tsx` (2 scenarios)*
- [x] **7.4** Bulk assign (set assignee for selected issues) — *BDD tests: `App.test.tsx` (1 scenario)*
- [x] **7.5** Bulk priority change — *BDD tests: `App.test.tsx` (2 scenarios)*

**Tech**: React state (`Set<string>`) for selected issue IDs. `BulkActionBar` floating component with transition/assign/priority dropdowns. Batch API calls via `Promise.allSettled`, success/failure result display. Checkbox column in table header (select all) and each row.

### 8. Saved filters

- [x] **8.1** Save current filter combination (project + status + assignee + type) as named view — *BDD tests: `App.test.tsx` (3 scenarios)*
- [x] **8.2** Quick-access filter list in sidebar or dropdown — *BDD tests: `App.test.tsx` (3 scenarios)*
- [x] **8.3** Edit and delete saved filters — *BDD tests: `App.test.tsx` (2 scenarios)*
- [x] **8.4** Persist in `localStorage` — *BDD tests: `App.test.tsx` (3 scenarios)*

**Tech**: `localStorage` for persistence (`jira-ui-saved-filters` key), `SavedFiltersDropdown` component with save/apply/rename/delete. `SavedFilter` interface stores `id`, `name`, `project`, and `filters` (status/type/assignee). Save button appears when filters are active; dropdown shows all saved filters with inline edit/delete controls.

---

## Phase 3 — Power Features

### 9. Sprint dashboard

- [x] **9.1** Active sprint overview with issue counts by status — *BDD tests: `App.test.tsx` (5 scenarios)*
- [x] **9.2** Burndown chart (remaining work over time) — *BDD tests: `App.test.tsx` (1 scenario)*
- [x] **9.3** Velocity chart (story points per sprint) — *BDD tests: `App.test.tsx` (1 scenario)*
- [x] **9.4** Sprint scope change tracking — *BDD tests: `App.test.tsx` (3 scenarios)*

**Tech**: Backend `GET /api/sprints`, `GET /api/sprints/{id}/issues`, `GET /api/sprints/{id}/burndown`, `GET /api/sprints/{id}/velocity`. `recharts` for charts (PieChart, LineChart, BarChart). `SprintDashboard` component in `App.tsx`. `s` keyboard shortcut to switch to sprint view. Sprint selector dropdown when multiple sprints exist.

### 9b. Sprint CRUD

- [x] **9b.1** Create sprint — modal with name, goal, start/end dates; `POST /api/sprints` — *BDD tests: `App.test.tsx` (4 scenarios)*
- [x] **9b.2** Edit sprint — edit name, goal, dates via modal on sprint dashboard; `PATCH /api/sprints/{id}` — *BDD tests: `App.test.tsx` (2 scenarios)*
- [x] **9b.3** Start / Complete sprint — action buttons with confirmation; `POST /api/sprints/{id}/start`, `POST /api/sprints/{id}/complete` — *BDD tests: `App.test.tsx` (3 scenarios)*
- [x] **9b.4** Delete sprint — confirm dialog, moves issues back to backlog; `DELETE /api/sprints/{id}` — *BDD tests: `App.test.tsx` (3 scenarios)*
- [x] **9b.5** Manage sprint scope — add/remove issues from sprint; `POST /api/sprints/{id}/issues`, `DELETE /api/sprints/{id}/issues/{key}` — *BDD tests: `App.test.tsx` (3 scenarios)*

**Tech**: Jira Agile API `POST /rest/agile/1.0/sprint`, `PUT /rest/agile/1.0/sprint/{id}`, `POST /rest/agile/1.0/sprint/{id}/issue`, `DELETE /rest/agile/1.0/sprint/{id}`. New backend endpoints needed.

### 10. Time tracking

- [x] **10.1** Built-in timer per issue (start/stop/pause) — *BDD tests: `App.test.tsx` (4 scenarios)*
- [x] **10.2** Log work from board or detail view — *BDD tests: `App.test.tsx` (3 scenarios)*
- [x] **10.3** Display logged vs estimated time — *BDD tests: `App.test.tsx` (3 scenarios)*
- [x] **10.4** Work log history — *BDD tests: `App.test.tsx` (3 scenarios)*

**Tech**: Backend `POST /api/issues/{key}/worklog`, `GET /api/issues/{key}/worklog`. `GET /api/issues/{key}` includes `timeTracking` field. `IssueTimer` component with start/stop/pause, state persisted in `localStorage` (`jira-ui-timers` key). `LogWorkModal` for manual time entry. `TimeTrackingBar` progress bar (logged vs estimated). `WorklogHistory` shows previous entries.

### 11. Dark/light mode toggle

- [x] **11.1** Dark mode (current default)
- [x] **11.2** Light mode theme — *BDD tests: `App.test.tsx` (2 scenarios)*
- [x] **11.3** Toggle switch in header — *BDD tests: `App.test.tsx` (2 scenarios)*
- [x] **11.4** Persist preference in `localStorage` — *BDD tests: `App.test.tsx` (2 scenarios)*
- [x] **11.5** Respect system preference (`prefers-color-scheme`) — *BDD tests: `App.test.tsx` (2 scenarios)*

**Tech**: Tailwind CSS `dark:` variant classes, CSS custom properties, `localStorage` for preference.

### 12. Offline mode

- [x] **12.1** Service worker for static asset caching — *BDD tests: `App.test.tsx` (1 scenario)*
- [x] **12.2** Cache API responses for offline reading — *BDD tests: `App.test.tsx` (1 scenario)*
- [x] **12.3** Queue mutations (create, update, transition) when offline — *BDD tests: `App.test.tsx` (1 scenario)*
- [x] **12.4** Sync queued changes on reconnect — *BDD tests: `App.test.tsx` (1 scenario)*
- [x] **12.5** Offline indicator in header — *BDD tests: `App.test.tsx` (2 scenarios)*

**Tech**: `vite-plugin-pwa` (Workbox), IndexedDB for offline mutation queue, `navigator.onLine` event listeners.

### 13. UI visibility & navigation improvements

- [x] **13.1** Prominent view switcher — segmented control with icons (Home/List/Board/Sprint) and aria-selected active indicator — *BDD tests: `App.test.tsx` (3 scenarios)*
- [x] **13.2** Sidebar navigation — collapsible sidebar with project list, saved filters, and view shortcuts — *BDD tests: `App.test.tsx` (5 scenarios)*
- [x] **13.3** Breadcrumbs — show current context path (Home → View → Issue) in breadcrumb bar — *BDD tests: `App.test.tsx` (3 scenarios)*
- [x] **13.4** Dashboard landing page — overview cards with active sprint status, recent issues, projects, quick actions — *BDD tests: `App.test.tsx` (5 scenarios)*
- [x] **13.5** Empty states — helpful text and CTAs when no sprint/issues exist (e.g. "Create your first sprint") — *BDD tests: `App.test.tsx` (3 scenarios)*

**Tech**: Sidebar as a collapsible panel. Breadcrumb component in header. Dashboard aggregates existing API data. Empty states with inline action buttons.

### 14. About / Features page

- [x] **14.1** Dedicated "About" page accessible from sidebar navigation — *BDD tests: `App.test.tsx` (1 scenario)*
- [x] **14.2** List all features with their corresponding release versions (e.g. "Kanban Board — v1.25.0") — *BDD tests: `App.test.tsx` (1 scenario)*
- [x] **14.3** Show current app version, build date, and link to GitHub repo/changelog — *BDD tests: `App.test.tsx` (1 scenario)*
- [x] **14.4** Responsive layout, works in dark and light modes — *BDD tests: `App.test.tsx` (2 scenarios)*

**Tech**: Static data derived from CHANGELOG.md / hardcoded feature-version map. No API needed.

### 15. CI/CD GitHub Actions

- [x] **15.1** CI workflow — lint, typecheck, test (253 BDD), build on push/PR to main (Node 20+22, Python 3.11-3.13)
- [x] **15.2** Release workflow — build + create GitHub Release with changelog on tag push
- [x] **15.3** Docker workflow — build and verify Docker images on push/PR to main
- [x] **15.4** Node.js 24 compatibility — upgraded to `checkout@v6`, `setup-node@v5`, `setup-python@v6`
- [x] **15.5** Publish Docker images to GHCR — multi-arch (amd64 + arm64) on tag push
- [x] **15.6** `docker-compose.ghcr.yml` — pull pre-built images without building from source

**Tech**: GitHub Actions, `ubuntu-latest` runners, npm/pip caching, matrix builds. Dummy env vars for CI backend validation. All actions Node.js 24 compatible. GHCR publishing with `docker/build-push-action@v6` + QEMU for multi-arch.

---

## 🎯 v1.0 Milestone — Production-Ready Public SaaS

### 🔴 Must-have (ship-blocking)

| # | Task | Category | Status |
|---|------|----------|--------|
| 35 | Rate limiting & abuse protection (ADR-020) | Security | Complete |
| 36 | Multi-tenant data isolation — token encryption, session fingerprinting, settings lockdown (ADR-021) | Security | Complete |
| 37 | Terms of Service page — 11 sections, accessible from sidebar + login footer | Legal | Complete |
| 38a | Privacy Policy — GDPR (EU/EEA) — 10 sections, DPA contact, supervisory authority | Legal | Complete |
| 39 | Cookie consent banner — GDPR opt-in, Accept/Necessary only, localStorage persistence | Complete |
| 57 | Production docker-compose + Let's Encrypt + taskara.alt-f1.be — deploy/public/ (Redis, Traefik ACME) | Infra | Complete |
| 59 | Redis session store — abstract SessionStore with Redis + file fallback (ADR-022) | Complete |
| 65 | App name: **Taskara** — domain: taskara.alt-f1.be | Complete |

### 🟡 Strongly recommended (ship with or shortly after)

| # | Task | Category | Status |
|---|------|----------|--------|
| 38b | Privacy Policy — CCPA (California) | Legal | Planned |
| 56 | Ansible playbook (automated VPS deployment) | Infra | Planned |
| 58 | Deploy user + SSH key auth (no root) | Infra | Planned |
| 65b | Design a logo (icon, wordmark, favicon, PWA icon) | Branding | Planned |
| 66 | Register DNS `<app-name>.alt-f1.be` | Branding | Planned |

### 🟢 Post-v1.0 (v1.1+)

Everything else: tooling upgrades (52a-c), OpenTelemetry (53), remaining privacy laws (38c-f), Jira Service Management/Discovery URLs (60-61), custom fields (73), Spaces (74), CI auto-fix (42/45), marketing launch (67-72).

---

## Build Order

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | List view enhancements | 1 | Partial |
| 2 | Issue detail panel | 1 | Complete |
| 3 | Quick search / Command palette | 1 | Complete |
| 4 | Board view (Kanban) | 1 | Complete |
| 5 | Keyboard shortcuts | 2 | Complete |
| 6 | Quick create modal | 2 | Complete |
| 7 | Bulk actions | 2 | Complete |
| 8 | Saved filters | 2 | Complete |
| 9 | Sprint dashboard | 3 | Complete |
| 9b | Sprint CRUD | 3 | Complete |
| 10 | Time tracking | 3 | Complete |
| 11 | Dark/light mode toggle | 3 | Complete |
| 12 | Offline mode | 3 | Complete |
| 13 | UI visibility & navigation | 3 | Complete |
| 14 | About / Features page | 3 | Complete |
| 15 | CI/CD GitHub Actions | — | Complete |
| 16 | Security hardening | — | In progress |

---

## Production Readiness Checklist

Before going production-grade, re-enable these:

- [ ] **Require PR reviews** — re-enable 1 approval requirement on `main` when the team grows beyond solo dev
- [x] **Branch protection** — CI checks required, no force-push, no branch deletion
- [x] **SECURITY.md** — vulnerability disclosure policy (PR #1)
- [x] **Dependabot** — automated dependency vulnerability scanning (PR #2)
- [x] **CodeQL** — static security analysis for JS/TS and Python (PR #3)
- [x] **Pre-commit hooks** — secret detection + code quality (PR #4)
- [ ] **HTTPS** — Tailscale Serve with TLS for PWA install prompt
- [ ] **Rate limiting** — API rate limiting on backend endpoints
- [ ] **Authentication** — user login / session management for multi-user deployment
- [ ] **Audit logging** — track who changed what and when

### Production Readiness: Contrast & Accessibility
- [x] **PR.1** Light mode contrast overhaul — recalibrated zinc palette CSS variables for WCAG AA compliance
- [x] **PR.2** View switcher contrast fix — unified inactive tab styles across themes

### Phase 4 — Polish & Performance
| # | Feature | Status |
|---|---------|--------|
| 16 | Smart data caching (stale-while-revalidate, tiered staleTime) | Complete |
| 17 | Code splitting (vendor chunks: app 300KB + 4 vendor chunks) | Complete |
| 18 | Loading spinner (animated spinner replaces plain text loading) | Complete |
| 19 | Wider command palette (responsive: md:2xl, lg:3xl) | Complete |
| 20 | Clickable issue keys in sprint scope modal | Complete |
| 21 | Light mode contrast overhaul (WCAG AA zinc palette recalibration) | Complete |
| 22 | Chart hints (best/worst case explanations on sprint charts) | Complete |
| 23 | Rich text editor always available for description editing | Complete |
| 24 | Correct GitHub/changelog URLs in About page | Complete |
| 25 | Project avatars from Jira API | Complete |
| 26 | Backend tests (pytest) — 25 tests, all endpoints mocked | Complete |
| 27 | E2E tests (Playwright) — 22 tests, full API mocking, PWA SW disabled | Complete |
| 28 | Auto-generated app screenshots (`docs/APP_SCREENSHOTS.md`) — 17 views | Complete |
| 29 | HTTPS via Tailscale (Traefik + TLS certs) | Complete |
| 46 | SearchableSelect — autocomplete dropdowns with type-to-filter (7 dropdowns replaced) | Complete |
| 47 | Create Project modal — name, key, type, lead, description via `POST /api/projects` | Complete |
| 48 | Create submenu — `+ Create` dropdown with Issue and Project options | Complete |
| 49 | Settings page — view/edit Jira connection, test connection, app preferences | Complete |
| 50 | Searchable sprint selector — type-to-filter sprint dropdown on Sprint Dashboard | Complete |
| 51 | "Open in Jira" ↗ button — link to Jira on list rows, board cards, detail panel | Complete |
| 52a | Upgrade Vite 7→8 + @vitejs/plugin-react 5→6 | Planned |
| 52b | Upgrade jsdom 28→29 | Planned |
| 52c | Upgrade @tiptap/* 3.20.1→latest (when dist/ fixed) | Planned |
| 53 | OpenTelemetry — distributed tracing, metrics, and logging across backend + Traefik | Planned |
| 55 | Refactor sprints/boards to Platform API — replace Agile API for OAuth compatibility | Complete |
| 56 | Ansible playbook — automated VPS deployment (Contabo/any Linux) | Planned |
| 57 | Production docker-compose + Let's Encrypt + taskara.alt-f1.be — deploy/public/ | Complete |
| 58 | Deploy user + SSH key auth (no root deployment) | Planned |
| 86 | Cloudflare Tunnel (cloudflared) — expose Taskara via Cloudflare without opening ports 80/443, DDoS protection, WAF, caching ([docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)) | Planned |
| 87 | OpenAppSec WAF — open-source web application firewall via Docker sidecar, ML-based threat detection, OWASP Top 10 protection ([docker](https://hub.docker.com/r/openappsec/open-appsec-gateway), [docs](https://docs.openappsec.io/)) | Planned |
| 59 | Redis session store — abstract SessionStore with Redis + file fallback (ADR-022) | Complete |
| 60 | Support Jira Service Management project URLs (`/jira/servicedesk/`) | Planned |
| 61 | Support Jira Product Discovery project URLs (`/jira/discovery/`) | Planned |
| 62 | Board view: show warning when >100 issues (Jira API limit). Users use Jira UI for large projects | Complete |
| 54 | Production mode — API Token auth completely disabled, OAuth only | Complete |
| 63 | Sprint state filter dropdown — filter sprints by Active & Future / Active / Future / Closed / All | Complete |
| 64 | Environment ribbon on login page — show STG/DEV indicator before authentication | Complete |
| 73 | Custom fields best practices — display/edit Jira custom fields (story points, sprint, epic link, team, environment, etc.) with proper field type handling (single/multi select, cascading, user picker, date, number, text, URL) | Planned |
| 74 | Spaces support — display Jira Spaces (project groupings) in sidebar/dashboard with space name, type (team-managed/company-managed), quick links, open work items count, and boards. Jira uses Spaces instead of raw project lists on the "For you" page | Planned |
| 75 | GitHub issue templates — bug report, feature request, question with pre-filled labels + config.yml with contact links | Complete |
| 89 | feat: URL-based routing — reflect current view + context in the browser URL bar (e.g. `/board`, `/sprint/123`, `/issue/PROJ-45`, `/settings`) so browser refresh preserves state instead of going to homepage. Use React Router or `history.pushState` | Planned |
| 76 | fix: Sprint Dashboard shows only 2 sprints with "All" filter — investigate Agile API pagination + closed sprint fetching ([#39](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/39)) | Planned |

### Phase 4b — CI Intelligence
| # | Feature | Status |
|---|---------|--------|
| 42 | AI-powered CI auto-fix: agent monitors failures, diagnoses errors, opens fix PRs | In Progress |
| 43 | GitHub Actions `on: workflow_run` trigger on CI failure → create issue + notify | Complete |
| 44 | Structured error log extraction + category detection (7 categories) | Complete |
| 45 | Auto-fix PR with conventional commit, linked issue, and CI re-run | Planned |

#### Phase 4b Details

**Goal**: When CI fails, an AI agent automatically reads the error logs, diagnoses the issue, creates a fix, and opens a PR — no human intervention needed for common failures.

**Architecture**:
- New workflow `.github/workflows/ci-autofix.yml` triggered by `on: workflow_run` (when CI fails)
- Extracts structured error output from the failed run via GitHub API (`gh run view --log-failed`)
- Sends error context to an AI coding agent (OpenClaw/Codex/Claude Code) via webhook or cron job
- Agent clones repo, reproduces failure, writes fix, runs tests locally
- If tests pass, agent opens a PR with `fix:` conventional commit referencing a new auto-created issue
- PR triggers normal CI — if it passes, ready for merge
- Dashboard/Discord notification on auto-fix success or escalation to human

**Common auto-fixable failures**:
- Test runner picking up wrong files (e.g., Playwright specs in Vitest) ← today's bug
- Dependency version mismatches after Dependabot updates
- TypeScript type errors from upstream library changes
- Linting/formatting issues
- Import path changes after file moves

### Phase 5 — Multi-User Auth & Public SaaS
| # | Feature | Status |
|---|---------|--------|
| 30 | Atlassian OAuth 2.0 (3LO) — "Login with Atlassian" SSO | Complete |
| 31 | Per-user session management (OAuth tokens route API calls, auto-refresh) | Complete |
| 32 | Login/logout UI (Login button, user avatar, logout in header) | Complete |
| 33 | Per-user Jira site selection (accessible-resources API) — site picker after OAuth login (ADR-019) | Complete |
| 34 | HTTPS via Traefik + Tailscale TLS (OAuth callbacks work) | Complete |
| 35 | Rate limiting & abuse protection — tiered per-IP limits (ADR-020) | Complete |
| 36 | Multi-tenant data isolation (no cross-user token leakage) | Planned |
| 37 | Terms of Service page (usage terms, liability, SLA, acceptable use) | Planned |
| 38a | Data Privacy Policy — GDPR (EU/EEA) — 10 sections, DPA contact, supervisory authority | Complete |
| 38b | Data Privacy Policy — CCPA (California) | Planned |
| 38c | Data Privacy Policy — PIPEDA (Canada) | Planned |
| 38d | Data Privacy Policy — LGPD (Brazil) | Planned |
| 38e | Data Privacy Policy — POPIA (South Africa) | Planned |
| 38f | Data Privacy Policy — APPs (Australia) | Planned |
| 39 | Cookie consent banner — GDPR opt-in, Accept/Necessary only, localStorage persistence | Complete |
| 40 | Footer with ALT-F1 branding — link to alt-f1.be + GitHub + version | Complete |
| 41 | Production deployment (Docker + Traefik + Watchtower on Raspberry Pi) | Complete |

#### Phase 5 Details

**Goal**: Transform from single-user self-hosted tool to a public SaaS where anyone can log in with their own Atlassian account and manage their Jira instance.

**Architecture**:
- Register an OAuth 2.0 (3LO) app at `developer.atlassian.com`
- Backend: `/auth/login` redirects to Atlassian consent screen
- Backend: `/auth/callback` exchanges code for access + refresh tokens
- Tokens stored per-user in encrypted SQLite (or PostgreSQL for production)
- Frontend: unauthenticated users see a landing/login page
- Frontend: authenticated users get the full app, scoped to their Jira site
- Each API call uses the logged-in user's token (not a shared API token)
- Atlassian's `accessible-resources` API lets users pick which Jira site to connect

**Legal & Branding**:
- **Terms of Service**: usage terms, liability limitations, SLA expectations, acceptable use policy, termination clauses
- **Privacy Policy**: multi-jurisdiction compliance covering:
  - 🇪🇺 GDPR (EU/EEA) — data processing basis, right to erasure, DPO contact, data transfer safeguards
  - 🇺🇸 CCPA (California) — right to know, right to delete, opt-out of sale
  - 🇨🇦 PIPEDA (Canada) — consent, access, accountability principles
  - 🇧🇷 LGPD (Brazil) — legal basis, data subject rights, international transfers
  - 🇿🇦 POPIA (South Africa) — conditions for lawful processing, data subject participation
  - 🇦🇺 APPs (Australia) — collection, use, disclosure, cross-border transfer
- **Cookie consent**: GDPR-compliant banner (opt-in for EU, informational for others)
- **Server-side data**: only OAuth tokens (encrypted) + session data — no Jira content is ever persisted on the server
- **Client-side cache**: Jira data (issues, boards, sprints) is cached in the user's browser only (React Query in-memory cache, Workbox service worker cache in IndexedDB, localStorage for preferences). All cached data stays on the user's device, is never transmitted to third parties, and is cleared on logout or browser cache clear. Users must be informed of this in the Privacy Policy
- **Footer**: "Built by [ALT-F1](https://www.alt-f1.be)" with company logo/link on every page
- **About page**: credit ALT-F1 as project creator with link to www.alt-f1.be

---

### Phase 6 — Branding & Marketing

#### Origin Story

Since 2023, Abdelkrim has been using Jira daily. The native Atlassian UI has consistently lacked in UX quality — poor navigation, clunky exports, slow workflows, and a general friction that adds stress to every workday. This project is an attempt to build the Jira frontend that should have existed: fast, keyboard-driven, and designed for people who actually use Jira every day. A better UI to reduce the daily pain of Jira users.

> **Disclaimer**: ALT-F1 is an independent company and is **not affiliated with, endorsed by, or connected to Atlassian** in any way. This is a third-party alternative frontend that uses Jira's public REST APIs.

> **Trademark constraint**: "Jira" is a registered trademark of Atlassian. The app name **must not** contain "Jira", "JIRA", or any variation. The name must be original and legally safe.

| # | Task | Status |
|---|------|--------|
| 65 | App name: **Taskara** — domain: taskara.alt-f1.be | Complete |
| 65b | Design a logo — icon + wordmark, works in dark/light mode | Planned |
| 65c | Generate all brand assets from logo — favicon.ico (16/32/48px), apple-touch-icon (180px), PWA icons (192/512px maskable), Android adaptive icon, OG social preview image (1200×630), Twitter card image, GitHub social preview (1280×640), README header banner, email signature logo, loading/splash screen | Planned |
| 66 | Register DNS: `taskara.alt-f1.be` — point to production server | Planned |
| 67 | Landing page — product pitch, screenshots, "Login with Atlassian" CTA, origin story | Planned |
| 68 | LinkedIn announcement — post on ALT-F1 company page + Abdelkrim's profile | Planned |
| 68b | LinkedIn beta testers call — short post inviting Jira users to test Taskara and give feedback (see draft below) | Planned |
| 69 | Twitter/X announcement — launch thread with screenshots/demo GIF (see draft below) | Planned |
| 70 | LinkedIn Groups — share in Atlassian/Jira/Agile communities (Atlassian Community, Jira Users, Agile Project Management) | Planned |
| 71 | Product Hunt launch (optional) — listing with tagline + screenshots | Planned |
| 72 | README + About page — add origin story, ALT-F1 independence disclaimer, app name | Planned |
| 88 | Public demo gallery page — interactive screenshot showcase of all views (dashboard, list, board, sprint, detail, settings, about, terms, privacy) using mock data, accessible without login at `/demo` or landing page section | Planned |

### Phase 7 — Monetization (Stripe)

#### LinkedIn Beta Testers Draft (#68b)

> 🚀 **Tired of Jira's slow UI? I built something about it.**
>
> Since 2023, I've been using Jira daily. The navigation is clunky, the exports are painful, and every click feels like it takes too long.
>
> So I built **Taskara** — a modern, fast, keyboard-driven alternative frontend for Jira Cloud. Same data, better experience.
>
> ✅ Kanban board with drag & drop
> ✅ Sprint dashboard with burndown & velocity charts
> ✅ Ctrl+K command palette for instant search
> ✅ Dark/light mode, offline support, PWA
> ✅ Login with your own Atlassian account (OAuth 2.0)
> ✅ No data stored on our servers — your Jira, your browser
>
> 🔎 **I'm looking for beta testers!**
> If you use Jira daily and want a faster UI, I'd love your feedback.
>
> 👉 Try it: https://taskara.alt-f1.be
> 💬 Feedback: [GitHub Issues](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/new/choose)
>
> Built by ALT-F1 SRL, Brussels 🇧🇪 — not affiliated with Atlassian.
> Open source (MIT): https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui
>
> #Jira #Atlassian #ProjectManagement #Agile #OpenSource #SaaS #BetaTesters #DevTools

#### Twitter/X Launch Thread Draft (#69) — @altf1be

> **Tweet 1 (hook)**
> Jira's UI is painfully slow. So I built a faster one.
>
> Introducing Taskara — a modern alternative frontend for Jira Cloud ⚡
>
> Same data. Better UX. Open source.
>
> 🧵 Thread 👇

> **Tweet 2 (features)**
> What you get:
> ⌨️ Ctrl+K command palette
> 📋 Kanban board with drag & drop
> 📊 Sprint burndown & velocity charts
> ⏱️ Built-in time tracking
> 🌙 Dark/light mode
> 📱 PWA — works offline
> 🔐 Login with your Atlassian account

> **Tweet 3 (privacy)**
> Your data stays yours:
> • No Jira content stored on our servers
> • OAuth tokens encrypted at rest
> • Session fingerprinting against stolen cookies
> • Rate limited API
> • GDPR compliant 🇪🇺

> **Tweet 4 (tech)**
> Built with:
> • React 19 + Vite + TypeScript
> • FastAPI + Redis
> • Traefik + Let's Encrypt
> • 302 tests (unit + E2E + backend)
> • Docker multi-arch (amd64 + arm64)
>
> Open source: https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui

> **Tweet 5 (CTA)**
> 🔎 Looking for beta testers!
>
> If you use Jira daily and want a faster UI → try it:
> 👉 https://taskara.alt-f1.be
>
> Feedback welcome: https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues
>
> Built by @altf1be 🇧🇪🇲🇦
> Not affiliated with Atlassian.
>
> #Jira #OpenSource #DevTools #Agile

---

### Phase 7 — Monetization (Stripe)

**Pricing**: €3.99/month excl. VAT. All payments in EUR regardless of customer country.

**Stripe account**: Already owned by ALT-F1 SRL.

**Billing dashboard**: [ALT-F1-OpenClaw/cashflow-lite](https://github.com/ALT-F1-OpenClaw/cashflow-lite) — self-hosted Stripe analytics (MRR, churn, subscriptions, invoices). Generic, reusable across all ALT-F1 SaaS products. Stack: FastAPI + React. License: EUPL-1.2.

| # | Task | Status |
|---|------|--------|
| 77 | Stripe Product + Price setup — create "Taskara Pro" product with €3.99/month recurring price in EUR ([Stripe Dashboard → Products](https://dashboard.stripe.com/products)) | Planned |
| 78 | Stripe Checkout integration — backend endpoint to create Checkout Session, redirect to Stripe-hosted payment page ([docs](https://docs.stripe.com/checkout/quickstart)) | Planned |
| 79 | Stripe Customer Portal — self-service billing management (update card, cancel, invoices) ([docs](https://docs.stripe.com/customer-management/integrate-customer-portal)) | Planned |
| 80 | Stripe Webhooks — handle `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` to activate/deactivate access ([docs](https://docs.stripe.com/webhooks)) | Planned |
| 81 | Subscription status in session — store Stripe customer ID + subscription status per user, gate features behind active subscription | Planned |
| 82 | Pricing page — show plan, price (€3.99/mo excl. VAT), features list, "Subscribe" CTA | Planned |
| 83 | Stripe Tax — automatic VAT calculation based on customer location (EU VAT, reverse charge for B2B) ([docs](https://docs.stripe.com/tax)) | Planned |
| 84 | Free trial (optional) — 14-day trial via Stripe subscription trial period | Planned |
| 85 | Invoice + receipt emails — Stripe-managed or custom via webhooks | Planned |

#### Stripe Setup Links
- [Stripe Dashboard](https://dashboard.stripe.com/)
- [Create Product + Price](https://dashboard.stripe.com/products/create)
- [Checkout Integration Guide](https://docs.stripe.com/checkout/quickstart)
- [Customer Portal Setup](https://dashboard.stripe.com/settings/billing/portal)
- [Webhook Endpoints](https://dashboard.stripe.com/webhooks)
- [Stripe Tax Configuration](https://dashboard.stripe.com/settings/tax)
- [Test Mode (for development)](https://dashboard.stripe.com/test/products)

---

**Security requirements for public SaaS**:
- HTTPS mandatory (OAuth callback + token transport)
- CSRF protection on all mutation endpoints
- Secure cookie-based sessions (HttpOnly, SameSite=Strict, Secure)
- Token encryption at rest (Fernet or similar)
- Rate limiting per user/IP
- No shared API tokens — each user brings their own Atlassian access
