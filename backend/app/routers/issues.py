"""Issue endpoints."""

import logging
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
import httpx
from slowapi import Limiter
from slowapi.util import get_remote_address
from ..jira_client import jira_request
from ..deps import authed_jira_request
from ..config import get_settings

limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/issues", tags=["issues"])


def _extract_adf_text(adf: dict | None) -> str:
    """Extract plain text from Atlassian Document Format."""
    if not adf or not isinstance(adf, dict):
        return ""
    texts = []
    for node in adf.get("content", []):
        if node.get("type") == "paragraph":
            for inline in node.get("content", []):
                if inline.get("type") == "text":
                    texts.append(inline.get("text", ""))
        elif node.get("type") in ("heading", "codeBlock", "blockquote"):
            for inline in node.get("content", []):
                if inline.get("type") == "text":
                    texts.append(inline.get("text", ""))
    return "\n".join(texts)


def _format_issue(issue: dict) -> dict:
    """Normalize a Jira issue to a clean frontend shape."""
    fields = issue.get("fields", {})
    return {
        "id": issue["id"],
        "key": issue["key"],
        "summary": fields.get("summary", ""),
        "description": _extract_adf_text(fields.get("description")),
        "descriptionAdf": fields.get("description"),
        "status": {
            "name": fields.get("status", {}).get("name", ""),
            "category": fields.get("status", {}).get("statusCategory", {}).get("key", ""),
        },
        "priority": {
            "name": (fields.get("priority") or {}).get("name", ""),
            "iconUrl": (fields.get("priority") or {}).get("iconUrl", ""),
        },
        "type": {
            "name": (fields.get("issuetype") or {}).get("name", ""),
            "iconUrl": (fields.get("issuetype") or {}).get("iconUrl", ""),
        },
        "assignee": _format_user(fields.get("assignee")),
        "reporter": _format_user(fields.get("reporter")),
        "project": {
            "key": (fields.get("project") or {}).get("key", ""),
            "name": (fields.get("project") or {}).get("name", ""),
        },
        "labels": fields.get("labels", []),
        "created": fields.get("created"),
        "updated": fields.get("updated"),
        "dueDate": fields.get("duedate"),
    }


def _format_user(user: dict | None) -> dict | None:
    if not user:
        return None
    return {
        "accountId": user.get("accountId"),
        "displayName": user.get("displayName", ""),
        "avatarUrl": user.get("avatarUrls", {}).get("48x48", ""),
    }


SORT_FIELD_MAP = {
    "key": "key",
    "type": "issuetype",
    "summary": "summary",
    "status": "status",
    "priority": "priority",
    "assignee": "assignee",
    "updated": "updated",
}


@router.get("")
async def list_issues(
    request: Request,
    project: str | None = None,
    status: str | None = None,
    assignee: str | None = None,
    type: str | None = None,
    sort_by: str = Query(default="updated"),
    sort_order: str = Query(default="DESC"),
    start_at: int = Query(default=0, ge=0),
    max_results: int = Query(default=50, le=200),
):
    """List issues with optional filters."""
    jql_parts = []
    if project:
        jql_parts.append(f'project = "{project}"')
    if status:
        jql_parts.append(f'status = "{status}"')
    if assignee:
        jql_parts.append(
            "assignee = currentUser()" if assignee == "me" else f'assignee = "{assignee}"'
        )
    if type:
        jql_parts.append(f'issuetype = "{type}"')

    jql = " AND ".join(jql_parts) if jql_parts else "created IS NOT EMPTY"
    jql_field = SORT_FIELD_MAP.get(sort_by, "updated")
    order = "ASC" if sort_order.upper() == "ASC" else "DESC"
    jql += f" ORDER BY {jql_field} {order}"

    fields = "summary,description,status,priority,issuetype,assignee,reporter,project,labels,created,updated,duedate"
    data = await authed_jira_request(request,
        "GET",
        "/search/jql",
        params={"jql": jql, "startAt": start_at, "maxResults": max_results, "fields": fields},
    )

    issues = [_format_issue(i) for i in (data or {}).get("issues", [])]
    total = (data or {}).get("total", None)
    if total is None:
        total = len(issues)
    return {
        "issues": issues,
        "total": total,
    }


@router.get("/{key}")
async def get_issue(request: Request, key: str):
    """Get issue details."""
    data = await authed_jira_request(request, "GET", f"/issue/{key}", params={"expand": "transitions"})
    issue = _format_issue(data)
    issue["transitions"] = [
        {"id": t["id"], "name": t["name"]}
        for t in (data or {}).get("transitions", [])
    ]
    # Include time tracking fields
    fields = (data or {}).get("fields", {})
    tt = fields.get("timetracking", {}) or {}
    issue["timeTracking"] = {
        "originalEstimate": tt.get("originalEstimate", ""),
        "remainingEstimate": tt.get("remainingEstimate", ""),
        "timeSpent": tt.get("timeSpent", ""),
        "originalEstimateSeconds": tt.get("originalEstimateSeconds", 0),
        "remainingEstimateSeconds": tt.get("remainingEstimateSeconds", 0),
        "timeSpentSeconds": tt.get("timeSpentSeconds", 0),
    }
    return issue


class CreateIssueRequest(BaseModel):
    project: str
    summary: str
    description: str = ""
    issue_type: str = "Task"
    priority: str | None = None
    assignee: str | None = None


@router.post("")
@limiter.limit(get_settings().rate_limit_mutation)
async def create_issue(request: Request, req: CreateIssueRequest):
    """Create a new issue."""
    payload = {
        "fields": {
            "project": {"key": req.project},
            "summary": req.summary,
            "issuetype": {"name": req.issue_type},
        }
    }
    if req.description:
        payload["fields"]["description"] = {
            "type": "doc",
            "version": 1,
            "content": [
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": req.description}],
                }
            ],
        }
    if req.priority:
        payload["fields"]["priority"] = {"name": req.priority}
    if req.assignee:
        payload["fields"]["assignee"] = {"accountId": req.assignee}

    return await authed_jira_request(request, "POST", "/issue", json=payload)


class UpdateIssueRequest(BaseModel):
    summary: str | None = None
    description: str | None = None
    description_adf: dict | None = None
    priority: str | None = None
    assignee: str | None = None
    duedate: str | None = "__unset__"
    labels: list[str] | None = None


@router.patch("/{key}")
@limiter.limit(get_settings().rate_limit_mutation)
async def update_issue(request: Request, key: str, req: UpdateIssueRequest):
    """Update an issue."""
    fields = {}
    if req.summary:
        fields["summary"] = req.summary
    if req.description_adf is not None:
        fields["description"] = req.description_adf
    elif req.description is not None:
        fields["description"] = {
            "type": "doc",
            "version": 1,
            "content": [
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": req.description}],
                }
            ],
        }
    if req.priority:
        fields["priority"] = {"name": req.priority}
    if req.assignee:
        fields["assignee"] = {"accountId": req.assignee}
    if req.duedate != "__unset__":
        fields["duedate"] = req.duedate
    if req.labels is not None:
        fields["labels"] = req.labels

    try:
        await authed_jira_request(request, "PUT", f"/issue/{key}", json={"fields": fields})
    except httpx.HTTPStatusError as e:
        logger.error("Failed to update issue %s: %s", key, e.response.text)
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    return {"status": "ok", "key": key}


class TransitionRequest(BaseModel):
    transition_id: str


@router.post("/{key}/transition")
@limiter.limit(get_settings().rate_limit_mutation)
async def transition_issue(request: Request, key: str, req: TransitionRequest):
    """Transition an issue to a new status."""
    await authed_jira_request(request,
        "POST",
        f"/issue/{key}/transitions",
        json={"transition": {"id": req.transition_id}},
    )
    return {"status": "ok", "key": key}


class LogWorkRequest(BaseModel):
    timeSpent: str
    comment: str = ""


@router.post("/{key}/worklog")
@limiter.limit(get_settings().rate_limit_mutation)
async def log_work(request: Request, key: str, req: LogWorkRequest):
    """Log work on an issue."""
    payload: dict = {"timeSpent": req.timeSpent}
    if req.comment:
        payload["comment"] = {
            "type": "doc",
            "version": 1,
            "content": [
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": req.comment}],
                }
            ],
        }
    try:
        result = await authed_jira_request(request, "POST", f"/issue/{key}/worklog", json=payload)
        return {"status": "ok", "key": key, "worklog": result}
    except httpx.HTTPStatusError as e:
        logger.error("Failed to log work on %s: %s", key, e.response.text)
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)


def _format_worklog(entry: dict) -> dict:
    """Normalize a Jira worklog entry."""
    author = entry.get("author", {})
    return {
        "id": entry.get("id", ""),
        "timeSpent": entry.get("timeSpent", ""),
        "timeSpentSeconds": entry.get("timeSpentSeconds", 0),
        "comment": _extract_adf_text(entry.get("comment")),
        "created": entry.get("created", ""),
        "updated": entry.get("updated", ""),
        "author": {
            "accountId": author.get("accountId", ""),
            "displayName": author.get("displayName", ""),
            "avatarUrl": author.get("avatarUrls", {}).get("48x48", ""),
        },
    }


@router.get("/{key}/worklog")
async def get_worklogs(request: Request, key: str):
    """Get work logs for an issue."""
    data = await authed_jira_request(request, "GET", f"/issue/{key}/worklog")
    worklogs = [_format_worklog(w) for w in (data or {}).get("worklogs", [])]
    return {"worklogs": worklogs, "total": (data or {}).get("total", len(worklogs))}
