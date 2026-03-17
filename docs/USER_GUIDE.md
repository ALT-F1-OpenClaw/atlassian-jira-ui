# User Guide

A modern, fast alternative UI for Atlassian Jira Cloud.

## Getting Started

### Access

| Environment | URL |
|---|---|
| Production | `https://atlf1be-raspberry-pi-4.tail981e59.ts.net:4443` |
| Development | `https://atlf1be-raspberry-pi-4.tail981e59.ts.net:9443` |

### Authentication

The app supports two authentication methods:

#### API Token (Current)

Your personal Jira API token is stored on the server. All API calls use your identity.

1. Go to **Settings** (⚙ in the sidebar)
2. Enter your **Jira Host** (e.g., `https://yourcompany.atlassian.net`)
3. Enter your **Email** (your Atlassian account email)
4. Enter your **API Token** — generate one at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
5. Click **🔌 Test Connection** to verify
6. Click **💾 Save Changes**

#### OAuth 2.0 — Login with Atlassian (New)

Each user logs in with their own Atlassian account. No shared credentials.

1. Click the **Login** button in the top-right header
2. You'll be redirected to Atlassian's consent screen
3. Authorize the app to access your Jira data
4. You'll be redirected back — your avatar and name appear in the header
5. Click **↪** to logout

---

## Views

### Dashboard (⌂ Home)

The landing page shows:
- **Quick actions** — Create issue, Open search
- **Active sprints** — Current sprint status across projects
- **Recent issues** — Last 5 updated issues
- **Project cards** — All your Jira projects with avatars

### List View (☰)

A dense, sortable table of issues. Columns: Key, Type, Summary, Status, Priority, Assignee, Updated.

**Features:**
- Click any column header to sort (ascending/descending)
- Use the **filter dropdowns** to narrow by Type, Status, or Assignee — type to search!
- Select a **project** from the project dropdown (also searchable)
- Click any row to open the issue detail panel
- Click **↗** next to an issue key to open it directly in Jira
- **Pagination** at the bottom (50 issues per page)

### Board View (▦ Kanban)

Issues displayed as cards in status columns (To Do → In Progress → Done).

**Features:**
- **Drag and drop** cards between columns to change status
- **Swimlanes** — group by Assignee or Priority (dropdown in header)
- **Mobile**: use **← →** arrow buttons on cards (drag isn't practical on small screens)
- Click a card to open issue detail
- **↗** on each card opens it in Jira

### Sprint Dashboard (⏱)

Active sprint overview with charts and metrics.

**Features:**
- **Sprint selector** — type to search and filter sprints by name
- **Status pie chart** — To Do / In Progress / Done breakdown
- **Burndown chart** — remaining work vs ideal line
- **Velocity chart** — committed vs completed across sprints
- **Sprint actions**: Start, Complete, Edit, Delete, Manage Scope
- **Manage Scope** — add/remove issues from the sprint (click issue keys to view details)

### About (ⓘ)

App info, version, feature list, and tech stack.

### Settings (⚙)

Configure Jira connection, OAuth credentials, and view app preferences.

---

## Key Features

### Create Issue / Project

Click **+ Create** in the header to see a dropdown:
- **📋 Issue** — Create a new Jira issue (project, summary, type, priority, assignee, description)
- **📁 Project** — Create a new Jira project (name, auto-generated key, type, lead, description)

**Keyboard shortcut**: Press `c` to quickly open the Create Issue modal.

### Searchable Dropdowns

All dropdowns support **type-to-filter**:
- Start typing to narrow options
- Arrow keys ↑↓ to navigate
- Enter to select
- Escape to close

### Rich Text Editor

Issue descriptions use a full rich text editor (TipTap):
- **Bold** (Ctrl+B), **Italic** (Ctrl+I), ~~Strikethrough~~
- Headings (H1, H2, H3)
- Bullet lists, Numbered lists
- Links, Code blocks
- Click **Edit** on any issue description to modify

### Quick Search / Command Palette

Press `Ctrl+K` (or `Cmd+K` on Mac) to open the command palette:
- Type to search across all issues
- Arrow keys to navigate results
- Enter to open an issue
- Recent searches are saved

### Keyboard Shortcuts

Press `?` to see all shortcuts:

| Key | Action |
|-----|--------|
| `j` / `k` | Navigate up/down in list |
| `Enter` | Open selected issue |
| `Escape` | Close panel/modal |
| `b` | Switch to Board view |
| `l` | Switch to List view |
| `s` | Switch to Sprint view |
| `d` | Switch to Dashboard |
| `c` | Create new issue |
| `Ctrl+K` | Open command palette |
| `?` | Show shortcut help |

### Bulk Actions

In List view:
1. Check the boxes next to issues (or use the header checkbox for "select all")
2. A floating action bar appears at the bottom
3. Choose: **Transition** (change status), **Assign** (change assignee), or **Priority** (change priority)
4. Action applies to all selected issues at once

### Saved Filters

1. Apply filters (type, status, assignee, project)
2. Click **Save Filter** (appears when filters are active)
3. Name your filter
4. Access saved filters from the dropdown — click to apply instantly
5. Rename or delete filters inline

### Time Tracking

In the issue detail panel:
- **Timer** next to the issue key — click ▶ Start to begin tracking
- **Pause** / **Stop** the timer
- **Log Work** button to manually log time
- **Time tracking bar** shows logged vs estimated progress
- **Worklog history** at the bottom

### Dark / Light Mode

Click ☀️ / 🌙 in the header to toggle. Your preference is saved.

### Offline Mode

The app works offline:
- Previously loaded data is cached in your browser
- New issues/edits are queued and synced when you reconnect
- An offline banner appears when disconnected

### Open in Jira

Every issue has a **↗** link that opens the corresponding page directly in Jira. Available in:
- List view (next to issue key)
- Board cards
- Issue detail panel header

---

## Sidebar Navigation

Click the **☰** button (top-left) to open the sidebar:
- **Projects** — click to filter by project
- **Saved Filters** — quick access to saved filter combinations
- **Views** — Dashboard, List, Board, Sprint, About, Settings

---

## Tips

- **Project filter persists** — selecting a project in the header filters all views
- **Clear filters** button appears when any filter is active
- **Right-click ↗** to open Jira in a new tab while staying in the app
- **PWA install** — on mobile, use "Add to Home Screen" for an app-like experience
- The app is **fully responsive** — works on phone, tablet, and desktop

---

## Troubleshooting

### "Failed to load" errors
- Check your internet connection
- Verify Jira credentials in Settings → Test Connection
- If using API Token: make sure it hasn't expired

### Login redirects back with error
- Ensure the callback URL in your Atlassian Developer Console matches: `https://your-host:port/auth/callback`
- Check that required scopes are enabled: `read:jira-work`, `write:jira-work`, `read:jira-user`

### Issue not updating
- The app caches data for performance. Click the browser refresh button to force a fresh load
- Static data (projects, priorities) is cached for 30 min
- Issue lists refresh every 2 min
- Single issue details refresh every 1 min

---

Built by [ALT-F1](https://www.alt-f1.be) · Brussels 🇧🇪 🇲🇦
