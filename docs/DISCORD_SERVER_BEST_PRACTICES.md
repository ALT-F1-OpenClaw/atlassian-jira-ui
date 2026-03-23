# Discord Server Best Practices

How to organize categories, channels, and roles on a Discord server for development teams and open-source projects.

## References

- [Discord Official: Channel Categories and Names](https://discord.com/community/channel-categories-and-names) — Discord's own guide on organizing channels
- [Discord Server Setup Guide](https://support.discord.com/hc/en-us/articles/33023827550359-Discord-Server-Setup-Guide) — official setup documentation
- [Common Room: Ultimate Guide to Discord Community Management](https://www.commonroom.io/resources/ultimate-guide-to-discord-community-management/) — comprehensive community management guide
- [Discord Community Playbook 2025](https://www.influencers-time.com/create-a-thriving-discord-community-2025-playbook-guide/) — modern best practices
- [Discord Templates: Coding](https://discordtemplates.me/tags/coding) — ready-made templates for developer communities
- [Developer's Community Template](https://discordextremelist.xyz/en-US/templates/ESEmMcDaPHfA) — pre-built developer community structure
- [discord-server-generator (GitHub)](https://github.com/HunteRoi/discord-server-generator) — automated Discord server setup framework

## Core Principles

### 1. Less is More

> "Start with fewer channels and add more as needed. Too many empty channels are worse than too few busy ones." — Discord Community Guidelines

**Rule of thumb**: If a channel has fewer than 5 messages per week, it should be merged or removed.

### 2. Categories Create Scanability

Members scan the channel list vertically. Categories create natural breaks:
- Members can **collapse** categories they don't need
- Category names should be **uppercase** and descriptive
- Keep **5-8 channels per category** maximum

### 3. Channel Names Should Be Self-Explanatory

A new member should understand the channel's purpose from the name alone:
- ✅ `#bug-reports` — clear purpose
- ❌ `#misc` — unclear, becomes a dumping ground
- ✅ `#ci-notifications` — specific
- ❌ `#stuff` — useless

## Recommended Structure for Development Teams

### Minimal Setup (Solo / Small Team)

```
📋 GENERAL
├── #announcements          — releases, important updates (read-only)
├── #general                — general discussion

🤖 BOTS
├── #bot-commands           — interact with bots here
├── #bot-notifications      — CI, GitHub, Jira webhooks

💻 DEVELOPMENT
├── #dev-discussion         — architecture, code review
├── #bugs                   — bug reports and triage
├── #help                   — questions and support
```

**7 channels, 3 categories** — enough for a solo developer or team of 2-3.

### Standard Setup (Team of 5-15)

```
📋 INFORMATION
├── #welcome                — rules, onboarding, links
├── #announcements          — releases, milestones (read-only)
├── #roadmap                — feature planning discussion

💻 DEVELOPMENT
├── #dev-general            — general dev discussion
├── #code-review            — PR reviews, architecture
├── #bugs                   — bug reports
├── #help                   — questions

🔔 NOTIFICATIONS
├── #github-notifications   — PRs, issues, CI status
├── #deploy-notifications   — deployment status
├── #jira-notifications     — Jira issue updates

🤖 BOTS
├── #bot-commands           — bot interaction
├── #bot-logs               — bot audit logs

🗣️ COMMUNITY
├── #off-topic              — non-work discussion
├── #showcase               — share what you built
```

**14 channels, 5 categories.**

### Enterprise Setup (Team of 15+)

```
📋 INFORMATION
├── #welcome
├── #announcements
├── #rules
├── #team-directory

💼 MANAGEMENT
├── #roadmap
├── #standup                — daily standup posts
├── #retrospective          — sprint retros
├── #incidents              — production incidents

💻 ENGINEERING
├── #frontend
├── #backend
├── #infrastructure
├── #code-review
├── #architecture

🐛 SUPPORT
├── #bug-reports
├── #help-frontend
├── #help-backend
├── #help-devops

🔔 FEEDS
├── #github
├── #ci-cd
├── #monitoring
├── #jira
├── #sentry

🤖 BOTS
├── #bot-commands
├── #bot-admin

🗣️ SOCIAL
├── #general
├── #off-topic
├── #wins                   — celebrate achievements
```

**27 channels, 7 categories.**

## Our Current Setup

The `raspberry-pi4-openclaw` server uses:

```
📋 GENERAL
├── #general
├── #announcements

🤖 BOTS
├── #bot-setup-openclaw     — main AI interaction (bound)
├── #bot-openclaw           — general bot chat (bound)
├── #bot-x-twitter          — Twitter integration (bound)
├── #bot-shopping-travel    — shopping/travel bot (bound)

📰 NEWS
├── #news-github            — GitHub webhooks (push, PR, issues, CI, releases)
```

**7 channels, 3 categories** — minimal setup, appropriate for a solo developer.

### What We'd Change

1. **Split `#bot-setup-openclaw` per project** — one thread per repo instead of one mega-thread
2. **Add `#deployments`** — separate from GitHub for deploy status
3. **Add `#incidents`** — production issues and postmortems
4. **Rename `#news-github` to `#github-notifications`** — clearer name

## Best Practices for Bot Channels

### Bound vs Unbound Channels

| Type | Description | Example |
|------|-------------|---------|
| **Bound** | Bot responds to every message | `#bot-openclaw` |
| **Unbound** | Bot only responds when mentioned | `#general` |
| **Webhook-only** | No bot interaction, just notifications | `#news-github` |

**Rule**: Keep bot-bound channels separate from human discussion channels. Otherwise, the bot responds to casual conversation.

### Webhook Channels

GitHub/Jira webhooks should go to **dedicated read-only channels**:
- Members can mute them without missing human conversations
- Keeps the notification noise away from discussion
- Easy to review CI status at a glance

### Thread Usage

Use **threads** for long conversations:
- Each project gets its own thread
- Bug investigations in threads (not the main channel)
- Architecture discussions in threads
- **Threads auto-archive** — keeps the channel clean

## Anti-Patterns

### ❌ Too Many Channels

> "We have 50 channels and 3 active members"

Empty channels signal a dead community. Consolidate aggressively.

### ❌ One Channel for Everything

> "All discussion, bugs, notifications, and bot commands in #general"

Impossible to follow, impossible to search, impossible to mute selectively.

### ❌ Cryptic Channel Names

> `#ch1`, `#dev-2`, `#misc-stuff`

New members have no idea where to post. Use descriptive names.

### ❌ No Read-Only Channels

Announcements and notifications channels should be **read-only** (only admins/bots can post). Otherwise, they get cluttered with reactions and off-topic replies.

### ❌ Bot Spam in Human Channels

GitHub webhooks in `#general` = everyone mutes `#general` = nobody sees important messages.

## Discord vs Slack for Development

| Feature | Discord | Slack |
|---------|---------|-------|
| **Cost** | Free (unlimited history) | Free (90-day history limit) |
| **Threads** | Good (auto-archive) | Better (native threading) |
| **Code blocks** | 2000 char limit, no syntax highlight in mobile | 10000 char, syntax highlight |
| **Bots** | Rich (OpenClaw, webhooks) | Rich (Slack apps, webhooks) |
| **Voice** | Built-in (always-on channels) | Huddles (limited) |
| **File sharing** | 25MB (boost for more) | 1GB |
| **Search** | Basic | Advanced (filters, date ranges) |
| **Integrations** | GitHub, Jira webhooks | 2600+ native integrations |
| **Best for** | Open-source, gaming, communities | Enterprise, corporate teams |

## Tools

- [Discohook](https://discohook.org/) — preview and send Discord embeds/messages
- [Discord Timestamp Generator](https://hammertime.cyou/) — generate Discord timestamp formats
- [discord-server-generator](https://github.com/HunteRoi/discord-server-generator) — automate server setup
- [Discord Templates](https://discordtemplates.me/) — browse pre-made server templates
- [Carl-bot](https://carl.gg/) — advanced moderation, reaction roles, auto-mod
