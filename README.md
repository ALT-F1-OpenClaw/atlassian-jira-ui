# atlassian-jira-ui

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-%3E%3D3.11-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC.svg)](https://tailwindcss.com/)
[![GitHub last commit](https://img.shields.io/github/last-commit/ALT-F1-OpenClaw/atlassian-jira-ui)](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commits/main)
[![GitHub issues](https://img.shields.io/github/issues/ALT-F1-OpenClaw/atlassian-jira-ui)](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues)
[![GitHub stars](https://img.shields.io/github/stars/ALT-F1-OpenClaw/atlassian-jira-ui)](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/stargazers)

A modern, fast, and opinionated alternative UI for Atlassian Jira Cloud. Because Jira's UI sucks.

By [Abdelkrim BOUJRAF](https://www.alt-f1.be) / ALT-F1 SRL, Brussels 🇧🇪 🇲🇦

## Why?

Jira is powerful. Jira's UI is not. It's slow, cluttered, and fights you at every step.

**This project fixes that** — a clean, modern frontend that talks to Jira's REST API v3 through a Python backend.

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│         React 19 + Tailwind CSS 4           │
│     Vite · TypeScript · Clean & Fast        │
├─────────────────────────────────────────────┤
│                  Backend                     │
│          Python · FastAPI · Async           │
│     Jira REST API v3 · Auth Proxy           │
├─────────────────────────────────────────────┤
│             Jira Cloud API v3               │
│          atlassian.net REST API             │
└─────────────────────────────────────────────┘
```

## Screenshots

### Kanban Board
![Kanban Board](docs/screenshots/01-kanban-board.png)

### Issue Detail View
![Issue Detail](docs/screenshots/02-issue-detail.png)

### List View
![List View](docs/screenshots/03-list-view.png)

### Create Issue Modal
![Create Modal](docs/screenshots/04-create-modal.png)

*UI designs generated with [Google Stitch](https://stitch.withgoogle.com/) — Gemini 3 Pro*

## What's Better

| Jira's UI | This UI |
|-----------|---------|
| 3-5s page loads | Instant (SPA + API caching) |
| Cluttered sidebars | Clean, focused views |
| Tiny text, wasted space | Readable, dense when needed |
| Confusing navigation | 3 views: Board, List, Detail |
| Search is broken | Fast fuzzy search + JQL |
| Can't see what matters | Priority-sorted, status-colored |

## Features

### Phase 1 — Core Views (Complete)
- [x] **List view** — Dense, sortable, filterable table with column sorting, filter dropdowns (type/status/assignee), pagination
- [x] **Issue detail panel** — Slide-in side panel with ADF rendering, inline editing (summary, description, assignee, priority, status, due date, labels), status transitions
- [x] **Board view / Kanban** — Columns by status category, issue cards, drag-and-drop transitions, swimlanes (assignee/priority)
- [x] **Command palette** — `Ctrl+K`/`Cmd+K` overlay, debounced fuzzy search, arrow key navigation, recent searches in localStorage

### Phase 2 — Productivity (Complete)
- [x] **Keyboard shortcuts** — `j`/`k` list navigation, `Enter` opens issue, `Escape` closes panels, `b`/`l` view switching, `?` help overlay, context-aware (disabled in inputs)
- [x] **Quick create** — `c` key or `+ Create` button, project/summary/type/priority/assignee/description fields, form validation, optimistic UI update
- [x] **Bulk actions** — Checkbox selection, select all/deselect all, floating action bar with bulk transition/assign/priority, batch API calls via `Promise.allSettled`
- [x] **Saved filters** — Save filter combinations as named views, quick-access dropdown, inline rename/delete, localStorage persistence

### Phase 3 — Power Features (In Progress)
- [x] **Sprint dashboard** — Active sprint overview, burndown chart, velocity chart, scope change tracking
- [x] **Time tracking** — Built-in timer per issue, log work modal, progress bar, worklog history
- [x] **Dark/Light mode** — Toggle in header (sun/moon), CSS variable theme switching, localStorage persistence, system preference detection
- [x] **Offline mode** — Service worker caching, IndexedDB mutation queue, auto-sync on reconnect, offline indicator

### Additional Features
- **Responsive design** — Mobile-first layout, stacked filters, adaptive pagination, works on phone/tablet/desktop
- **Rich text editor** — TipTap-based ADF editor with toolbar (bold, italic, headings, lists, links, code blocks)
- **Smart dropdowns** — Assignee from Jira project members, priority from Jira API, status transitions
- **Date picker** — Native date widget for due date (add/clear)
- **Editable labels** — Add/remove with autocomplete from Jira labels
- **Mobile Kanban arrows** — Arrow buttons on cards for status transitions (mobile only)
- **PWA** — Web app manifest, service worker, installable on mobile
- **214 BDD tests** — Comprehensive test coverage with Vitest + Testing Library

## Tech Stack

### Backend (Python)
- **FastAPI** — async, fast, auto-documented
- **httpx** — async HTTP client for Jira API
- **Pydantic** — request/response validation
- **python-jose** — JWT session handling
- **uvicorn** — ASGI server

### Frontend (React)
- **React 19** — latest, with server components ready
- **Vite 6** — instant HMR, fast builds
- **TypeScript 5.7** (strict) — type safety
- **Tailwind CSS 4** — utility-first, clean
- **TanStack Query** — data fetching + caching
- **TipTap** — rich text editor for ADF descriptions
- **dnd-kit** — drag & drop for board
- **cmdk** — command palette
- **Vitest** — fast unit testing
- **Testing Library** — BDD-style component tests (214 scenarios)

## Quick Start

```bash
# Clone
git clone https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui.git
cd atlassian-jira-ui

# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Jira credentials
uvicorn app.main:app --reload --port 35400

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173

## Setup

### Jira Credentials

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Create an API token
3. Configure `.env`:

```env
JIRA_HOST=https://yourcompany.atlassian.net
JIRA_EMAIL=you@company.com
JIRA_API_TOKEN=your-api-token
```

### App Secret Key

Generate a secure random key for `APP_SECRET_KEY`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
# or
openssl rand -base64 32
```

## Docker

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed

### Run with Docker Compose

```bash
# 1. Configure your environment
cp backend/.env.example backend/.env
# Edit backend/.env with your Jira credentials and APP_SECRET_KEY

# 2. Build and start both services
docker compose up --build

# Or run in detached mode
docker compose up --build -d
```

- **Frontend** — <http://localhost:5173>
- **Backend API** — <http://localhost:35400>

### Manage containers

```bash
# Stop services
docker compose down

# View logs
docker compose logs -f

# Rebuild after code changes
docker compose up --build
```

### Run services individually

```bash
# Backend only
docker build -t jira-ui-backend ./backend
docker run -p 35400:35400 --env-file ./backend/.env jira-ui-backend

# Frontend only
docker build -t jira-ui-frontend ./frontend
docker run -p 5173:80 jira-ui-frontend
```

## Project Structure

```
atlassian-jira-ui/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + CORS
│   │   ├── config.py            # Settings via Pydantic
│   │   ├── jira_client.py       # Async Jira API wrapper
│   │   ├── version.py           # Single version source
│   │   └── routers/
│   │       ├── issues.py        # Issue CRUD + transitions
│   │       ├── boards.py        # Board/sprint endpoints
│   │       ├── projects.py      # Projects + members
│   │       ├── search.py        # Search + JQL
│   │       ├── priorities.py    # Jira priorities
│   │       ├── labels.py        # Jira labels
│   │       └── sprints.py       # Sprint data + burndown
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Single-file UI (all views)
│   │   └── App.test.tsx         # 214 BDD test scenarios
│   ├── package.json
│   ├── vite.config.ts
│   ├── .env.example
│   └── Dockerfile
├── scripts/
│   ├── bump-version.mjs         # Version sync + changelog
│   └── screenshots.mjs          # Playwright screenshots
├── docker-compose.yml
├── LICENSE
└── README.md
```

## API Endpoints (Backend)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects |
| GET | `/api/projects/{key}` | Project details |
| GET | `/api/projects/{key}/members` | Project members (assignable users) |
| GET | `/api/issues` | List/filter issues |
| GET | `/api/issues/{key}` | Issue detail |
| POST | `/api/issues` | Create issue |
| PATCH | `/api/issues/{key}` | Update issue |
| POST | `/api/issues/{key}/transition` | Transition issue |
| GET | `/api/boards` | List boards |
| GET | `/api/boards/{id}` | Board with columns |
| GET | `/api/boards/{id}/sprint` | Active sprint |
| GET | `/api/priorities` | List Jira priorities |
| GET | `/api/labels` | List Jira labels |
| GET | `/api/sprints` | List boards with active sprints |
| GET | `/api/sprints/{id}/issues` | Sprint issues with status counts |
| GET | `/api/sprints/{id}/burndown` | Sprint burndown data |
| GET | `/api/sprints/{id}/velocity` | Velocity (points per sprint) |
| GET | `/api/search` | JQL search |
| GET | `/api/search/quick` | Fuzzy text search |

## Testing

```bash
cd frontend

# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch
```

214 BDD test scenarios using [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) with `describe`/`it` blocks following Given/When/Then naming.

### Test structure

```text
frontend/src/
├── App.test.tsx              # 208 BDD test scenarios
├── test/
│   └── setup.ts              # Testing Library + jest-dom setup
└── vitest.config.ts          # Vitest configuration
```

## Releasing a New Version

```bash
# Install dependencies (first time only)
npm install

# Bump version (updates all sources + generates CHANGELOG + commits + tags)
node scripts/bump-version.mjs patch   # 1.0.0 → 1.0.1
node scripts/bump-version.mjs minor   # 1.0.0 → 1.1.0
node scripts/bump-version.mjs major   # 1.0.0 → 2.0.0
node scripts/bump-version.mjs 2.5.0   # explicit version

# Push to remote
git push && git push --tags
```

The bump script updates the version in:

- `package.json` (root)
- `frontend/package.json`
- `backend/app/version.py`
- `CHANGELOG.md` (auto-generated from conventional commits)

## Security

- API token never sent to frontend — backend acts as proxy
- CORS restricted to frontend origin
- No credentials stored in browser
- Rate limiting with exponential backoff
- Session-based auth for multi-user deployment

## References

- [Jira REST API v3 Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
- [Jira Agile REST API](https://developer.atlassian.com/cloud/jira/software/rest/intro/)
- [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)

## License

MIT — see [LICENSE](./LICENSE)

## Author

Abdelkrim BOUJRAF — [ALT-F1 SRL](https://www.alt-f1.be), Brussels 🇧🇪 🇲🇦
- GitHub: [@abdelkrim](https://github.com/abdelkrim)
- X: [@altf1be](https://x.com/altf1be)

## Contributing

Contributions welcome! This is an opinionated project — if you also think Jira's UI sucks, you're in the right place.
