# Atlassian Jira UI — Application Screenshots

> Screenshots captured automatically using Playwright E2E tests with mock data.
> All views shown use mocked Jira API responses — no real data is displayed.

---

## 1. Issue List (Default View)

The main view shows all issues in a sortable, filterable table with status badges, priority indicators, and assignee avatars.

![Issue List](screenshots/01-issue-list.png)

---

## 2. Issue Detail Panel

Click any issue to open a slide-in detail panel showing the full description (rendered from Jira ADF via TipTap), status transitions, assignee, priority, labels, time tracking, and more.

![Issue Detail](screenshots/02-issue-detail.png)

---

## 3. Sidebar Navigation

The collapsible sidebar provides quick access to views (Dashboard, List, Board, Sprint Dashboard, About) and project switching with Jira project avatars.

![Sidebar](screenshots/03-sidebar.png)

---

## 4. Dashboard

The landing dashboard shows active sprints, recent issues, and project cards for quick navigation.

![Dashboard](screenshots/04-dashboard.png)

---

## 5. Command Palette (Empty)

Press `⌘K` / `Ctrl+K` or click the search button to open the command palette. Shows recent searches when empty.

![Command Palette Empty](screenshots/05-command-palette-empty.png)

---

## 6. Command Palette (Search Results)

Type to search across all issues with debounced fuzzy matching. Results show issue key, summary, status, and project.

![Command Palette Results](screenshots/06-command-palette-results.png)

---

## 7. Create Issue Modal

Press `C` or click "+ Create" to open the quick-create modal with project, summary, type, priority, assignee, and rich text description fields.

![Create Issue](screenshots/07-create-issue.png)

---

## 8. Light Mode

Full light mode with WCAG AA compliant contrast ratios. Toggle via the 🌙/☀️ button in the header.

![Light Mode](screenshots/08-light-mode.png)

---

## 9. Keyboard Shortcuts

Press `?` to view all available keyboard shortcuts. The app supports full keyboard navigation.

![Keyboard Shortcuts](screenshots/09-keyboard-shortcuts.png)

---

## 10. About Page

Shows app version, build info, features list with version history, and links to the GitHub repository.

![About Page](screenshots/10-about-page.png)

---

## 11. Mobile — Issue List

Fully responsive layout on mobile (375px). The sidebar collapses to a hamburger menu, columns adapt, and touch targets are optimized.

![Mobile List](screenshots/11-mobile-list.png)

---

## 12. Mobile — Issue Detail

The detail panel adapts to full-width on mobile with stacked layout for metadata fields.

![Mobile Detail](screenshots/12-mobile-detail.png)

---

## How These Screenshots Were Generated

These screenshots are captured automatically by a Playwright test script (`frontend/e2e/screenshots.spec.ts`) using mocked API data. To regenerate:

```bash
cd frontend
npm run build
npx playwright test e2e/screenshots.spec.ts
```

Screenshots are saved to `docs/screenshots/`.
