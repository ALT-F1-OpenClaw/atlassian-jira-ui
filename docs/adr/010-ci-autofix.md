# ADR-010: CI Auto-Fix Workflow

**Status**: Accepted
**Date**: 2026-03-11
**Deciders**: Abdelkrim BOUJRAF

## Context

CI failures block development. Common failures (test runner conflicts, dependency issues, TypeScript errors) are repetitive and auto-fixable.

## Decision

Create `.github/workflows/ci-autofix.yml` that triggers `on: workflow_run` when CI fails:

1. Extract failed job logs via `gh run view --log-failed`
2. Categorize error into 7 types
3. Create GitHub issue with structured report (label: `ci-autofix`)
4. Deduplicate — comment on existing open issue instead of creating new
5. Optional Discord notification via `DISCORD_CI_WEBHOOK` secret

## Error Categories

| Category | Pattern |
|----------|---------|
| `test-runner-conflict` | Playwright specs in Vitest |
| `missing-module` | Cannot find module |
| `typescript-error` | TS error codes |
| `test-failure` | Assertion errors |
| `dependency-error` | npm/pip install errors |
| `lint-error` | ESLint/Prettier |
| `build-error` | Vite/Rollup failure |

## Consequences

**Good**: Automated failure triage, structured issue creation, Discord alerts.
**Bad**: Auto-fix PR generation (Phase 4b #45) not yet implemented — currently creates issues only.
