# AGENTS.md

Instructions for AI agents working on this codebase.

## Task Reference

Tasks are tracked in `ROADMAP.md` with numbered IDs (e.g., `2.1`, `3.3`). When asked to "implement 2.1", find the corresponding task there.

## Implementation Workflow

1. Read the task description in `ROADMAP.md`
2. Read relevant existing code before making changes
3. Implement the feature (backend first if new endpoint needed, then frontend)
4. Write BDD tests in `frontend/src/App.test.tsx`
5. Run tests: `cd frontend && npm test -- --run`
6. Update `ROADMAP.md`: check the box, add BDD test count
7. Wait for user to request commit + version bump

## Code Patterns

### Backend (FastAPI)

- All endpoints are async and live in `backend/app/routers/`
- Jira API calls go through `jira_client.py` → `jira_request(method, path, params=, json=)`
- Normalize Jira responses with `_format_issue()` / `_format_user()` before returning
- JQL is built dynamically from query params; always sanitize with double quotes
- Use Pydantic `BaseModel` for request bodies, `Query()` for query params

### Frontend (React + TypeScript)

- All UI lives in `frontend/src/App.tsx` (single-file for now)
- Data fetching: TanStack Query `useQuery` / `useMutation`
- Include all state variables in `queryKey` arrays for automatic refetch
- Styling: Tailwind CSS utility classes, dark theme (`bg-zinc-950`, `text-zinc-200`, etc.), **fully responsive** (mobile-first, must work on phone/tablet/desktop)
- State that affects multiple components gets lifted to `App()` and passed as props
- Reset pagination to page 0 when filters, sort, or project change
- Board view uses `@dnd-kit/core` for drag-and-drop; mobile fallback uses ← → arrow buttons (`sm:hidden`)
- Mobile-only UI patterns: use `sm:hidden` to show on mobile, `hidden sm:block` to show on desktop

### Testing (Vitest + Testing Library)

- BDD naming: `"Given [context], when [action], then [expected result]"`
- Mock `fetch` globally with `vi.fn()` — match on URL path, return appropriate fixture
- Use `within(screen.getByRole("rowgroup"))` to scope assertions to `<tbody>` (avoids collisions with dropdown options)
- Use `userEvent` (not `fireEvent`) for user interactions
- Use `findBy*` (async) for elements that appear after data loads
- When testing filters/sort, `await` for data to load before asserting on UI state

### API Contract

Backend returns normalized shapes — not raw Jira format:

```typescript
// Issue list: GET /api/issues?project=&status=&type=&assignee=&sort_by=&sort_order=&start_at=&max_results=
{ issues: Issue[], total: number }

// Issue detail: GET /api/issues/{key}
Issue & { transitions: { id: string, name: string }[] }

// Projects: GET /api/projects
{ key: string, name: string, id: string }[]

// Project members: GET /api/projects/{key}/members
{ accountId: string, displayName: string, avatarUrl: string, active: boolean }[]

// Priorities: GET /api/priorities
{ id: string, name: string, iconUrl: string }[]

// Labels: GET /api/labels
string[]
```

### Screenshots

- Screenshots use **mock data only** — never production/private Jira data
- `scripts/screenshots.mjs` intercepts API calls via Playwright `page.route()` and returns mock fixtures
- Mock data mirrors the test fixtures from `App.test.tsx` — keep them in sync
- Only the frontend dev server is needed (no backend required)
- Run: `cd frontend && npm run dev`, then `node scripts/screenshots.mjs`
- Output: `docs/screenshots/` (gitignored)

## Rules

- Never include `Co-Authored-By` in commit messages
- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- Do not split `App.tsx` into separate component files unless explicitly asked
- Do not add dependencies without implementing a feature that uses them
- Keep filter dropdown order matching table column order: Type → Status → Assignee
- Page size is 50 (Jira API default) — do not change without discussion
- Always run tests before marking a task complete
- Do not push to remote — let the user decide when to push
