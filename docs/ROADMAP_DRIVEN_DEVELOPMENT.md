# Roadmap-Driven Development — Building While You Sleep

How to use a `ROADMAP.md` file as a task queue for an AI assistant that builds features while you're away.

## The Concept

Instead of writing code yourself, you write **requirements**. The AI reads them and builds.

```
You (11 PM):  "Add features #46 to #50 to the roadmap. Build them all. I'm going to sleep."
AI (11 PM → 6 AM): Builds, tests, commits, deploys each feature
You (6 AM):  Wake up → check Discord → review deployed features → give feedback
```

## How It Works in This Project

The `ROADMAP.md` file is the single source of truth for what needs to be built:

```markdown
### Phase 4 — Polish & Performance
| # | Feature | Status |
|---|---------|--------|
| 46 | SearchableSelect — autocomplete dropdowns | Complete |
| 47 | Create Project modal | Complete |
| 48 | Create submenu (Issue + Project) | Complete |
| 49 | Settings page | Complete |
| 50 | Searchable sprint selector | Planned |  ← AI picks this up
| 51 | "Open in Jira" button | Planned |  ← and this
| 52 | Upgrade tooling | Planned |  ← and this
```

The AI:
1. Reads `ROADMAP.md`
2. Picks the next **Planned** item
3. Reads `AGENTS.md` and `CLAUDE.md` for coding conventions
4. Implements the feature
5. Writes BDD tests
6. Runs tests (255 must pass)
7. Commits with conventional message (`feat:`, `fix:`)
8. Bumps version (`bump-version.mjs`)
9. Pushes + tags
10. Updates `ROADMAP.md` → marks as **Complete**
11. Moves to the next item

## Real Example: March 11, 2026

At midnight, the roadmap had 15 features planned. By 9 AM:

| Time | What Happened |
|------|---------------|
| 00:00 | Start: v1.15.0, ~30 tests |
| 00:30 | v1.16.0 — Tailscale + Vite config |
| 01:00 | v1.17.0 — Responsive design (33 tests) |
| 01:30 | v1.18.0 — Issue detail panel (51 tests) |
| 02:00 | v1.20.0 — Rich text editor (59 tests) |
| 02:30 | v1.21.0 — PWA support |
| 03:00 | User goes to sleep 💤 |
| 03:30 | v1.22.0 — Assignee/priority dropdowns (65 tests) |
| 04:00 | v1.23.0 — Date picker (70 tests) |
| 04:30 | v1.24.0 — Editable labels (79 tests) |
| 05:00 | v1.25.0 — Kanban board (97 tests) |
| 05:30 | v1.26.0 — Mobile Kanban (102 tests) |
| 06:00 | v1.27.0 — Command palette (119 tests) |
| 06:30 | v1.28.0 — Keyboard shortcuts (134 tests) |
| 07:00 | v1.29.0 — Quick create modal (149 tests) |
| 07:30 | v1.30.0 — Bulk actions (163 tests) |
| 08:00 | v1.31.0 — Saved filters (174 tests) |
| 08:30 | v1.32.0 — Sprint dashboard (186 tests) |
| 09:00 | v1.33.0 — Time tracking (200 tests) |

**18 features built while sleeping.** 200 tests. All passing.

## The ROADMAP.md Format

### Requirements Specification

Each roadmap item includes:
- **Number**: sequential ID for reference
- **Feature name**: concise, descriptive
- **Status**: Planned → In Progress → Complete
- **Sub-tasks**: numbered (e.g., 9.1, 9.2, 9.3)
- **Tech notes**: implementation hints, API endpoints, libraries

```markdown
### 9. Sprint dashboard

- [ ] **9.1** Active sprint overview with issue counts by status
- [ ] **9.2** Burndown chart (remaining work over time)
- [ ] **9.3** Velocity chart (story points per sprint)
- [ ] **9.4** Sprint scope change tracking

**Tech**: Backend `GET /api/sprints`, `GET /api/sprints/{id}/issues`.
`recharts` for charts. `s` keyboard shortcut.
```

### Status Flow

```
Planned → In Progress → Complete
                     → Blocked (with reason)
```

### Grouping by Phase

```
Phase 1 — Core Views (complete)
Phase 2 — Productivity (complete)
Phase 3 — Power Features (complete)
Phase 4 — Polish & Performance (mostly complete)
Phase 4b — CI Intelligence (partial)
Phase 5 — Multi-User Auth (partial)
```

## Supporting Files

The roadmap works in conjunction with:

| File | Purpose |
|------|---------|
| `ROADMAP.md` | What to build (requirements) |
| `AGENTS.md` | How to build (coding conventions, API contracts, test patterns) |
| `CLAUDE.md` | Project context (tech stack, commands, current state) |
| `CHANGELOG.md` | What was built (auto-generated from commits) |

The AI reads all four files before starting any work.

## Best Practices

### 1. Be Specific in Requirements

❌ "Add search functionality"
✅ "**4.1** `Ctrl+K` opens command palette overlay — *uses cmdk library, debounced input, keyboard navigation*"

### 2. Include Tech Hints

The AI makes better decisions when you specify libraries, API endpoints, and patterns:

```markdown
**Tech**: `@dnd-kit/core` for drag-and-drop. PointerSensor (5px) + TouchSensor (250ms delay).
Backend `POST /api/issues/{key}/transition`.
```

### 3. Number Everything

Sequential numbering lets you reference items in conversation:

> "Build #50" → AI knows exactly which feature
> "What's the status of #42?" → AI checks ROADMAP.md

### 4. Group by Dependency

Put dependent features after their prerequisites:

```
| 30 | OAuth 2.0 (3LO) | Planned |          ← must be first
| 31 | Per-user sessions | Planned |         ← depends on #30
| 32 | Login/logout UI | Planned |           ← depends on #30
```

### 5. Add Acceptance Criteria

When possible, specify what "done" looks like:

```markdown
- [x] **6.3** Form validation (project + summary required) — *BDD tests: 3 scenarios*
```

### 6. Keep It Updated

After each feature, the AI updates the roadmap. But also review it yourself:
- Remove obsolete items
- Add new ideas as they come up
- Re-prioritize based on user feedback

## Overnight Workflow

```
Evening:
1. Review current roadmap
2. Add/prioritize items you want built
3. Say "build #50 through #55" or "build the next 5 items"
4. Go to sleep

Morning:
1. Check Discord for commit messages
2. Open the app — features are deployed (Watchtower auto-updates)
3. Test on your phone
4. Send screenshots of issues → AI fixes immediately
5. Repeat
```

## Current Roadmap Stats

| Metric | Value |
|--------|-------|
| Total items | 62 |
| Complete | 48 |
| Planned | 14 |
| Phases | 6 (1-4, 4b, 5) |
| Features per session | 10-18 |
| Avg time per feature | 15-30 min |

## Related

- [ROADMAP.md](../ROADMAP.md) — the actual roadmap
- [AGENTS.md](../AGENTS.md) — coding conventions
- [CLAUDE.md](../CLAUDE.md) — project context
- [Meeting Minutes](meeting-minutes/) — daily session logs
- [Discord Development](DISCORD_DEVELOPMENT.md) — the workflow
