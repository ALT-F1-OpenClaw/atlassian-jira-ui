# OpenClaw Autonomous Development — Readiness Checklist

## Goal

Let OpenClaw orchestrate development autonomously on GitHub:
1. Pick the next unchecked task from `ROADMAP.md`
2. Implement the feature (backend + frontend)
3. Write BDD tests, run them
4. Commit with conventional commits, bump minor version
5. Generate screenshots with mock data
6. Push to `main`
7. Notify `#announcements` on Discord (channel `1480304425493856429`)

## What's Ready

| # | Item | Status |
|---|------|--------|
| 1 | `CLAUDE.md` — project guide for AI agents | Done |
| 2 | `AGENTS.md` — implementation workflow, code patterns, rules | Done |
| 3 | `ROADMAP.md` — numbered task IDs for sequential execution | Done |
| 4 | Test suite — 32 BDD tests, `cd frontend && npm test -- --run` | Done |
| 5 | Screenshot script — mock data via Playwright route interception | Done |
| 6 | Version bumping — `node scripts/bump-version.mjs minor` | Done |
| 7 | Conventional commits — `feat:`, `fix:`, `chore:`, `docs:` | Done |
| 8 | `.gitignore` — comprehensive via gitignore.io | Done |

## What's Missing

### 1. GitHub Actions CI (`.github/workflows/ci.yml`)

Run tests on every push and PR.

```yaml
# Needs: .github/workflows/ci.yml
# Triggers: push to main, pull_request
# Steps: checkout, setup node, npm ci (frontend), npm test -- --run
```

### 2. GitHub Actions Release (`.github/workflows/release.yml`)

On version tag push: run tests, generate screenshots, notify Discord.

```yaml
# Needs: .github/workflows/release.yml
# Triggers: push tags v*
# Steps: checkout, setup node, install deps, run tests,
#         start frontend dev server, run screenshots.mjs,
#         upload screenshots as artifacts,
#         send Discord webhook notification
```

### 3. Discord Webhook

- Create a webhook in Discord server for `#announcements` (channel `1480304425493856429`)
- Add webhook URL as GitHub repo secret: `DISCORD_WEBHOOK_URL`
- Release workflow posts a message with version, changelog summary, and screenshot artifacts

### 4. Update AGENTS.md for Autonomous Mode

Current rule says: *"Do not push to remote — let the user decide when to push"*

For autonomous mode, change to:
- Commit after each completed task
- Run `node scripts/bump-version.mjs minor` after each feature commit
- Push to `main` after version bump
- Generate screenshots after UI changes

### 5. Git Push Access

- Remote: `git@github.com:ALT-F1-OpenClaw/atlassian-jira-ui.git`
- SSH key must be configured and working for the agent runner
- Test: `ssh -T git@github.com`

## Autonomous Workflow (Target)

```
┌─────────────────────────────────────────────────────┐
│  OpenClaw picks next unchecked task from ROADMAP.md │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  Read AGENTS.md → implement feature                 │
│  Backend first (if needed) → Frontend → Tests       │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  cd frontend && npm test -- --run                   │
│  All tests must pass (currently 32 scenarios)       │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  Update ROADMAP.md — check box, add test count      │
│  git add → git commit (conventional commit)         │
│  node scripts/bump-version.mjs minor                │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  Start frontend dev server                          │
│  node scripts/screenshots.mjs (mock data only)      │
│  Stop frontend dev server                           │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  git push && git push --tags                        │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  GitHub Actions triggers on tag push:               │
│  → Runs tests (CI validation)                       │
│  → Sends Discord notification to #announcements     │
│    with version number and changelog excerpt        │
└─────────────────────────────────────────────────────┘
```

## Next Steps

1. Create `.github/workflows/ci.yml`
2. Create `.github/workflows/release.yml`
3. Set up Discord webhook and add `DISCORD_WEBHOOK_URL` secret to GitHub repo
4. Update `AGENTS.md` rules for autonomous mode
5. Verify `git push` works (`ssh -T git@github.com`)
6. Do a test run: implement task 2.1, commit, push, verify Discord notification
