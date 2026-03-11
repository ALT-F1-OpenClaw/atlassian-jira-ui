"""Atlassian Jira UI — FastAPI Backend.

A modern, fast proxy to Jira Cloud REST API v3.
Keeps credentials server-side, serves clean JSON to the frontend.

Author: Abdelkrim BOUJRAF <abdelkrim@alt-f1.be>
License: MIT
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .jira_client import close_client
from .routers import projects, issues, boards, search, priorities, labels, sprints
from .version import __version__


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_client()


app = FastAPI(
    title="Atlassian Jira UI",
    description="Modern alternative frontend for Jira Cloud",
    version=__version__,
    lifespan=lifespan,
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(issues.router)
app.include_router(boards.router)
app.include_router(search.router)
app.include_router(priorities.router)
app.include_router(labels.router)
app.include_router(sprints.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": __version__}
