# Roadmap

## Phase 1 — Core Views

### 1. List view enhancements

- [x] Basic table with issue key, type, summary, status, priority, assignee, updated — *BDD tests: `App.test.tsx` (11 scenarios)*
- [ ] Column sorting (click header to sort by field)
- [ ] Filter dropdowns (status, type, assignee)
- [ ] Pagination (offset-based, next/previous controls)

**Tech**: React state for sort/filter params, `useQuery` queryKey updates. Backend already supports `status`, `assignee`, `type` query params on `GET /api/issues`.

### 2. Issue detail panel

- [ ] Side panel or full-page view showing all issue fields
- [ ] ADF (Atlassian Document Format) description rendering
- [ ] Inline editing: summary, description, assignee, priority
- [ ] Status transitions via dropdown (using available transitions)
- [ ] Display labels, reporter, due date, created/updated timestamps

**Tech**: Backend `GET /api/issues/{key}`, `PATCH /api/issues/{key}`, `POST /api/issues/{key}/transition` — all exist. TanStack Query `useMutation` for updates. ADF-to-React renderer for description.

### 3. Board view (Kanban)

- [ ] Columns grouped by status category (To Do / In Progress / Done)
- [ ] Issue cards with key, summary, priority, assignee avatar
- [ ] Drag-and-drop between columns triggers status transition
- [ ] Swimlanes by assignee or priority (optional toggle)

**Tech**: `@dnd-kit/core` + `@dnd-kit/sortable` (already in `package.json`). Backend `GET /api/boards/{id}`, `POST /api/issues/{key}/transition`. Group issues by `status.category`.

### 4. Quick search / Command palette

- [ ] `Ctrl+K` opens command palette overlay
- [ ] Fuzzy search across issues with debounced input
- [ ] Navigate to issue detail or project from results
- [ ] Recent searches history

**Tech**: `cmdk` (already in `package.json`). Backend `GET /api/search/quick` exists. Debounced fetch, keyboard navigation.

---

## Phase 2 — Productivity

### 5. Keyboard shortcuts

- [ ] `j`/`k` navigate up/down in list view
- [ ] `Enter` opens issue detail
- [ ] `Escape` closes detail/modal
- [ ] `b`/`l` switch between board and list views
- [ ] `?` shows shortcut help overlay

**Tech**: `useEffect` keydown listeners or `hotkeys-js`. Context-aware shortcuts (disabled when typing in inputs).

### 6. Quick create modal

- [ ] `c` key opens create issue modal
- [ ] Fields: project, summary, type, priority, assignee, description
- [ ] Form validation (project + summary required)
- [ ] Optimistic UI update after creation

**Tech**: Backend `POST /api/issues` exists. React dialog component, TanStack Query `useMutation`, `queryClient.invalidateQueries` on success.

### 7. Bulk actions

- [ ] Checkbox selection on list view rows
- [ ] Select all / deselect all
- [ ] Bulk transition (change status for selected issues)
- [ ] Bulk assign (set assignee for selected issues)
- [ ] Bulk priority change

**Tech**: React state for selected issue IDs, batch API calls via `Promise.allSettled`, progress indicator.

### 8. Saved filters

- [ ] Save current filter combination (project + status + assignee + type) as named view
- [ ] Quick-access filter list in sidebar or dropdown
- [ ] Edit and delete saved filters
- [ ] Persist in `localStorage`

**Tech**: `localStorage` for persistence, filter preset UI. Optional: backend endpoint for server-side persistence.

---

## Phase 3 — Power Features

### 9. Sprint dashboard

- [ ] Active sprint overview with issue counts by status
- [ ] Burndown chart (remaining work over time)
- [ ] Velocity chart (story points per sprint)
- [ ] Sprint scope change tracking

**Tech**: Backend `GET /api/boards/{id}/sprint` exists. Jira Agile API `/rest/agile/1.0` configured in `jira_client.py`. Chart library: `recharts` or `chart.js`.

### 10. Time tracking

- [ ] Built-in timer per issue (start/stop/pause)
- [ ] Log work from board or detail view
- [ ] Display logged vs estimated time
- [ ] Work log history

**Tech**: Jira REST API `POST /rest/api/3/issue/{key}/worklog`. New backend endpoint needed. Timer state in React (persisted in `localStorage`).

### 11. Dark/light mode toggle

- [x] Dark mode (current default)
- [ ] Light mode theme
- [ ] Toggle switch in header
- [ ] Persist preference in `localStorage`
- [ ] Respect system preference (`prefers-color-scheme`)

**Tech**: Tailwind CSS `dark:` variant classes, CSS custom properties, `localStorage` for preference.

### 12. Offline mode

- [ ] Service worker for static asset caching
- [ ] Cache API responses for offline reading
- [ ] Queue mutations (create, update, transition) when offline
- [ ] Sync queued changes on reconnect
- [ ] Offline indicator in header

**Tech**: `vite-plugin-pwa` (Workbox), IndexedDB for offline mutation queue, `navigator.onLine` event listeners.

---

## Build Order

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | List view enhancements | 1 | Partial |
| 2 | Issue detail panel | 1 | Not started |
| 3 | Quick search / Command palette | 1 | Not started |
| 4 | Board view (Kanban) | 1 | Not started |
| 5 | Quick create modal | 2 | Not started |
| 6 | Keyboard shortcuts | 2 | Not started |
| 7 | Bulk actions | 2 | Not started |
| 8 | Saved filters | 2 | Not started |
| 9 | Sprint dashboard | 3 | Not started |
| 10 | Dark/light mode toggle | 3 | Partial |
| 11 | Time tracking | 3 | Not started |
| 12 | Offline mode | 3 | Not started |
