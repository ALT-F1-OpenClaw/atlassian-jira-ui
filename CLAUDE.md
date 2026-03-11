# CLAUDE.md

## Project

Modern alternative frontend for Atlassian Jira Cloud. Full-stack: FastAPI backend + React frontend.

## Tech Stack

- **Backend**: Python 3.13, FastAPI, httpx (async Jira client), uvicorn — port 35400
- **Frontend**: React 19, Vite 6, TypeScript 5.7 (strict), Tailwind CSS 4, TanStack Query, Recharts — port 5173
- **Testing**: Vitest 4 + @testing-library/react + @testing-library/user-event (BDD style)
- **Screenshots**: Playwright E2E (`frontend/e2e/screenshots.spec.ts` → `docs/APP_SCREENSHOTS.md`)
- **Backend tests**: pytest + pytest-asyncio, mock all Jira calls (`backend/tests/`)
- **E2E tests**: Playwright with `page.route()` API mocking, PWA service worker disabled

## Directory Layout

```
backend/           → FastAPI app
  app/main.py      → App setup, CORS, router registration
  app/config.py    → Pydantic Settings (env vars)
  app/jira_client.py → Async Jira API client with rate-limit retry
  app/version.py   → Single version source (synced by bump script)
  app/routers/     → projects, issues, boards, search
  start.sh         → Start backend with venv + uvicorn --reload
frontend/          → React SPA
  src/App.tsx       → Main component (list view, filters, pagination)
  src/App.test.tsx  → 32 BDD test scenarios
  vite.config.ts   → Proxy /api → localhost:35400
scripts/
  bump-version.mjs  → Sync version across package.json, frontend/package.json, backend/app/version.py
  frontend/e2e/     → Playwright E2E tests + screenshot generator
  backend/tests/    → pytest backend tests (all endpoints mocked)
```

## Commands

```bash
# Backend
cd backend && bash start.sh          # Start backend (activates .venv, uvicorn on :35400)

# Frontend
cd frontend && npm run dev           # Vite dev server on :5173 (proxies /api to backend)
cd frontend && npm run build         # TypeScript check + production build
cd frontend && npm test -- --run     # Run all tests (32 BDD scenarios)
cd frontend && npm run test:watch    # Watch mode

# Versioning (from root)
node scripts/bump-version.mjs patch  # 1.9.0 → 1.9.1 (bug fixes)
node scripts/bump-version.mjs minor  # 1.9.0 → 1.10.0 (new features)
node scripts/bump-version.mjs major  # 1.9.0 → 2.0.0 (breaking changes)

# Screenshots (requires both servers running)
cd frontend && npm run build && npx playwright test e2e/screenshots.spec.ts
```

## Conventions

### Commits
- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- **Never** include `Co-Authored-By` lines
- Commit message via HEREDOC for clean formatting
- After committing a feature/fix, run `node scripts/bump-version.mjs <level>` — it generates CHANGELOG, commits, and tags

### Code Style
- Frontend: single App.tsx file (no component splitting yet), Tailwind utility classes, dark theme, **fully responsive** (mobile-first, works on phone/tablet/desktop)
- Backend: async endpoints, JQL query construction, `_format_issue()` normalizes Jira responses
- Tests: BDD naming (`Given ... then ...`), use `within()` to scope assertions, `userEvent` for interactions
- Filter dropdown order matches table column order: Type → Status → Assignee

### Workflow
- Roadmap is in `ROADMAP.md` with numbered task IDs (e.g., `1.2`, `3.3`) — reference by ID
- Each completed task gets BDD tests noted in the roadmap checkbox
- Page size is 50 (aligned with Jira API default, capped at 100)

## Environment Variables

```env
# Backend
JIRA_HOST=https://your-domain.atlassian.net
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=your-api-token
CORS_ORIGINS=http://localhost:5173

# Frontend
VITE_API_URL=http://localhost:35400
```

## References

- [Jira REST API v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/) — all backend endpoints proxy to this
- [Jira Agile REST API](https://developer.atlassian.com/cloud/jira/software/rest/intro/) — boards/sprints (`base="agile"` in `jira_request`)

## Current State

Phase 1, Sections 1–2 complete + enhancements:
- **List View** (tasks 1.1–1.4): table, sorting, filters, pagination
- **Responsive design**: mobile-first cards, stacked filters, adaptive pagination
- **Issue Detail Panel** (tasks 2.1–2.5): slide-in side panel, ADF rendering, inline editing, status transitions, metadata display
- **Rich text editor**: TipTap-based ADF editor with toolbar (bold, italic, headings, lists, links, code blocks)
- **Smart dropdowns**: Assignee (from Jira project members), Priority (from Jira priorities), Status transitions
- **Date picker**: Native date widget for due date (add/clear)
- **Editable labels**: Add/remove with autocomplete from Jira labels
- **PWA**: Web app manifest, service worker, installable on mobile
- **Board view / Kanban** (tasks 3.1–3.4): columns by status category, issue cards, drag-and-drop transitions, swimlanes (assignee/priority)
- **Mobile Kanban arrows**: ← → buttons on cards for status transitions (mobile only, sm:hidden)
- **Command Palette** (tasks 4.1–4.4): Ctrl+K/Cmd+K overlay, debounced fuzzy search via `/api/search/quick`, arrow key navigation, Enter to open issue detail, recent searches in localStorage
- **Keyboard Shortcuts** (tasks 5.1–5.5): j/k list navigation with highlight, Enter opens issue, Escape closes panels, b/l view switching, ? help overlay, context-aware (disabled in inputs)
- **Quick Create Modal** (tasks 6.1–6.4): `c` key or `+ Create` button opens modal, project/summary/type/priority/assignee/description fields, form validation (project + summary required), optimistic UI update with query invalidation
- **Bulk Actions** (tasks 7.1–7.5): checkbox selection on list rows, select all/deselect all, floating action bar with bulk transition/assign/priority dropdowns, `Promise.allSettled` batch API calls, success/failure result display, responsive layout
- **Saved Filters** (tasks 8.1–8.4): save current filter combination (project + status + type + assignee) as named view, quick-access dropdown in header, inline rename/delete, localStorage persistence (`jira-ui-saved-filters`)
- **Sprint Dashboard** (tasks 9.1–9.4): active sprint overview with issue counts by status (pie chart), burndown chart (remaining vs ideal), velocity chart (committed vs completed points across sprints), sprint scope change tracking, `s` keyboard shortcut, sprint selector dropdown, responsive layout
- **Time Tracking** (tasks 10.1–10.4): built-in timer per issue (start/stop/pause) with localStorage persistence, log work modal (time spent + description), time tracking progress bar (logged vs estimated), worklog history display, backend `POST/GET /api/issues/{key}/worklog`
- **Dark/Light Mode** (tasks 11.1–11.5): CSS variable-based theme switching (zinc palette override), sun/moon toggle button in header, localStorage persistence (`jira-ui-theme`), system preference detection via `prefers-color-scheme`, inline script in `index.html` prevents flash of wrong theme
- **Offline Mode** (tasks 12.1–12.5): Workbox service worker for static asset + API response caching (NetworkFirst strategy), IndexedDB mutation queue for offline creates/updates/transitions, auto-sync on reconnect with error handling, offline banner with dismiss + header dot indicator
- **Sprint CRUD** (tasks 9b.1–9b.5): create sprint modal (name/goal/dates), edit sprint modal, start/complete sprint with confirmation dialogs, delete sprint with confirmation, manage sprint scope (add/remove issues), backend CRUD endpoints via Jira Agile API
- **UI Visibility & Navigation** (tasks 13.1–13.5): segmented view switcher with icons (Home/List/Board/Sprint), collapsible sidebar navigation (projects, saved filters, view shortcuts), breadcrumb bar (Home → View → Issue), dashboard landing page (quick actions, active sprints, recent issues, projects), empty states with CTAs
- **About / Features Page** (tasks 14.1–14.4): dedicated about page accessible from sidebar, lists all 21 features with version badges and descriptions, shows app version/build date/GitHub+changelog links, responsive card-based layout, tech stack section
- **Total: 302 tests** (255 frontend unit + 25 backend pytest + 22 Playwright E2E)

Phase 1 complete. Phase 2 complete. Phase 3 complete — Sprint dashboard, sprint CRUD, time tracking, dark/light mode, offline mode, UI navigation, and about page done.
CI/CD: GitHub Actions (CI, release, Docker build, CodeQL, Dependabot). Docker images published to GHCR on tag push (multi-arch amd64+arm64).
Light mode recalibrated for WCAG AA contrast. Bundle code-split into 5 chunks (app 300KB + vendors).
Smart caching: CACHE_STATIC (30min) for priorities/projects/members, CACHE_LIST (2min) for issue lists, CACHE_DETAIL (1min) for single issues.
Phase 4 nearly complete: loading spinners, wider command palette, chart hints, clickable scope links, description editor always rich text, project avatars, backend tests (pytest), E2E tests (Playwright), auto-generated screenshots. Only HTTPS via Tailscale remaining.

**Bug fix workflow**: Every fix must have a GitHub issue (label: `bug`) created BEFORE the fix. Commit message references the issue (`fixes #N`). This ensures full traceability of what broke, why, and when it was fixed.

See `ROADMAP.md` for full status.
