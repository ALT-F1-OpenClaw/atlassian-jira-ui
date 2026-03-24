"""Atlassian Jira UI — FastAPI Backend.

A modern, fast proxy to Jira Cloud REST API v3.
Keeps credentials server-side, serves clean JSON to the frontend.

Author: Abdelkrim BOUJRAF <abdelkrim@alt-f1.be>
License: MIT
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .config import get_settings
from .jira_client import close_client
from .routers import projects, issues, boards, search, priorities, labels, sprints, auth
from .routers import settings as settings_router
from .version import __version__


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_client()


settings = get_settings()

app = FastAPI(
    title="Atlassian Jira UI",
    description="Modern alternative frontend for Jira Cloud",
    version=__version__,
    lifespan=lifespan,
)

# Rate limiting per IP — configurable via env vars
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.rate_limit_api],
)
app.state.limiter = limiter


async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Custom 429 response with Retry-After header."""
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "detail": f"Too many requests. Limit: {exc.detail}",
        },
        headers={"Retry-After": "60"},
    )


app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)

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
app.include_router(settings_router.router)
app.include_router(auth.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": __version__}
