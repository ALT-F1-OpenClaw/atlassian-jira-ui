# ADR-007: BDD Test Naming Convention

**Status**: Accepted
**Date**: 2026-03-11
**Deciders**: Abdelkrim BOUJRAF

## Context

With 255+ unit tests, 25 backend tests, and 22 E2E tests, consistent naming is critical for readability and debugging.

## Decision

All tests follow BDD Given/When/Then naming:

```
"Given [context], when [action], then [expected result]"
```

Example:
```
"Given 3 issues with statuses 'In Progress', 'To Do', 'Done',
 then the status dropdown should list all three"
```

## Test Suites

| Suite | Count | Framework | Location |
|-------|-------|-----------|----------|
| Frontend unit | 255 | Vitest + Testing Library | `frontend/src/App.test.tsx` |
| Backend API | 25 | pytest + pytest-asyncio | `backend/tests/` |
| E2E integration | 22 | Playwright (Chromium) | `frontend/e2e/app.spec.ts` |

## Consequences

**Good**: Self-documenting tests, easy to understand failures, consistent across all 3 suites.
**Bad**: Verbose test names, long `describe` blocks.
