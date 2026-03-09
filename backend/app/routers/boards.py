"""Board & Sprint endpoints (Jira Agile API)."""

from fastapi import APIRouter
from ..jira_client import jira_request

router = APIRouter(prefix="/api/boards", tags=["boards"])


@router.get("")
async def list_boards(project: str | None = None):
    """List Scrum/Kanban boards."""
    params = {}
    if project:
        params["projectKeyOrId"] = project
    data = await jira_request("GET", "/board", base="agile", params=params)
    return {
        "boards": [
            {
                "id": b["id"],
                "name": b["name"],
                "type": b.get("type", ""),
                "projectKey": b.get("location", {}).get("projectKey", ""),
            }
            for b in (data or {}).get("values", [])
        ]
    }


@router.get("/{board_id}")
async def get_board(board_id: int):
    """Get board configuration with columns."""
    config = await jira_request("GET", f"/board/{board_id}/configuration", base="agile")
    columns = []
    for col in (config or {}).get("columnConfig", {}).get("columns", []):
        statuses = [s.get("id") for s in col.get("statuses", [])]
        columns.append({
            "name": col["name"],
            "statusIds": statuses,
        })
    return {
        "id": board_id,
        "name": (config or {}).get("name", ""),
        "columns": columns,
    }


@router.get("/{board_id}/sprint")
async def get_active_sprint(board_id: int):
    """Get active sprint with issues."""
    sprints = await jira_request(
        "GET", f"/board/{board_id}/sprint", base="agile", params={"state": "active"}
    )
    values = (sprints or {}).get("values", [])
    if not values:
        return {"sprint": None, "issues": []}

    sprint = values[0]
    issues = await jira_request(
        "GET",
        f"/sprint/{sprint['id']}/issue",
        base="agile",
        params={"maxResults": 100},
    )

    return {
        "sprint": {
            "id": sprint["id"],
            "name": sprint["name"],
            "state": sprint.get("state"),
            "startDate": sprint.get("startDate"),
            "endDate": sprint.get("endDate"),
            "goal": sprint.get("goal", ""),
        },
        "issues": [
            {
                "id": i["id"],
                "key": i["key"],
                "summary": i.get("fields", {}).get("summary", ""),
                "status": i.get("fields", {}).get("status", {}).get("name", ""),
                "statusCategory": i.get("fields", {}).get("status", {}).get("statusCategory", {}).get("key", ""),
                "priority": (i.get("fields", {}).get("priority") or {}).get("name", ""),
                "assignee": (i.get("fields", {}).get("assignee") or {}).get("displayName", ""),
                "assigneeAvatar": (i.get("fields", {}).get("assignee") or {}).get("avatarUrls", {}).get("24x24", ""),
                "type": (i.get("fields", {}).get("issuetype") or {}).get("name", ""),
                "typeIcon": (i.get("fields", {}).get("issuetype") or {}).get("iconUrl", ""),
                "storyPoints": i.get("fields", {}).get("story_points"),
            }
            for i in (issues or {}).get("issues", [])
        ],
    }
