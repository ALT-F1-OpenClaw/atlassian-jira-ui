# Project Management with Discord + OpenClaw

How to use Discord as a project management hub by connecting it to OpenProject (or Jira) via OpenClaw AI.

## Overview

Instead of switching between project management tools, code editors, and communication platforms, everything happens in Discord:

```
┌─────────────────────────────────────────────────────────┐
│                    Discord Server                        │
│                                                          │
│  #bot-openproject        #news-openproject               │
│  ├── "list tasks"        ├── Daily status report (6am)   │
│  ├── "create meeting"    ├── Status change alerts         │
│  ├── "update status"     └── Sprint summary               │
│  └── AI assistant                                         │
│                                                          │
│  #bot-jira               #news-github                     │
│  ├── "show sprints"      ├── PR notifications             │
│  ├── "create issue"      ├── CI/CD status                 │
│  └── Jira UI app         └── Release alerts               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Real-World Example: DocExtractor Project

This setup was used on the DocExtractor project with OpenProject:

### 1. Daily Status Reports (Automated)

A cron job runs every morning at 6:00 AM Brussels time and posts to `#news-openproject`:

```
📊 DocExtractor — Daily Status Report
2026-03-19 06:00 — Work packages updated in last 24h

------
Date: 2026-03-19
Project: DocExtractor
Total Updated: 12
Status Breakdown:
  Developed: 7
  In Progress: 1
  In Testing: 0
  On Hold: 2
  New: 1
  Closed: 1
------

• #666 — GitLab CI/CD Runner
  Nassim Ben Mustapha | Normal | Sprint 2026-03-16
  In progress → ✅ Developed

• #639 — System Config UI
  Oumaima Gharbi | High | Sprint 2026-03-16
  In testing → ✅ Developed
```

**Setup:**
```
/cron add → daily at 6am → query OpenProject API → format report → post to #news-openproject
```

The report includes:
- Status, title, responsible, priority, version/sprint
- Status transitions (before → **after** in bold)
- Summary counts by status
- High priority alerts
- Downloadable `.md` file attached

### 2. On-Demand Queries (Conversational)

Ask the AI in `#bot-openproject`:

> "What tasks changed status today in DocExtractor?"
> "Show me all high priority items in Sprint 2026-03-16"
> "List all tasks assigned to Nassim"
> "What's blocked in DocExtractor?"

The AI queries OpenProject's REST API and responds with formatted results.

### 3. Task Management via Chat

> "Create a new task: Fix logo typo, assign to Oumaima, priority High"
> "Move #666 to In Testing"
> "Update #513 status to On Hold with comment 'waiting for infra'"

### 4. Meeting Management

> "Create a new meeting in DocExtractor project"

*(Note: OpenProject's API doesn't support meeting creation — the AI provides a direct link to the web UI instead.)*

## Channel Structure for Project Management

```
📋 MANAGEMENT
├── #bot-openproject         — AI assistant for OpenProject (bound)
├── #bot-jira                — AI assistant for Jira (bound)

📰 NOTIFICATIONS
├── #news-openproject        — daily reports, status changes
├── #news-jira               — Jira issue updates
├── #news-github             — CI/CD, PRs, releases

💬 DISCUSSION
├── #dev-discussion          — technical decisions
├── #standup                 — async daily standup posts
```

## Setting Up Automated Reports

### Step 1: Configure the API Connection

In the OpenClaw config or via Discord:

> "Connect to OpenProject at projects.xflowdata.com with API key xyz"

### Step 2: Create the Cron Job

```
Start a crontab — every morning 6am send me the tasks that have
changed status in DocExtractor project. Give me the status, deadline,
responsible, title, link. Send the result to #news-openproject.
Show me an example first.
```

The AI creates a cron job that:
1. Queries the OpenProject API for work packages updated in the last 24h
2. Formats the results with status emoji, transitions, and links
3. Generates a `.md` file with YAML frontmatter
4. Posts the message + attached file to the notification channel

### Step 3: Iterate on the Format

After seeing the first report:

> "Put back bullet points instead of those diamonds"
> "Add the version/sprint as a category"
> "Indicate the status before and after, put the latest in bold"
> "Remove the underscores in the frontmatter"

The AI updates the report format and you can test immediately:

```
/cron run 00d48bbe
```

## Best Practices

### 1. Separate Bot Channels from Notification Channels

- **Bot channels** (`#bot-*`): interactive, bound to the AI — ask questions, give commands
- **News channels** (`#news-*`): read-only, receive automated reports — mutable without losing context

### 2. Use Threads for Issue Investigation

When a task needs discussion, create a thread from the notification:
- Thread: "Bug #639 — System Config UI investigation"
- Keeps the main channel clean
- Thread auto-archives when resolved

### 3. Standardize Report Formats

Agree on report format once, then the cron job delivers consistently:
- Status emoji: ✅ Developed, 🔧 In Progress, 🧪 In Testing, ⏸️ On Hold
- Bold for status transitions: `In progress → **✅ Developed**`
- Frontmatter for machine readability (YAML)

### 4. Keep Human Communication in Human Channels

Don't overload bot/notification channels with discussion. Use:
- `#dev-discussion` for architecture decisions
- `#standup` for async standups
- Threads for specific issue deep-dives

### 5. Archive Reports

The `.md` file attachment creates an automatic archive. Over time, you build a history of daily reports that can be:
- Searched in Discord
- Downloaded and analyzed
- Used for sprint retrospectives

## Limitations

1. **Discord tables don't render** — reports use bullet lists and code blocks instead
2. **2000 char message limit** — long reports split across multiple messages
3. **No inline editing** — can't click to change a task status in the report (need to type a command)
4. **API limitations** — some actions (like creating meetings in OpenProject) aren't available via API
5. **Single assistant** — one AI handles all queries; no concurrent users modifying tasks simultaneously

## Tools Used

| Tool | Purpose |
|------|---------|
| [OpenClaw](https://openclaw.ai) | AI assistant bridging Discord ↔ APIs |
| [OpenProject](https://www.openproject.org) | Project management (work packages, sprints) |
| [Jira Cloud](https://www.atlassian.com/software/jira) | Issue tracking (alternative to OpenProject) |
| Discord | Communication hub, notification delivery |
| Cron jobs | Scheduled automated reports |
