# Developing via Discord with OpenClaw

This project was built almost entirely through Discord conversations with an AI assistant (OpenClaw). This document captures the experience, limitations, and workarounds.

## How It Works

The entire development workflow happens in a Discord thread:

```
Developer (Discord) → OpenClaw AI → reads/writes files → git commit → push → CI → deploy
```

The AI has direct access to the Raspberry Pi filesystem, can run commands, edit code, run tests, and deploy. The developer provides direction, reviews screenshots, and tests the live app.

## Discord Limitations for Development

### 1. No Markdown Tables

Discord does not render Markdown tables. They appear as plain text:

```
| Column | Value |
|--------|-------|
| This   | breaks|
```

**Workaround**: Use bullet lists or code blocks instead. The AI follows this rule in outbound Discord messages (see `AGENTS.md`).

### 2. Code Blocks Split Into Chunks

Discord has a **2000 character message limit**. Long code blocks get split across multiple messages, making them:
- Hard to copy-paste as a single unit
- Prone to losing context between chunks
- Missing leading/trailing whitespace

**Impact on Python**: Python is whitespace-sensitive. A code block split across two Discord messages may:
- Lose indentation alignment
- Break `if`/`else`/`for` blocks that span the split point
- Introduce phantom spaces when copy-pasting

**Workaround**:
- The AI writes code directly to files (never asks the user to copy-paste)
- File edits use the `Edit` tool with exact text matching
- Code review happens via screenshots or `git diff`, not Discord messages

### 3. No File Attachments for Code Review

Discord can attach images but not syntax-highlighted code files.

**Workaround**:
- Screenshots of the app for UI review
- `git diff` output for code review
- GitHub PR links for detailed changes

### 4. Message History Limits

Long development sessions (12+ hours) exceed Discord's thread context. The AI uses:
- **Memory files** (`memory/YYYY-MM-DD.md`) to persist session state
- **Context compaction** to summarize older messages
- **AGENTS.md / CLAUDE.md** as persistent project knowledge

### 5. No Real-Time Collaboration

Only one person talks to the AI at a time. No concurrent editing, no pair programming.

**Workaround**: Use branches for parallel work streams (not implemented yet — solo developer).

## What Works Well

### Rapid Iteration

```
"fix the button" → AI edits → commits → pushes → deployed in 5 min
```

Dozens of features shipped per session. v1.15 → v1.59 in ~4 days.

### Screenshot-Driven Development

The developer sends screenshots of issues, the AI fixes them immediately. Faster than writing bug reports.

### Always-Available Context

The AI remembers:
- All file paths and code structure
- Jira API quirks discovered during development
- Previous bugs and their fixes
- User preferences ("don't split App.tsx", "conventional commits")

### Automated Workflow

Every change follows the same pipeline:
1. Edit code
2. TypeScript check (`tsc --noEmit`)
3. Run tests (`npm test` — 255 unit tests)
4. Commit with conventional message
5. Version bump (`bump-version.mjs`)
6. Push + tag
7. GHCR builds Docker image
8. Watchtower auto-deploys to dev

## Discord Server Structure

The project uses a dedicated Discord server (`raspberry-pi4-openclaw`) with:

### Channels
- `#bot-setup-openclaw` — main development thread
- `#bot-openclaw` — general bot interaction
- `#bot-x-twitter` — Twitter/X integration
- `#bot-shopping-travel` — shopping/travel bot
- `#bot-github` — GitHub webhook notifications
- `#bot-jira` — Jira notifications
- `#bot-hubspot` — HubSpot integration
- `#announcements` — release announcements

### Threads
- `atlassian-jira-ui on github.com/ALT-F1-OpenClaw` — main project thread (500+ messages)
- `Raspberry Pi 4 setup` — infrastructure setup
- `teams setup` — team configuration

## Lessons Learned

1. **Never ask the user to copy-paste code** — write directly to files
2. **Always run tests before committing** — catches regressions immediately
3. **Tag every commit** — Watchtower needs Docker images from GHCR
4. **Screenshots are faster than descriptions** — "fix this" + screenshot > 5 paragraphs
5. **Memory files are essential** — without them, every new session starts from zero
6. **Keep App.tsx as a single file** — AI context works better with one large file than many small ones
7. **Conventional commits enable auto-changelog** — `feat:`, `fix:`, `docs:` → CHANGELOG.md
8. **Document decisions in ADRs immediately** — 18 ADRs prevent re-debating old decisions

## Stats

| Metric | Value |
|--------|-------|
| Versions shipped | v1.15.0 → v1.59.19 |
| Total commits | ~200+ |
| Unit tests | 255 |
| Backend tests | 25 |
| E2E tests | 22 |
| ADRs | 18 |
| Meeting minutes | 4 sessions |
| Days of development | ~5 |
| Discord messages | 500+ |
| Features built | 62 roadmap items |
