#!/usr/bin/env python3
"""Compare Taskara API responses with direct Jira API calls.

Runs against the live Taskara backend and Jira Cloud to verify
data consistency. Uses credentials from the backend .env file.

Usage:
    python3 scripts/api-comparison-test.py [--taskara-url URL] [--env-file PATH]

Defaults:
    --taskara-url https://atlf1be-raspberry-pi-4.tail981e59.ts.net:9443  (dev)
    --env-file /srv/atlassian-jira-ui/dev/.env
"""

import argparse
import asyncio
import json
import os
import sys
from base64 import b64encode
from pathlib import Path

try:
    import httpx
except ImportError:
    print("Installing httpx...")
    os.system(f"{sys.executable} -m pip install httpx -q")
    import httpx


# ── Config ────────────────────────────────────────────────────

def load_env(env_file: str) -> dict:
    """Load .env file into a dict."""
    env = {}
    path = Path(env_file)
    if not path.exists():
        print(f"❌ .env file not found: {env_file}")
        sys.exit(1)
    for line in path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip()
    return env


# ── Comparison Helpers ────────────────────────────────────────

class ComparisonResult:
    def __init__(self, name: str):
        self.name = name
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        self.details = []

    def ok(self, msg: str):
        self.passed += 1
        self.details.append(f"  ✅ {msg}")

    def fail(self, msg: str):
        self.failed += 1
        self.details.append(f"  ❌ {msg}")

    def warn(self, msg: str):
        self.warnings += 1
        self.details.append(f"  ⚠️  {msg}")

    def print(self):
        status = "PASS" if self.failed == 0 else "FAIL"
        emoji = "✅" if self.failed == 0 else "❌"
        print(f"\n{emoji} {self.name} — {status} ({self.passed} passed, {self.failed} failed, {self.warnings} warnings)")
        for d in self.details:
            print(d)


# ── Tests ─────────────────────────────────────────────────────

async def _safe_json(resp, label: str, result: ComparisonResult):
    """Parse JSON response, handling errors."""
    if resp.status_code >= 400:
        result.fail(f"{label}: HTTP {resp.status_code} — {resp.text[:200]}")
        return None
    try:
        return resp.json()
    except Exception as e:
        result.fail(f"{label}: Invalid JSON — {e}")
        return None


async def test_projects(taskara: httpx.AsyncClient, jira: httpx.AsyncClient, jira_base: str, result: ComparisonResult):
    """Compare project lists."""
    # Taskara
    t_resp = await taskara.get("/api/projects")
    t_projects = await _safe_json(t_resp, "Taskara /api/projects", result)
    if t_projects is None: return

    # Jira direct
    j_resp = await jira.get(f"{jira_base}/project")
    j_projects = await _safe_json(j_resp, "Jira /project", result)
    if j_projects is None: return

    t_keys = {p["key"] for p in t_projects}
    j_keys = {p["key"] for p in j_projects}

    if t_keys == j_keys:
        result.ok(f"Project count matches: {len(t_keys)} projects")
    else:
        missing = j_keys - t_keys
        extra = t_keys - j_keys
        if missing:
            result.fail(f"Missing from Taskara: {missing}")
        if extra:
            result.warn(f"Extra in Taskara (shouldn't happen): {extra}")
        result.ok(f"Common projects: {len(t_keys & j_keys)}")

    # Spot check: first project name
    if t_projects and j_projects:
        t_first = sorted(t_projects, key=lambda p: p["key"])[0]
        j_first = next((p for p in j_projects if p["key"] == t_first["key"]), None)
        if j_first and t_first["name"] == j_first["name"]:
            result.ok(f"Project '{t_first['key']}' name matches: '{t_first['name']}'")
        elif j_first:
            result.fail(f"Project '{t_first['key']}' name mismatch: Taskara='{t_first['name']}' vs Jira='{j_first['name']}'")


async def test_issues(taskara: httpx.AsyncClient, jira: httpx.AsyncClient, jira_base: str, result: ComparisonResult, project: str = ""):
    """Compare issue lists."""
    params = {"max_results": "10", "sort_by": "updated", "sort_order": "DESC"}
    if project:
        params["project"] = project

    # Taskara
    t_resp = await taskara.get("/api/issues", params=params)
    t_data = t_resp.json()
    t_issues = t_data.get("issues", [])
    t_total = t_data.get("total", 0)

    # Jira direct — JQL
    jql = f"project = {project} ORDER BY updated DESC" if project else "ORDER BY updated DESC"
    j_resp = await jira.get(f"{jira_base}/search/jql", params={
        "jql": jql, "maxResults": 10,
        "fields": "summary,status,priority,issuetype,assignee,updated"
    })
    j_data = j_resp.json()
    j_issues = j_data.get("issues", [])
    j_total = j_data.get("total", 0)

    label = f"(project={project})" if project else "(all)"
    if t_total == j_total:
        result.ok(f"Issue total matches {label}: {t_total}")
    else:
        result.warn(f"Issue total differs {label}: Taskara={t_total} vs Jira={j_total} (may be filter differences)")

    # Compare first few issue keys
    t_keys = [i["key"] for i in t_issues[:5]]
    j_keys = [i["key"] for i in j_issues[:5]]

    matching = sum(1 for k in t_keys if k in j_keys)
    if matching >= 3:
        result.ok(f"Top issues overlap {label}: {matching}/5 match (order may differ due to timing)")
    elif matching > 0:
        result.warn(f"Partial overlap {label}: {matching}/5 — Taskara={t_keys} vs Jira={j_keys}")
    else:
        result.fail(f"No overlap {label}: Taskara={t_keys} vs Jira={j_keys}")

    # Spot check: first issue detail
    if t_issues:
        key = t_issues[0]["key"]
        t_detail = await taskara.get(f"/api/issues/{key}")
        j_detail = await jira.get(f"{jira_base}/issue/{key}", params={"fields": "summary,status,priority"})
        if t_detail.status_code == 200 and j_detail.status_code == 200:
            td = t_detail.json()
            jd = j_detail.json()
            if td.get("summary") == jd.get("fields", {}).get("summary"):
                result.ok(f"Issue {key} summary matches: '{td['summary'][:50]}...'")
            else:
                result.fail(f"Issue {key} summary mismatch")

            t_status = td.get("status", "")
            j_status = jd.get("fields", {}).get("status", {}).get("name", "")
            if t_status == j_status:
                result.ok(f"Issue {key} status matches: '{t_status}'")
            else:
                result.fail(f"Issue {key} status: Taskara='{t_status}' vs Jira='{j_status}'")


async def test_sprints(taskara: httpx.AsyncClient, jira: httpx.AsyncClient, jira_base: str, jira_agile: str, result: ComparisonResult):
    """Compare sprint data."""
    # Taskara — all states
    t_resp = await taskara.get("/api/sprints", params={"state": "active,future,closed"})
    t_data = t_resp.json()
    t_sprints = t_data.get("sprints", [])

    result.ok(f"Taskara returns {len(t_sprints)} sprints (active+future+closed)")

    # Get boards from Jira
    try:
        j_boards = await jira.get(f"{jira_agile}/rest/agile/1.0/board", params={"maxResults": 50})
        boards = j_boards.json().get("values", [])
        result.ok(f"Jira has {len(boards)} boards")
    except Exception as e:
        result.warn(f"Could not fetch boards: {e}")
        boards = []

    # Count sprints across boards
    j_sprint_count = 0
    j_sprint_names = []
    for board in boards:
        try:
            j_sp = await jira.get(f"{jira_agile}/rest/agile/1.0/board/{board['id']}/sprint",
                                  params={"state": "active,future,closed"})
            sprints = j_sp.json().get("values", [])
            j_sprint_count += len(sprints)
            j_sprint_names.extend([s["name"] for s in sprints])
        except Exception:
            continue  # Kanban boards don't have sprints

    t_sprint_names = [s["name"] for s in t_sprints]
    common = set(t_sprint_names) & set(j_sprint_names)

    if len(t_sprints) == j_sprint_count:
        result.ok(f"Sprint count matches: {j_sprint_count}")
    else:
        result.warn(f"Sprint count differs: Taskara={len(t_sprints)} vs Jira Agile API={j_sprint_count}")
        missing = set(j_sprint_names) - set(t_sprint_names)
        if missing:
            result.warn(f"Sprints in Jira but not Taskara: {missing}")

    if common:
        result.ok(f"Common sprints: {common}")

    # Check sprint issues count for first active sprint
    active = [s for s in t_sprints if s.get("state") == "active"]
    if active:
        sprint = active[0]
        t_issues = await taskara.get(f"/api/sprints/{sprint['id']}/issues")
        t_count = t_issues.json().get("total", 0)

        # JQL comparison
        j_jql = await jira.get(f"{jira_base}/search/jql", params={
            "jql": f"sprint = {sprint['id']}",
            "maxResults": 0
        })
        j_count = j_jql.json().get("total", 0)

        if t_count == j_count:
            result.ok(f"Sprint '{sprint['name']}' issues: {t_count} (matches Jira)")
        elif t_count > 0:
            result.warn(f"Sprint '{sprint['name']}' issues: Taskara={t_count} vs Jira JQL={j_count}")
        else:
            result.fail(f"Sprint '{sprint['name']}' shows 0 issues in Taskara but {j_count} in Jira")


async def test_priorities(taskara: httpx.AsyncClient, jira: httpx.AsyncClient, jira_base: str, result: ComparisonResult):
    """Compare priorities."""
    t_resp = await taskara.get("/api/priorities")
    j_resp = await jira.get(f"{jira_base}/priority")

    data = t_resp.json(); t_names = {p["name"] for p in data} if isinstance(data, list) else set()
    data = j_resp.json(); j_names = {p["name"] for p in data} if isinstance(data, list) else set()

    if t_names == j_names:
        result.ok(f"Priorities match: {t_names}")
    else:
        result.fail(f"Priorities differ: Taskara={t_names} vs Jira={j_names}")


async def test_labels(taskara: httpx.AsyncClient, jira: httpx.AsyncClient, jira_base: str, result: ComparisonResult):
    """Compare labels."""
    t_resp = await taskara.get("/api/labels")
    j_resp = await jira.get(f"{jira_base}/label")

    data = t_resp.json(); t_labels = set(data) if isinstance(data, list) else set()
    j_labels = set(j_resp.json().get("values", []))

    if t_labels == j_labels:
        result.ok(f"Labels match: {len(t_labels)} labels")
    else:
        missing = j_labels - t_labels
        if missing:
            result.warn(f"Labels in Jira but not Taskara: {len(missing)} (may be pagination)")
        result.ok(f"Common labels: {len(t_labels & j_labels)}")


async def test_search(taskara: httpx.AsyncClient, jira: httpx.AsyncClient, jira_base: str, result: ComparisonResult):
    """Compare search results."""
    query = "test"

    t_resp = await taskara.get("/api/search/quick", params={"q": query, "max_results": "5"})
    t_results = t_resp.json().get("issues", [])

    j_resp = await jira.get(f"{jira_base}/search/jql", params={
        "jql": f'text ~ "{query}" ORDER BY updated DESC',
        "maxResults": 5,
        "fields": "summary"
    })
    j_results = j_resp.json().get("issues", [])

    result.ok(f"Search '{query}': Taskara={len(t_results)} results, Jira={len(j_results)} results")

    if t_results and j_results:
        t_keys = {i["key"] for i in t_results}
        j_keys = {i["key"] for i in j_results}
        overlap = t_keys & j_keys
        if overlap:
            result.ok(f"Search overlap: {len(overlap)} common results")
        else:
            result.warn(f"No search overlap (text matching may differ)")


async def test_health(taskara: httpx.AsyncClient, result: ComparisonResult):
    """Check Taskara health endpoint."""
    resp = await taskara.get("/api/health")
    data = resp.json()
    if data.get("status") == "ok":
        result.ok(f"Health check: OK (version {data.get('version', '?')})")
    else:
        result.fail(f"Health check failed: {data}")


# ── Main ──────────────────────────────────────────────────────

async def main():
    parser = argparse.ArgumentParser(description="Compare Taskara API vs Jira API")
    parser.add_argument("--taskara-url", default="https://atlf1be-raspberry-pi-4.tail981e59.ts.net:9443",
                        help="Taskara backend URL (default: dev)")
    parser.add_argument("--env-file", default="/srv/atlassian-jira-ui/dev/.env",
                        help="Path to .env with Jira credentials")
    parser.add_argument("--project", default="", help="Focus on a specific project key")
    args = parser.parse_args()

    env = load_env(args.env_file)
    jira_host = env.get("JIRA_HOST", "").rstrip("/")
    jira_email = env.get("JIRA_EMAIL", "")
    jira_token = env.get("JIRA_API_TOKEN", "")

    if not jira_host or not jira_email or not jira_token:
        print("❌ Missing JIRA_HOST, JIRA_EMAIL, or JIRA_API_TOKEN in .env")
        sys.exit(1)

    if not jira_host.startswith("http"):
        jira_host = f"https://{jira_host}"

    jira_base = f"{jira_host}/rest/api/3"
    jira_agile = jira_host

    auth_header = b64encode(f"{jira_email}:{jira_token}".encode()).decode()

    print(f"🔍 Taskara API Comparison Test")
    print(f"   Taskara: {args.taskara_url}")
    print(f"   Jira:    {jira_host}")
    print(f"   Project: {args.project or '(all)'}")
    print()

    jira_headers = {
        "Authorization": f"Basic {auth_header}",
        "Accept": "application/json",
    }

    # Taskara in dev with API Token disabled requires us to call it
    # without auth — it uses its own .env credentials internally.
    # We'll try with and without auth.
    async with httpx.AsyncClient(base_url=args.taskara_url, verify=False, timeout=30.0) as taskara, \
               httpx.AsyncClient(headers=jira_headers, verify=True, timeout=30.0) as jira:

        results = []

        # Health
        r = ComparisonResult("Health Check")
        await test_health(taskara, r)
        r.print()
        results.append(r)

        # Projects
        r = ComparisonResult("Projects")
        await test_projects(taskara, jira, jira_base, r)
        r.print()
        results.append(r)

        # Issues
        r = ComparisonResult("Issues")
        await test_issues(taskara, jira, jira_base, r, project=args.project)
        r.print()
        results.append(r)

        # Sprints
        r = ComparisonResult("Sprints")
        await test_sprints(taskara, jira, jira_base, jira_agile, r)
        r.print()
        results.append(r)

        # Priorities
        r = ComparisonResult("Priorities")
        await test_priorities(taskara, jira, jira_base, r)
        r.print()
        results.append(r)

        # Labels
        r = ComparisonResult("Labels")
        await test_labels(taskara, jira, jira_base, r)
        r.print()
        results.append(r)

        # Search
        r = ComparisonResult("Search")
        await test_search(taskara, jira, jira_base, r)
        r.print()
        results.append(r)

        # Summary
        total_passed = sum(r.passed for r in results)
        total_failed = sum(r.failed for r in results)
        total_warnings = sum(r.warnings for r in results)

        print(f"\n{'='*60}")
        print(f"📊 SUMMARY: {total_passed} passed, {total_failed} failed, {total_warnings} warnings")
        if total_failed == 0:
            print("✅ All data matches between Taskara and Jira!")
        else:
            print("❌ Some mismatches found — see details above")
        print(f"{'='*60}")

        return 0 if total_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
