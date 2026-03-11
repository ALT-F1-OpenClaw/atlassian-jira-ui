"""Sprint endpoints (Jira Agile API)."""

from datetime import datetime, timezone
from fastapi import APIRouter, Query
from ..jira_client import jira_request

router = APIRouter(prefix="/api/sprints", tags=["sprints"])


@router.get("")
async def list_sprints(project: str | None = None):
    """List boards and their active sprints."""
    params = {}
    if project:
        params["projectKeyOrId"] = project
    boards_data = await jira_request("GET", "/board", base="agile", params=params)
    boards = (boards_data or {}).get("values", [])

    sprints = []
    for board in boards:
        board_id = board["id"]
        sprint_data = await jira_request(
            "GET",
            f"/board/{board_id}/sprint",
            base="agile",
            params={"state": "active"},
        )
        for s in (sprint_data or {}).get("values", []):
            sprints.append({
                "id": s["id"],
                "name": s["name"],
                "state": s.get("state"),
                "startDate": s.get("startDate"),
                "endDate": s.get("endDate"),
                "goal": s.get("goal", ""),
                "boardId": board_id,
                "boardName": board.get("name", ""),
            })
    return {"sprints": sprints}


@router.get("/{sprint_id}/issues")
async def get_sprint_issues(sprint_id: int):
    """Get sprint issues with status counts."""
    issues_data = await jira_request(
        "GET",
        f"/sprint/{sprint_id}/issue",
        base="agile",
        params={"maxResults": 200},
    )
    issues = (issues_data or {}).get("issues", [])

    status_counts: dict[str, int] = {}
    status_category_counts: dict[str, int] = {}
    formatted = []

    for i in issues:
        fields = i.get("fields", {})
        status_name = fields.get("status", {}).get("name", "Unknown")
        status_cat = fields.get("status", {}).get("statusCategory", {}).get("key", "undefined")

        status_counts[status_name] = status_counts.get(status_name, 0) + 1
        status_category_counts[status_cat] = status_category_counts.get(status_cat, 0) + 1

        story_points = fields.get("story_points") or fields.get("customfield_10016")

        formatted.append({
            "id": i["id"],
            "key": i["key"],
            "summary": fields.get("summary", ""),
            "status": status_name,
            "statusCategory": status_cat,
            "priority": (fields.get("priority") or {}).get("name", ""),
            "assignee": (fields.get("assignee") or {}).get("displayName", ""),
            "type": (fields.get("issuetype") or {}).get("name", ""),
            "storyPoints": story_points,
            "created": fields.get("created", ""),
        })

    return {
        "issues": formatted,
        "total": len(formatted),
        "statusCounts": [
            {"status": k, "count": v} for k, v in status_counts.items()
        ],
        "categoryCounts": {
            "todo": status_category_counts.get("new", 0),
            "inProgress": status_category_counts.get("indeterminate", 0),
            "done": status_category_counts.get("done", 0),
        },
    }


@router.get("/{sprint_id}/burndown")
async def get_sprint_burndown(
    sprint_id: int,
    board_id: int = Query(..., description="Board ID for sprint lookup"),
):
    """Get burndown data for a sprint.

    Calculates remaining issues over time based on sprint start/end dates
    and issue resolution. Since Jira Cloud doesn't expose raw burndown data
    via REST API, we approximate from sprint info + current issue states.
    """
    # Get sprint details
    sprint_data = await jira_request(
        "GET", f"/sprint/{sprint_id}", base="agile"
    )
    if not sprint_data:
        return {"burndown": [], "sprint": None}

    start_date = sprint_data.get("startDate", "")
    end_date = sprint_data.get("endDate", "")

    # Get sprint issues
    issues_data = await jira_request(
        "GET",
        f"/sprint/{sprint_id}/issue",
        base="agile",
        params={"maxResults": 200, "fields": "status,resolutiondate,created,story_points,customfield_10016"},
    )
    issues = (issues_data or {}).get("issues", [])

    total_issues = len(issues)

    # Parse dates
    try:
        sprint_start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        sprint_end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return {"burndown": [], "sprint": sprint_data}

    now = datetime.now(timezone.utc)
    current_end = min(sprint_end, now)

    # Build daily burndown: count resolved issues per day
    resolved_dates: list[datetime] = []
    for issue in issues:
        fields = issue.get("fields", {})
        status_cat = fields.get("status", {}).get("statusCategory", {}).get("key", "")
        if status_cat == "done":
            res_date = fields.get("resolutiondate") or fields.get("created", "")
            if res_date:
                try:
                    resolved_dates.append(
                        datetime.fromisoformat(res_date.replace("Z", "+00:00"))
                    )
                except ValueError:
                    pass

    # Generate daily data points
    burndown = []
    day = sprint_start
    from datetime import timedelta
    while day <= current_end:
        resolved_by_day = sum(1 for d in resolved_dates if d <= day)
        remaining = total_issues - resolved_by_day
        burndown.append({
            "date": day.strftime("%Y-%m-%d"),
            "remaining": max(remaining, 0),
            "ideal": round(
                total_issues * (1 - (day - sprint_start).total_seconds() / max((sprint_end - sprint_start).total_seconds(), 1)),
                1,
            ),
        })
        day += timedelta(days=1)

    return {
        "burndown": burndown,
        "sprint": {
            "id": sprint_data.get("id"),
            "name": sprint_data.get("name"),
            "startDate": start_date,
            "endDate": end_date,
            "totalIssues": total_issues,
        },
    }


@router.get("/{sprint_id}/velocity")
async def get_sprint_velocity(
    sprint_id: int,
    board_id: int = Query(..., description="Board ID for sprint lookup"),
):
    """Get velocity data: story points completed per recent sprint."""
    # Get recent closed sprints + active sprint from the board
    sprints_data = await jira_request(
        "GET",
        f"/board/{board_id}/sprint",
        base="agile",
        params={"state": "active,closed", "maxResults": 6},
    )
    sprints = (sprints_data or {}).get("values", [])

    # Sort by start date
    sprints.sort(key=lambda s: s.get("startDate", ""))

    # Take last 5 sprints max (including current)
    recent = sprints[-5:] if len(sprints) > 5 else sprints

    velocity = []
    for s in recent:
        sid = s["id"]
        issues_data = await jira_request(
            "GET",
            f"/sprint/{sid}/issue",
            base="agile",
            params={"maxResults": 200, "fields": "status,story_points,customfield_10016"},
        )
        issues = (issues_data or {}).get("issues", [])

        committed_points = 0.0
        completed_points = 0.0
        committed_count = len(issues)
        completed_count = 0

        for issue in issues:
            fields = issue.get("fields", {})
            points = fields.get("story_points") or fields.get("customfield_10016") or 0
            committed_points += float(points)
            status_cat = fields.get("status", {}).get("statusCategory", {}).get("key", "")
            if status_cat == "done":
                completed_points += float(points)
                completed_count += 1

        velocity.append({
            "sprintId": sid,
            "sprintName": s.get("name", ""),
            "state": s.get("state", ""),
            "committedPoints": committed_points,
            "completedPoints": completed_points,
            "committedCount": committed_count,
            "completedCount": completed_count,
        })

    return {"velocity": velocity}
