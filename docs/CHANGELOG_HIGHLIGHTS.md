# Changelog Highlights — Taskara

Major milestones and release highlights. For full changelog, see [CHANGELOG.md](../CHANGELOG.md).

---

## v1.62.x — Security & Public SaaS (March 2026)

### v1.62.4
- **fix**: Sprint issues fallback to JQL when Agile API returns empty (#91)

### v1.62.3
- **fix**: Terms/Privacy links work on login page
- **fix**: Escape key closes all 7 modal windows

### v1.62.2
- **fix**: Async session bug (`await get_session()` missing in auth endpoints)

### v1.62.1
- **fix**: Baked nginx.conf into Docker image with `/auth/` routing + `BACKEND_HOST` envsubst

### v1.62.0
- **feat**: GDPR Privacy Policy page (#38a) — 10 sections, Belgian DPA
- **feat**: Cookie consent banner (#39) — opt-in, Accept/Necessary only
- **feat**: Redis session store (#59) — abstract SessionStore with fallback (ADR-022)

### v1.61.0
- **feat**: Per-user Jira site selection (#33) — site picker after OAuth login (ADR-019)
- **feat**: Rate limiting (#35) — tiered per-IP: API/auth/search/mutations (ADR-020)
- **feat**: Multi-tenant isolation (#36) — token encryption, session fingerprinting (ADR-021)
- **feat**: Terms of Service page (#37) — 11 sections, Belgian law
- **feat**: Sprint state filter dropdown (#63) — Active/Future/Closed/All
- **feat**: Environment ribbon on login page (#64) — STG/DEV indicator
- **feat**: GitHub issue templates (#75) — bug report, feature request, question

## v1.60.0 — Sprint Platform API Fallback (March 2026)

- **feat**: Refactored sprints/boards to Platform API for OAuth compatibility (#55)
- **feat**: Production mode — API Token auth disabled in production (#54)
- **feat**: "Open in Jira" ↗ button on all views (#51)
- **feat**: Searchable sprint selector (#50)
- **feat**: Settings page — Jira connection, test connection (#49)
- **feat**: Create submenu + Create Project modal (#47, #48)
- **feat**: SearchableSelect — 7 dropdowns replaced (#46)

## v1.54.0 — OAuth 2.0 (March 2026)

- **feat**: Atlassian OAuth 2.0 (3LO) — "Login with Atlassian" (#30)
- **feat**: Per-user session management — auto token refresh (#31)
- **feat**: Login/logout UI — user avatar dropdown (#32)
- **feat**: HTTPS via Traefik + Tailscale TLS (#34)

## v1.49.0 — Production Deployment (March 2026)

- **feat**: Docker + Traefik production deployment on Raspberry Pi (#41)
- **feat**: ALT-F1 branding footer (#40)
- **feat**: CI auto-fix workflow — create issue + Discord notification (#43, #44)

## v1.39.0 — CI/CD (March 2026)

- **feat**: 6 GitHub Actions workflows — CI, release, Docker, GHCR publish, CodeQL, auto-fix (#15)

## v1.38.0 — About Page (March 2026)

- **feat**: About / Features page with 21 feature cards + version badges (#14)

## v1.37.0 — UI Navigation (March 2026)

- **feat**: Sidebar navigation, breadcrumbs, dashboard landing page, empty states (#13)

## v1.36.0 — Sprint CRUD (March 2026)

- **feat**: Create/edit/delete sprints, start/complete, manage scope (#9b)

## v1.35.0 — Offline Mode (March 2026)

- **feat**: Service worker, IndexedDB mutation queue, auto-sync, offline indicator (#12)

## v1.34.0 — Dark/Light Mode (March 2026)

- **feat**: CSS variable theme switching, system preference, WCAG AA contrast (#11)

## v1.33.0 — Time Tracking (March 2026)

- **feat**: Built-in timer, log work modal, progress bar, worklog history (#10)

## v1.32.0 — Sprint Dashboard (March 2026)

- **feat**: Burndown chart, velocity chart, scope tracking, pie chart (#9)

## v1.31.0 — Saved Filters (March 2026)

- **feat**: Save/apply/rename/delete filter combinations, localStorage (#8)

## v1.30.0 — Bulk Actions (March 2026)

- **feat**: Checkbox selection, bulk transition/assign/priority (#7)

## v1.29.0 — Quick Create (March 2026)

- **feat**: Create issue modal with form validation, optimistic UI (#6)

## v1.28.0 — Keyboard Shortcuts (March 2026)

- **feat**: j/k navigation, Enter to open, Escape to close, view switching (#5)

## v1.27.0 — Command Palette (March 2026)

- **feat**: Ctrl+K search, fuzzy matching, recent searches (#4)

## v1.25.0 — Kanban Board (March 2026)

- **feat**: Columns by status, drag-and-drop transitions, swimlanes (#3)

## v1.18.0 — Issue Detail (March 2026)

- **feat**: Side panel, ADF rendering, inline editing, status transitions (#2)

## v1.15.0 — First Release (March 2026)

- **feat**: List view with sorting, filtering, pagination (#1)
- **feat**: FastAPI backend proxy to Jira Cloud REST API v3
