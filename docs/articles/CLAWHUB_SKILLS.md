# ClawHub Skills — Extending OpenClaw with Plugins

How to build, publish, and use ClawHub skills to connect OpenClaw to external services.

## What is ClawHub?

[ClawHub](https://clawhub.ai) is a marketplace for OpenClaw skills — pre-built plugins that teach the AI how to interact with external APIs and tools. Think npm for AI capabilities.

- **Browse skills**: <https://clawhub.ai>
- **Install**: `clawhub install Abdelkrim/hubspot-by-altf1be`
- **Publish**: `clawhub publish ./skills/my-skill`

## Real-World Example: Building a HubSpot Skill

This skill was built entirely via Discord conversation in the `#clawhub.ai` thread:

### The Conversation

```
User: "Build a HubSpot skill for OpenClaw"
AI:   → Researches HubSpot API docs
      → Clones skill template
      → Spawns coding agent (Claude Code)
      → Builds 50+ commands across 19 entities
      → Pushes to GitHub
      → Publishes to ClawHub
User: "Which API version does it support?"
AI:   → v3 for CRM/CMS/Marketing, v4 for associations
```

**Result**: [hubspot-by-altf1be v1.0.0](https://clawhub.ai/Abdelkrim/hubspot-by-altf1be) — built in ~30 minutes.

### What's in the HubSpot Skill

**50+ commands** across 19 entities (1,412 lines):

- **CRM**: contacts, companies, deals, tickets, owners, pipelines, associations, properties, engagements
- **CMS**: blog posts, pages, domains
- **Marketing**: email campaigns, forms, marketing emails, contact lists
- **Conversations**: inbox + messages
- **Automation**: workflows
- **Auth**: Private App token (simple) + OAuth 2.0 with auto-refresh

**API versions**: v3 across the board, v4 for associations.

### GitHub Repository

<https://github.com/ALT-F1-OpenClaw/openclaw-skill-hubspot-by-altf1be>

## How Skills Work

A skill is a directory with a `SKILL.md` file that teaches the AI:

```
skills/hubspot-by-altf1be/
├── SKILL.md          ← instructions for the AI
├── references/       ← API schemas, examples
└── scripts/          ← helper scripts
```

The `SKILL.md` contains:
- **Description**: what the skill does
- **Configuration**: required env vars (API keys, tokens)
- **Commands**: available actions with parameters and examples
- **Error handling**: common errors and fixes

When the AI matches a user request to a skill, it reads the `SKILL.md` and follows the instructions.

## Building a New Skill

### Step 1: Define the Scope

> "I want to connect to HubSpot's CRM — contacts, companies, deals"

### Step 2: Clone the Template

```bash
clawhub init my-skill
# or
git clone https://github.com/openclaw/skill-template.git my-skill
```

### Step 3: Write SKILL.md

The `SKILL.md` is the skill's brain. It tells the AI:
- What API endpoints to call
- How to authenticate
- What parameters each command accepts
- How to format responses

### Step 4: Test Locally

Place the skill in `~/.openclaw/skills/` and ask the AI to use it:

> "List my HubSpot contacts"

### Step 5: Publish to ClawHub

```bash
clawhub publish ./skills/my-skill
```

## Skills Built by ALT-F1

| Skill | Description | Commands | Link |
|-------|-------------|----------|------|
| **hubspot-by-altf1be** | HubSpot CRM, CMS, Marketing | 50+ | [ClawHub](https://clawhub.ai/Abdelkrim/hubspot-by-altf1be) / [GitHub](https://github.com/ALT-F1-OpenClaw/openclaw-skill-hubspot-by-altf1be) |

## Built-in Skills (OpenClaw)

Skills that come with OpenClaw out of the box:

| Skill | Description |
|-------|-------------|
| `clawhub` | Search, install, publish skills from ClawHub |
| `coding-agent` | Spawn Claude Code / Codex for coding tasks |
| `discord` | Discord operations (send, react, channels, polls) |
| `gh-issues` | GitHub issues + PR automation |
| `github` | GitHub CLI operations |
| `gog` | Google Workspace (Gmail, Calendar, Drive) |
| `goplaces` | Google Places API |
| `healthcheck` | Host security hardening |
| `mcporter` | MCP server management |
| `nano-banana-pro` | Image generation (Gemini) |
| `nano-pdf` | PDF editing |
| `notion` | Notion API |
| `skill-creator` | Create and audit skills |
| `video-frames` | Extract frames from video |
| `weather` | Weather forecasts |

## Key Concepts

### Brave Search API

OpenClaw uses [Brave Search API](https://brave.com/search/api/) for web searches:
- Default search provider when `BRAVE_API_KEY` is configured
- Returns structured results (titles, URLs, snippets)
- $5/month free credit (~1,000 queries)
- Does NOT render JavaScript (SPA pages come back empty)
- For JS-heavy sites, the browser tool is used instead

### Coding Agents

For complex skill building, OpenClaw spawns a **coding agent** (Claude Code):
- Background process that writes code
- Full file system access
- Runs tests
- Reports back when done

```
User: "Build a HubSpot skill"
AI:   → spawns Claude Code
      → "Coding agent is building the full HubSpot skill..."
      → (3 minutes later)
      → "Done! 50+ commands, 1,412 lines. Published to ClawHub."
```

## References

- [ClawHub Marketplace](https://clawhub.ai)
- [OpenClaw Documentation](https://docs.openclaw.ai)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [OpenClaw Discord](https://discord.com/invite/clawd)
- [Skill Creator Guide](https://docs.openclaw.ai/skills)
