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

**Tech**: Backend `POST /api/issues` exists. `CreateIssueModal` component with form validation, `useMutation` for creation, `queryClient.setQueriesData` for optimistic cache update + `invalidateQueries` on success. `c` shortcut context-aware (disabled in inputs). `+ Create` button in header.

### 7. Bulk actions

- [x] **7.1** Checkbox selection on list view rows — *BDD tests: `App.test.tsx` (4 scenarios)*
- [x] **7.2** Select all / deselect all — *BDD tests: `App.test.tsx` (3 scenarios)*
- [x] **7.3** Bulk transition (change status for selected issues) — *BDD tests: `App.test.tsx` (2 scenarios)*
- [x] **7.4** Bulk assign (set assignee for selected issues) — *BDD tests: `App.test.tsx` (1 scenario)*
- [x] **7.5** Bulk priority change — *BDD tests: `App.test.tsx` (2 scenarios)*

**Tech**: React state (`Set<string>`) for selected issue IDs. `BulkActionBar` floating component with transition/assign/priority dropdowns. Batch API calls via `Promise.allSettled`, success/failure result display. Checkbox column in table header (select all) and each row.

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
| 2 | Issue detail panel | 1 | Complete |
| 3 | Quick search / Command palette | 1 | Complete |
| 4 | Board view (Kanban) | 1 | Complete |
| 5 | Keyboard shortcuts | 2 | Complete |
| 6 | Quick create modal | 2 | Complete |
| 7 | Bulk actions | 2 | Complete |
| 8 | Saved filters | 2 | Not started |
| 9 | Sprint dashboard | 3 | Not started |
| 10 | Dark/light mode toggle | 3 | Partial |
| 11 | Time tracking | 3 | Not started |
| 12 | Offline mode | 3 | Not started |
