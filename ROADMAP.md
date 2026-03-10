# Roadmap

## Phase 1 — Core Views

### 1. List view enhancements

- [x] **1.1** Basic table with issue key, type, summary, status, priority, assignee, updated — *BDD tests: `App.test.tsx` (11 scenarios)*
- [x] **1.2** Column sorting (click header to sort by field) — *BDD tests: `App.test.tsx` (6 scenarios)*
- [x] **1.3** Filter dropdowns (status, type, assignee) — *BDD tests: `App.test.tsx` (8 scenarios)*
- [ ] **1.4** Pagination (offset-based, next/previous controls)

**Tech**: React state for sort/filter params, `useQuery` queryKey updates. Backend already supports `status`, `assignee`, `type` query params on `GET /api/issues`.

### 2. Issue detail panel

- [ ] **2.1** Side panel or full-page view showing all issue fields
- [ ] **2.2** ADF (Atlassian Document Format) description rendering
- [ ] **2.3** Inline editing: summary, description, assignee, priority
- [ ] **2.4** Status transitions via dropdown (using available transitions)
- [ ] **2.5** Display labels, reporter, due date, created/updated timestamps

**Tech**: Backend `GET /api/issues/{key}`, `PATCH /api/issues/{key}`, `POST /api/issues/{key}/transition` — all exist. TanStack Query `useMutation` for updates. ADF-to-React renderer for description.

### 3. Board view (Kanban)

- [ ] **3.1** Columns grouped by status category (To Do / In Progress / Done)
- [ ] **3.2** Issue cards with key, summary, priority, assignee avatar
- [ ] **3.3** Drag-and-drop between columns triggers status transition
- [ ] **3.4** Swimlanes by assignee or priority (optional toggle)

**Tech**: `@dnd-kit/core` + `@dnd-kit/sortable` (already in `package.json`). Backend `GET /api/boards/{id}`, `POST /api/issues/{key}/transition`. Group issues by `status.category`.

### 4. Quick search / Command palette

- [ ] **4.1** `Ctrl+K` opens command palette overlay
- [ ] **4.2** Fuzzy search across issues with debounced input
- [ ] **4.3** Navigate to issue detail or project from results
- [ ] **4.4** Recent searches history

**Tech**: `cmdk` (already in `package.json`). Backend `GET /api/search/quick` exists. Debounced fetch, keyboard navigation.

---

## Phase 2 — Productivity

### 5. Keyboard shortcuts

- [ ] **5.1** `j`/`k` navigate up/down in list view
- [ ] **5.2** `Enter` opens issue detail
- [ ] **5.3** `Escape` closes detail/modal
- [ ] **5.4** `b`/`l` switch between board and list views
- [ ] **5.5** `?` shows shortcut help overlay

**Tech**: `useEffect` keydown listeners or `hotkeys-js`. Context-aware shortcuts (disabled when typing in inputs).

### 6. Quick create modal

- [ ] **6.1** `c` key opens create issue modal
- [ ] **6.2** Fields: project, summary, type, priority, assignee, description
- [ ] **6.3** Form validation (project + summary required)
- [ ] **6.4** Optimistic UI update after creation

**Tech**: Backend `POST /api/issues` exists. React dialog component, TanStack Query `useMutation`, `queryClient.invalidateQueries` on success.

### 7. Bulk actions

- [ ] **7.1** Checkbox selection on list view rows
- [ ] **7.2** Select all / deselect all
- [ ] **7.3** Bulk transition (change status for selected issues)
- [ ] **7.4** Bulk assign (set assignee for selected issues)
- [ ] **7.5** Bulk priority change

**Tech**: React state for selected issue IDs, batch API calls via `Promise.allSettled`, progress indicator.

### 8. Saved filters

- [ ] **8.1** Save current filter combination (project + status + assignee + type) as named view
- [ ] **8.2** Quick-access filter list in sidebar or dropdown
- [ ] **8.3** Edit and delete saved filters
- [ ] **8.4** Persist in `localStorage`

**Tech**: `localStorage` for persistence, filter preset UI. Optional: backend endpoint for server-side persistence.

---

## Phase 3 — Power Features

### 9. Sprint dashboard

- [ ] **9.1** Active sprint overview with issue counts by status
- [ ] **9.2** Burndown chart (remaining work over time)
- [ ] **9.3** Velocity chart (story points per sprint)
- [ ] **9.4** Sprint scope change tracking

**Tech**: Backend `GET /api/boards/{id}/sprint` exists. Jira Agile API `/rest/agile/1.0` configured in `jira_client.py`. Chart library: `recharts` or `chart.js`.

### 10. Time tracking

- [ ] **10.1** Built-in timer per issue (start/stop/pause)
- [ ] **10.2** Log work from board or detail view
- [ ] **10.3** Display logged vs estimated time
- [ ] **10.4** Work log history

**Tech**: Jira REST API `POST /rest/api/3/issue/{key}/worklog`. New backend endpoint needed. Timer state in React (persisted in `localStorage`).

### 11. Dark/light mode toggle

- [x] **11.1** Dark mode (current default)
- [ ] **11.2** Light mode theme
- [ ] **11.3** Toggle switch in header
- [ ] **11.4** Persist preference in `localStorage`
- [ ] **11.5** Respect system preference (`prefers-color-scheme`)

**Tech**: Tailwind CSS `dark:` variant classes, CSS custom properties, `localStorage` for preference.

### 12. Offline mode

- [ ] **12.1** Service worker for static asset caching
- [ ] **12.2** Cache API responses for offline reading
- [ ] **12.3** Queue mutations (create, update, transition) when offline
- [ ] **12.4** Sync queued changes on reconnect
- [ ] **12.5** Offline indicator in header

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
