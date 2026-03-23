# Content Marketing with AI — From Discord to Jira to LinkedIn

How to use Discord + OpenClaw to generate a content pipeline: turn real project work into LinkedIn articles, managed through Jira.

## Overview

The `#bot-jira` channel serves as a **content marketing engine**:

```
Real project work → AI generates article ideas → Creates Jira issues → Content pipeline

Discord (#bot-jira)
    │
    ├── "Create articles based on my GitHub repos"
    │       → AI scans repos, READMEs, code
    │       → Generates article hooks + outlines
    │       → Creates Jira issues (BIZENG-155 to BIZENG-171)
    │
    ├── "Add an article about Brave Search API"
    │       → AI creates BIZENG-170 with dashboard screenshot
    │       → Hook + business angle + technical deep-dive
    │
    └── "Add an article about Voyage AI"
            → AI creates BIZENG-169 with usage data
            → Investigative angle: are Brave + Voyage connected?
```

## Real Output: 14 Articles Generated

All created via Discord conversation, tracked as Jira issues under parent task BIZENG-144:

### OpenClaw Skills (7 articles)

| Jira | Title | Angle |
|------|-------|-------|
| BIZENG-155 | I Built 7 OpenClaw Skills in 2 Weeks | Overview, productivity story |
| BIZENG-156 | Jira Skill — Managing Jira from Discord | Developer workflow |
| BIZENG-157 | HubSpot Skill — CRM Meets AI | Sales automation |
| BIZENG-158 | SharePoint Skill — Certificate Auth Deep-dive | Enterprise integration |
| BIZENG-159 | X/Twitter Skill — Responsible AI Posting | Social media automation |
| BIZENG-160 | OpenProject Skill — Open-source Jira Alternative | Project management |
| BIZENG-165 | Skill Template — Build Your Own in 1 Hour | Developer tutorial |

### Infrastructure & Platform

| Jira | Title | Angle |
|------|-------|-------|
| BIZENG-161 | Jira Alternative UI (FastAPI + React) | This project! |
| BIZENG-162 | Running OpenClaw on Raspberry Pi 4 🍓 | Cost-effective AI hosting |
| BIZENG-163 | Backing Up Your AI's Brain | Data safety, memory persistence |

### Technical Deep-dives

| Jira | Title | Angle |
|------|-------|-------|
| BIZENG-167 | Raspberry Pi 4 Performance for AI Agents | Real benchmarks |
| BIZENG-168 | The openclaw.json File Explained | Configuration guide |
| BIZENG-169 | Voyage AI — The Embedding Engine Behind OpenClaw's Memory | 25K tokens for pennies |
| BIZENG-170 | Brave Search API — 133 Requests, $0.67 | Dashboard analysis |
| BIZENG-171 | Brave Search + Voyage AI — Are These Two APIs Connected? | Investigation |

## How It Works

### Step 1: Identify Content from Real Work

> "Create articles based on my GitHub repos in ALT-F1-OpenClaw"

The AI:
1. Lists all repos in the GitHub org
2. Reads each README
3. Identifies interesting angles (hooks, business value, technical depth)
4. Groups articles by theme

### Step 2: Create Jira Issues

For each article, the AI creates a Jira issue with:
- **Title**: catchy, LinkedIn-friendly headline
- **Description**: hook + business angle + technical outline
- **Parent**: linked to the content strategy epic (BIZENG-144)
- **Labels**: content, linkedin, technical
- **Priority**: based on timeliness and impact

### Step 3: Enrich with Real Data

> "Add an article about the Brave Search API dashboard"

The user shares a screenshot → AI creates a Jira issue with:
- Real usage data (133 requests, $0.67 cost)
- Dashboard analysis
- Cost comparison with alternatives
- Screenshot attached to the issue

### Step 4: Cross-Reference

> "Add an article about the probable links between Brave Search API and Voyage AI"

The AI connects dots across projects:
- Similar usage spikes (Mar 10-14) on both dashboards
- MongoDB acquisition of Voyage AI
- How OpenClaw uses both as complementary layers

## Article Structure Template

Each article follows this formula:

```
🎯 Hook — provocative question or surprising data point
💼 Business angle — why should the reader care?
🔧 Technical deep-dive — how does it actually work?
📊 Real data — screenshots, benchmarks, costs
🔗 Call to action — try it, read more, connect
```

## Content Calendar

At 1 article every 3 days, 14 articles = **42 days of content** (6 weeks).

## Tools Used

| Tool | Role |
|------|------|
| Discord `#bot-jira` | Content ideation + Jira issue creation |
| Jira (BIZENG project) | Content pipeline tracking |
| GitHub repos | Source material (READMEs, code, dashboards) |
| OpenClaw AI | Generates outlines, creates issues, attaches screenshots |
| LinkedIn | Publishing platform |

## Best Practices

1. **Start from real work** — don't invent topics, extract them from what you actually built
2. **Screenshots tell stories** — dashboard data, code snippets, error messages
3. **One idea per issue** — don't combine multiple articles in one Jira ticket
4. **Link issues to parent** — keeps the content strategy organized
5. **AI generates, human curates** — the AI drafts hooks and outlines, you review and publish
6. **Batch creation** — generate 10+ article ideas in one session, then space out publication
7. **Cross-reference articles** — the Brave + Voyage investigation only worked because both were in the pipeline

## Related

- [Discord Development Guide](DISCORD_DEVELOPMENT.md) — building apps via Discord
- [Project Management with Discord](PROJECT_MANAGEMENT_WITH_DISCORD.md) — daily reports + task management
- [ClawHub Skills](CLAWHUB_SKILLS.md) — the skills that became article topics
