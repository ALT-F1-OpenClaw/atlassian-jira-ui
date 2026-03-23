# GitHub Webhooks on Discord — Real-Time Notifications

How to set up GitHub webhook notifications in a Discord channel for commits, PRs, CI status, and Dependabot updates.

## Overview

The `#news-github` channel receives real-time notifications from all repositories in the ALT-F1-OpenClaw GitHub organization via Discord webhooks.

```
GitHub repo → webhook → Discord #news-github
    │
    ├── Push events (commits)
    ├── Pull request events (opened, merged, closed)
    ├── Issue events (opened, closed)
    ├── Workflow runs (CI/CD status)
    ├── Releases (new tags)
    ├── Stars & forks
    └── Dependabot (branch updates, PRs)
```

## What It Looks Like

### Commit Notifications
```
[atlassian-jira-ui:main] 1 new commit
ab3e6d7 docs: Content Marketing with AI — Discord to Ji... - Abdelkrim
```

### Dependabot Updates
```
[atlassian-jira-ui] Branch dependabot/npm_and_yarn/frontend/vite-8.0.0
was force-pushed to b45ad71
```

### CI/CD Status
Workflow run results (pass/fail) with links to the GitHub Actions run.

## Setup

### Step 1: Create a Discord Webhook

1. Go to Discord → Server Settings → Integrations → Webhooks
2. Click **New Webhook**
3. Select the `#news-github` channel
4. Name it "GitHub"
5. Copy the **Webhook URL**

### Step 2: Add Webhook to GitHub Repository

1. Go to your GitHub repo → Settings → Webhooks → Add webhook
2. **Payload URL**: `{webhook_url}/github` (add `/github` at the end!)
3. **Content type**: `application/json`
4. **Events**: Select individual events:
   - ✅ Pushes
   - ✅ Pull requests
   - ✅ Issues
   - ✅ Workflow runs
   - ✅ Releases
   - ✅ Stars
   - ✅ Forks
5. Click **Add webhook**

### Step 3: Add to All Org Repos (Optional)

To add the webhook to all repositories in an organization:

```bash
# Using GitHub CLI
WEBHOOK_URL="https://discord.com/api/webhooks/ID/TOKEN/github"

for repo in $(gh repo list ALT-F1-OpenClaw --json name -q '.[].name'); do
  gh api repos/ALT-F1-OpenClaw/$repo/hooks \
    --method POST \
    --field name=web \
    --field active=true \
    --field events='["push","pull_request","issues","workflow_run","release","star","fork"]' \
    --field config.url="$WEBHOOK_URL" \
    --field config.content_type=json
  echo "Added webhook to $repo"
done
```

## Channel Configuration

| Setting | Value |
|---------|-------|
| **Channel name** | `#news-github` |
| **Category** | 📰 News |
| **Topic** | "GitHub webhook notifications (read-only, no bot)" |
| **Bot bound** | ❌ No — webhook only, no AI interaction |
| **Permissions** | Read-only for members (only webhooks post) |

## What You See in the Channel

| Event | Discord Shows |
|-------|---------------|
| **Push** | Commit hash, message, author, branch |
| **PR opened** | Title, author, base/head branches |
| **PR merged** | Merge commit, who merged |
| **Issue opened** | Title, author, labels |
| **Workflow run** | Status (success/failure), workflow name |
| **Release** | Tag, release name, author |
| **Dependabot** | Branch force-push (dependency updates) |
| **Star** | Who starred, star count |

## Tips

### Mute the Channel
If the notification volume is too high, right-click the channel → **Mute Channel** → Only visit when you want to review activity.

### Use `/github` Suffix
The webhook URL MUST end with `/github` for Discord to format the embeds correctly. Without it, you get raw JSON.

### Filter Events
Only subscribe to events you actually care about. Subscribing to "everything" floods the channel with noise (especially `push` on active repos).

### Separate Channels per Repo (Optional)
For large organizations, consider one notification channel per repo:
- `#news-jira-ui` — atlassian-jira-ui repo
- `#news-hubspot-skill` — hubspot skill repo
- `#news-backup-app` — backup app repo

## Our Setup

**Webhook ID**: `1481072422697566281`
**Covers**: All 10+ repositories in ALT-F1-OpenClaw organization
**Events**: push, PR, issues, workflow_run, release, star, fork

### Repos Sending Notifications

- `atlassian-jira-ui` — this project (most active)
- `openclaw-skill-hubspot-by-altf1be` — HubSpot skill
- `openclaw-skill-jira-by-altf1be` — Jira skill
- `openclaw-skill-openproject-by-altf1be` — OpenProject skill
- `openclaw-skill-sharepoint-by-altf1be` — SharePoint skill
- `openclaw-skill-x-by-altf1be` — X/Twitter skill
- `openclaw-skill-template-by-altf1be` — Skill template
- `openclaw-backup-app` — Backup application
- And more...

## Related

- [Discord Server Best Practices](DISCORD_SERVER_BEST_PRACTICES.md) — channel organization
- [Discord Development](DISCORD_DEVELOPMENT.md) — developing via Discord
- [GitHub Webhooks Documentation](https://docs.github.com/en/developers/webhooks-and-events/webhooks/about-webhooks)
