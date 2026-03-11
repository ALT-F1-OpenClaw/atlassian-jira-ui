# Atlassian Jira UI — Application Screenshots

> Screenshots captured automatically using Playwright E2E tests with mock data.
> All views shown use mocked Jira API responses — no real data is displayed.

---

## Desktop Views

### 1. Issue List (Default View)

The main view shows all issues in a sortable, filterable table with status badges, priority indicators, and assignee avatars. Filter dropdowns for Type, Status, and Assignee sit above the table.

![Issue List](screenshots/01-issue-list.png)

---

### 2. Issue Detail Panel

Click any issue to open a slide-in detail panel showing the full description (rendered from Jira ADF via TipTap), status transitions, assignee, priority, labels, time tracking, and more.

![Issue Detail](screenshots/02-issue-detail.png)

---

### 3. Sidebar Navigation

The collapsible sidebar provides quick access to views (Dashboard, List, Board, Sprint Dashboard, About) and project switching with Jira project avatars.

![Sidebar](screenshots/03-sidebar.png)

---

### 4. Dashboard

The landing dashboard shows active sprints, recent issues, quick actions, and project cards for navigation.

![Dashboard](screenshots/04-dashboard.png)

---

### 5. Kanban Board

Drag-and-drop board view with columns per status (To Do, In Progress, Done). Supports swimlanes by assignee or priority, and touch gestures on mobile.

![Kanban Board](screenshots/05-kanban-board.png)

---

### 6. Sprint Dashboard

Full sprint management with burndown chart, velocity chart, sprint progress overview, issue list, and sprint CRUD (create, start, complete, edit, delete).

![Sprint Dashboard](screenshots/06-sprint-dashboard.png)

---

### 7. Command Palette (Empty)

Press `⌘K` / `Ctrl+K` or click the search button to open the command palette. Shows recent searches when empty.

![Command Palette Empty](screenshots/07-command-palette-empty.png)

---

### 8. Command Palette (Search Results)

Type to search across all issues with debounced fuzzy matching. Results show issue key, summary, status, and project.

![Command Palette Results](screenshots/08-command-palette-results.png)

---

### 9. Create Issue Modal

Press `C` or click "+ Create" to open the quick-create modal with project, summary, type, priority, assignee, and rich text description fields.

![Create Issue](screenshots/09-create-issue.png)

---

### 10. Keyboard Shortcuts

Press `?` to view all available keyboard shortcuts. The app supports full keyboard navigation including vim-style j/k movement.

![Keyboard Shortcuts](screenshots/10-keyboard-shortcuts.png)

---

### 11. Light Mode — Issue List

Full light mode with WCAG AA compliant contrast ratios. Toggle via the 🌙/☀️ button in the header. CSS custom properties flip the entire zinc palette.

![Light Mode List](screenshots/11-light-mode-list.png)

---

### 12. Light Mode — Kanban Board

The board view in light mode with the same column layout and drag-and-drop functionality.

![Light Mode Board](screenshots/12-light-mode-board.png)

---

### 13. About Page

Shows app version, build info, full feature list with version history, and links to the GitHub repository.

![About Page](screenshots/13-about-page.png)

---

## Mobile Views (375px)

### 14. Mobile — Issue List

Fully responsive layout on mobile. The sidebar collapses to a hamburger menu, columns adapt, and touch targets are optimized.

![Mobile List](screenshots/14-mobile-list.png)

---

### 15. Mobile — Issue Detail

The detail panel adapts to full-width on mobile with stacked layout for metadata fields.

![Mobile Detail](screenshots/15-mobile-detail.png)

---

### 16. Mobile — Sidebar

The sidebar slides in as an overlay on mobile with backdrop, showing all navigation options.

![Mobile Sidebar](screenshots/16-mobile-sidebar.png)

---

### 17. Mobile — Kanban Board

Board view on mobile with horizontal scroll and arrow navigation between status columns.

![Mobile Board](screenshots/17-mobile-board.png)

---

## How These Screenshots Were Generated

These screenshots are captured automatically by a Playwright test script (`frontend/e2e/screenshots.spec.ts`) using mocked API data. To regenerate:

```bash
cd frontend
npm run build
npx playwright test e2e/screenshots.spec.ts
```

Screenshots are saved to `docs/screenshots/` (17 images, ~1.2MB total).
