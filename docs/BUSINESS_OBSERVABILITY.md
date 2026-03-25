# Business Observability Guide — Taskara

Track user adoption, engagement, revenue, and product-market fit. Complement to [OBSERVABILITY.md](./OBSERVABILITY.md) (technical) — this guide focuses on **business metrics**.

**Author**: Abdelkrim BOUJRAF — [ALT-F1 SRL](https://www.alt-f1.be), Brussels 🇧🇪

---

## Philosophy

> "You can't improve what you don't measure."

Business observability answers: **Are users finding value?** Technical observability answers: is the system healthy? Both matter, but business metrics drive product decisions.

**Privacy-first**: No third-party analytics (Google Analytics, Mixpanel, etc.). All data collected internally, GDPR compliant, no cookies beyond the session cookie. Users can see exactly what we track.

---

## 1. Key Business Metrics (KPIs)

### 1.1 Acquisition — How do users find us?

| Metric | Source | How to Track |
|--------|--------|-------------|
| **Sign-ups** | OAuth login count | Backend counter: `auth.logins.success` |
| **Sign-up source** | UTM params or referrer | Capture `utm_source` / `document.referrer` on first login |
| **Landing page views** | Page hits | Cloudflare Analytics (free with Pro) |
| **GitHub stars** | GitHub API | Cron job: `gh api repos/ALT-F1-OpenClaw/atlassian-jira-ui --jq '.stargazers_count'` |
| **GitHub forks** | GitHub API | Same as above |
| **LinkedIn post reach** | LinkedIn Analytics | Manual tracking |
| **Twitter impressions** | X Analytics | Manual tracking |

### 1.2 Activation — Do users get value quickly?

| Metric | Definition | Target |
|--------|-----------|--------|
| **First issue viewed** | User opens at least 1 issue detail | > 80% within first session |
| **First board used** | User switches to Board or Sprint view | > 50% within first session |
| **First search** | User uses Ctrl+K command palette | > 30% within first week |
| **Time to first action** | Login → first meaningful click | < 30 seconds |
| **Site selection completed** | Multi-site users pick a site | 100% (required) |
| **Onboarding completion** | Views 3+ different views in first session | > 60% |

### 1.3 Engagement — Are users coming back?

| Metric | Definition | Target |
|--------|-----------|--------|
| **DAU** (Daily Active Users) | Unique users per day | Growing |
| **WAU** (Weekly Active Users) | Unique users per week | Growing |
| **MAU** (Monthly Active Users) | Unique users per month | Growing |
| **DAU/MAU ratio** | Stickiness | > 20% (healthy SaaS) |
| **Session duration** | Average time per visit | > 5 min |
| **Sessions per user/week** | Return frequency | > 3 |
| **Feature adoption rate** | % users who used each feature | Per feature |
| **Views distribution** | List vs Board vs Sprint vs Dashboard | Track shifts |

### 1.4 Retention — Do users stay?

| Metric | Definition | Target |
|--------|-----------|--------|
| **D1 retention** | % users returning day after sign-up | > 40% |
| **D7 retention** | % users returning after 1 week | > 25% |
| **D30 retention** | % users returning after 1 month | > 15% |
| **Churn rate** | % users who stop using per month | < 10% |
| **Resurrection rate** | Churned users who come back | Track |

### 1.5 Revenue — Is it sustainable? (Phase 7)

| Metric | Definition | Source |
|--------|-----------|--------|
| **MRR** (Monthly Recurring Revenue) | Active subscriptions × €3.99 | Stripe API / cashflow-lite |
| **ARR** (Annual Run Rate) | MRR × 12 | Calculated |
| **ARPU** (Average Revenue Per User) | MRR / paying users | Calculated |
| **Conversion rate** | Free users → paid | Stripe webhooks |
| **Trial-to-paid** | Trial starts → active subscriptions | Stripe |
| **Churn revenue** | Lost MRR from cancellations | Stripe |
| **LTV** (Lifetime Value) | ARPU / monthly churn rate | Calculated |
| **CAC** (Customer Acquisition Cost) | Marketing spend / new customers | Manual |
| **LTV:CAC ratio** | Payback efficiency | Target > 3:1 |

### 1.6 Satisfaction — Are users happy?

| Metric | Source | How |
|--------|--------|-----|
| **NPS** (Net Promoter Score) | In-app survey | "How likely are you to recommend Taskara?" (0-10) |
| **CSAT** | In-app feedback | "How satisfied are you?" after key actions |
| **GitHub Issues** | Issue tracker | Bug reports vs feature requests ratio |
| **Support volume** | Email / GitHub | Tickets per user per month |
| **Feature requests** | GitHub Issues | Most requested features |

---

## 2. Implementation — Event Tracking

### 2.1 Backend Events (Python)

```python
# backend/app/analytics.py
"""Business event tracking — privacy-first, internal only."""

import time
import logging
from dataclasses import dataclass, asdict
from opentelemetry import metrics

logger = logging.getLogger(__name__)
meter = metrics.get_meter("taskara.business")

# Counters
signups = meter.create_counter("business.signups", description="New user sign-ups")
logins = meter.create_counter("business.logins", description="User logins")
feature_usage = meter.create_counter("business.feature_usage", description="Feature usage events")
searches = meter.create_counter("business.searches", description="Search queries")
issues_viewed = meter.create_counter("business.issues_viewed", description="Issue detail views")
issues_created = meter.create_counter("business.issues_created", description="Issues created")
issues_transitioned = meter.create_counter("business.issues_transitioned", description="Status transitions")
views_switched = meter.create_counter("business.views_switched", description="View switches")

# Gauges
active_sessions = meter.create_up_down_counter("business.active_sessions", description="Active sessions")


@dataclass
class BusinessEvent:
    event: str
    user_id: str = ""  # Atlassian accountId (pseudonymized)
    properties: dict = None
    timestamp: float = 0

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = time.time()
        if self.properties is None:
            self.properties = {}


def track(event: BusinessEvent):
    """Track a business event via OpenTelemetry metrics."""
    attrs = {"event": event.event}
    if event.properties:
        attrs.update({k: str(v) for k, v in event.properties.items()})

    feature_usage.add(1, attrs)
    logger.info("📊 %s user=%s %s", event.event, event.user_id[:8] if event.user_id else "anon", event.properties)
```

### 2.2 Track in Routers

```python
# In auth.py — after successful OAuth callback
from ..analytics import track, BusinessEvent, signups, logins

# New user (first login)
if is_new_user:
    signups.add(1)
    track(BusinessEvent("signup", user_id=account_id, properties={"site_count": len(resources)}))

# Returning user
logins.add(1)
track(BusinessEvent("login", user_id=account_id))

# In issues.py — issue created
from ..analytics import track, BusinessEvent, issues_created
issues_created.add(1)
track(BusinessEvent("issue_created", properties={"project": project_key}))

# In search.py — search executed
from ..analytics import track, BusinessEvent, searches
searches.add(1, {"type": "quick" if is_quick else "jql"})
```

### 2.3 Frontend Events (lightweight)

```typescript
// frontend/src/analytics.ts
// Fire-and-forget POST to backend — no external services

const API = import.meta.env.VITE_API_URL || "";

export function trackEvent(event: string, properties?: Record<string, string>) {
  // Non-blocking, fire-and-forget
  fetch(`${API}/api/analytics/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, properties, timestamp: Date.now() }),
  }).catch(() => {}); // Silently fail — analytics should never break the app
}

// Usage in App.tsx:
// trackEvent("view_switched", { from: "list", to: "board" });
// trackEvent("issue_opened", { key: "PROJ-123" });
// trackEvent("search_used", { query_length: String(query.length) });
// trackEvent("shortcut_used", { key: "ctrl+k" });
```

### 2.4 Backend Analytics Endpoint

```python
# backend/app/routers/analytics.py
from fastapi import APIRouter, Request
from pydantic import BaseModel
from ..analytics import track, BusinessEvent

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

class EventBody(BaseModel):
    event: str
    properties: dict = {}
    timestamp: float = 0

@router.post("/event")
async def track_event(request: Request, body: EventBody):
    """Track a frontend business event."""
    # Get user from session (if authenticated)
    from .auth import get_session
    session = await get_session(request)
    user_id = session.get("user", {}).get("accountId", "") if session else ""

    track(BusinessEvent(
        event=body.event,
        user_id=user_id,
        properties=body.properties,
        timestamp=body.timestamp,
    ))
    return {"status": "ok"}
```

---

## 3. Grafana Dashboards

### 3.1 Business Overview Dashboard

```
┌─────────────────────────────────────────────────────────┐
│                  Taskara Business Overview                │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│   DAU    │   WAU    │   MAU    │ DAU/MAU  │    MRR      │
│   42     │   128    │   310    │  13.5%   │  €1,237     │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│                                                          │
│  📈 Daily Active Users (30 days)         [time series]   │
│                                                          │
├─────────────────────────┬────────────────────────────────┤
│  Feature Adoption       │  Views Distribution            │
│  ├ Board view: 78%      │  ┌─────────────────────┐      │
│  ├ Sprint: 45%          │  │ List ████████ 40%    │      │
│  ├ Search: 62%          │  │ Board ██████ 30%     │      │
│  ├ Time tracking: 23%   │  │ Sprint ████ 20%     │      │
│  └ Offline: 8%          │  │ Dashboard ██ 10%    │      │
│                         │  └─────────────────────┘      │
├─────────────────────────┴────────────────────────────────┤
│                                                          │
│  📊 Retention Cohorts                    [heatmap]       │
│  Week 1: 45% → Week 2: 32% → Week 4: 22% → Week 8: 18% │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  🔄 Sign-ups per day (30 days)           [bar chart]     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Revenue Dashboard (Phase 7)

```
┌─────────────────────────────────────────────────────────┐
│                  Taskara Revenue                          │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│   MRR    │   ARR    │  ARPU   │ Churn %  │ Trial→Paid  │
│ €1,237   │ €14,844  │  €3.99  │  4.2%    │  28%        │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│                                                          │
│  📈 MRR Growth (12 months)               [time series]  │
│                                                          │
├─────────────────────────┬────────────────────────────────┤
│  New subscriptions/week │  Cancellations/week            │
│  [bar chart]            │  [bar chart]                   │
├─────────────────────────┴────────────────────────────────┤
│                                                          │
│  💰 LTV: €95  |  CAC: €12  |  LTV:CAC = 7.9:1          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 3.3 Product-Market Fit Dashboard

```
┌─────────────────────────────────────────────────────────┐
│              Product-Market Fit Score                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  "How would you feel if you could no longer use Taskara?"│
│                                                          │
│  Very disappointed: ████████████████████ 42%  ← PMF!     │
│  Somewhat disappointed: ████████████ 35%                 │
│  Not disappointed: ████████ 23%                          │
│                                                          │
│  Target: > 40% "Very disappointed" = PMF achieved        │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  NPS Score: +32  (Promoters: 52%, Passives: 28%,         │
│                   Detractors: 20%)                        │
├──────────────────────────────────────────────────────────┤
│  Top Feature Requests:                                   │
│  1. Backlog view (12 votes)                              │
│  2. Epic management (8 votes)                            │
│  3. Export to CSV (7 votes)                               │
│  4. Custom fields (6 votes)                               │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Surveys & Feedback

### 4.1 In-App NPS Survey

Show after 14 days of usage (once per quarter):

```typescript
// "How likely are you to recommend Taskara to a colleague?" (0-10)
// 0-6: Detractor | 7-8: Passive | 9-10: Promoter
// NPS = % Promoters - % Detractors
```

### 4.2 Sean Ellis PMF Question

Show after 30 days of usage (once):

```
"How would you feel if you could no longer use Taskara?"
□ Very disappointed
□ Somewhat disappointed
□ Not disappointed
□ N/A — I no longer use Taskara
```

> **If > 40% say "Very disappointed" → you have product-market fit.**

### 4.3 CSAT After Key Actions

Quick thumbs up/down after:
- First issue created
- First sprint completed
- First week of use

---

## 5. Reporting Cadence

| Report | Frequency | Audience | Content |
|--------|-----------|----------|---------|
| **Daily pulse** | Daily | Founder | DAU, sign-ups, errors, churn |
| **Weekly review** | Monday | Team | WAU, retention, feature adoption, top issues |
| **Monthly business** | 1st of month | Stakeholders | MAU, MRR, NPS, PMF score, growth rate |
| **Quarterly deep dive** | Quarterly | Board | LTV, CAC, cohort analysis, roadmap alignment |

### Automated Reports

```python
# Cron job: daily pulse to Discord/Slack
# Runs at 08:00 UTC every day
"""
📊 Taskara Daily Pulse — {date}

👥 DAU: 42 (+3)  |  New sign-ups: 5
📈 Sessions: 128  |  Avg duration: 8m 32s
💰 MRR: €1,237 (+€15.96)
⚠️ Errors: 2 (Jira API timeout)
🔄 Churn: 0 cancellations

Top features used: Board (45%), List (30%), Sprint (15%)
"""
```

---

## 6. Data Privacy

All business analytics comply with GDPR:

| Principle | Implementation |
|-----------|---------------|
| **Minimization** | Only track events needed for product decisions |
| **Pseudonymization** | User ID is Atlassian accountId (not email/name) |
| **No third parties** | All data stays on our infrastructure |
| **No cookies** | Events sent via API, not cookie-based tracking |
| **Right to erasure** | Delete all events for a user on request |
| **Transparency** | Document exactly what we track (this page) |
| **Consent** | Analytics covered by "Contract performance" legal basis (Art. 6(1)(b)) — essential for service improvement |

---

## 7. Tools Comparison

| Tool | Cost | Privacy | Self-hosted | Recommendation |
|------|------|---------|-------------|----------------|
| **OpenTelemetry + Grafana** | Free (infra cost) | ✅ Full control | ✅ Yes | **Use this** |
| Plausible Analytics | €9/mo | ✅ GDPR compliant | ✅ Optional | Good for page analytics |
| PostHog | Free tier / $450+/mo | ✅ Self-hostable | ✅ Yes | Overkill for now |
| Mixpanel | Free tier / $25+/mo | ⚠️ US-based | ❌ No | Privacy concern |
| Google Analytics | Free | ❌ Data sent to Google | ❌ No | **Never** |
| Amplitude | Free tier / $49+/mo | ⚠️ US-based | ❌ No | Privacy concern |

**Recommendation**: Start with OpenTelemetry custom metrics (already planned in OBSERVABILITY.md). Add Plausible for public landing page analytics if needed. Never use Google Analytics.
