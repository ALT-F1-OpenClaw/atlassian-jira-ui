# HubSpot Skill for OpenClaw

An OpenClaw skill providing 50+ commands to interact with HubSpot's CRM, CMS, Marketing, Conversations, and Automation APIs.

## Links

- **ClawHub**: <https://clawhub.ai/Abdelkrim/hubspot-by-altf1be>
- **GitHub**: <https://github.com/ALT-F1-OpenClaw/openclaw-skill-hubspot-by-altf1be>
- **Discord thread**: `#openclaw-skill-hubspot-by-altf1be`

## How It Was Built

Built entirely via Discord conversation in the `#clawhub.ai` thread on March 20, 2026:

1. User asked: *"Build a HubSpot skill for OpenClaw"*
2. AI researched HubSpot API documentation
3. AI cloned the skill template and created the GitHub repo
4. AI spawned a coding agent (Claude Code) to build the full implementation
5. Skill was published to ClawHub — total time: ~30 minutes

## Coverage

### CRM (v3)
| Entity | Commands |
|--------|----------|
| Contacts | list, get, create, update, delete, search |
| Companies | list, get, create, update, delete, search |
| Deals | list, get, create, update, delete, search |
| Tickets | list, get, create, update, delete, search |
| Owners | list, get |
| Pipelines | list stages, get pipeline |
| Associations (v4) | list, create, delete |
| Properties | list, get, create |
| Engagements | list, create (notes, calls, tasks, emails) |

### CMS (v3)
| Entity | Commands |
|--------|----------|
| Blog Posts | list, get, create, update |
| Site Pages | list, get |
| Domains | list |

### Marketing (v3)
| Entity | Commands |
|--------|----------|
| Forms | list, get |
| Email Campaigns | list, get |
| Marketing Emails | list, get |
| Contact Lists | list, get, add contacts |

### Conversations (v3)
| Entity | Commands |
|--------|----------|
| Threads | list, get |
| Messages | list, send |

### Automation (v3)
| Entity | Commands |
|--------|----------|
| Workflows | list, get, enable, disable |

## Authentication

Two methods supported:

### Private App Token (Simple)
```env
HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxxxxx
```
Best for: single-user, internal tools.

### OAuth 2.0 (Multi-user)
```env
HUBSPOT_CLIENT_ID=your-client-id
HUBSPOT_CLIENT_SECRET=your-client-secret
HUBSPOT_REFRESH_TOKEN=your-refresh-token
```
Auto-refreshes access tokens. Best for: multi-user, production apps.

## API Versions

| Domain | API Version |
|--------|-------------|
| CRM objects | v3 |
| CRM associations | v4 |
| CMS | v3 |
| Marketing | v3 |
| Conversations | v3 |
| Automation | v3 |
| OAuth | v1 |

## Installation

```bash
clawhub install Abdelkrim/hubspot-by-altf1be
```

Or manually:
```bash
cd ~/.openclaw/skills/
git clone https://github.com/ALT-F1-OpenClaw/openclaw-skill-hubspot-by-altf1be.git hubspot-by-altf1be
```

## Usage Examples

Via Discord with OpenClaw:

> "List my HubSpot contacts"
> "Create a new deal: Acme Corp, $50k, pipeline Sales"
> "Show tickets assigned to me"
> "Search companies with domain acme.com"
> "List all active workflows"
> "Get blog posts from last month"

## Related

- [ClawHub Skills Guide](CLAWHUB_SKILLS.md) — how skills work in OpenClaw
- [Discord Development](DISCORD_DEVELOPMENT.md) — building via Discord
- [HubSpot API Docs](https://developers.hubspot.com/docs/api/overview)
