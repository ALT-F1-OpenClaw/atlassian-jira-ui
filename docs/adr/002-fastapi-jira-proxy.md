# ADR-002: FastAPI Backend as Jira API Proxy

**Status**: Accepted
**Date**: 2026-03-11
**Deciders**: Abdelkrim BOUJRAF

## Context

The frontend needs to communicate with Jira Cloud REST API v3. Direct browser-to-Jira calls would expose API tokens in the frontend and face CORS restrictions.

## Decision

Use a Python FastAPI backend as a reverse proxy to Jira's API. The backend holds credentials and normalizes responses.

## Rationale

- API tokens never reach the browser
- Backend normalizes Jira's verbose responses into lean shapes (`_format_issue()`)
- CORS handled at one point
- Async httpx client for non-blocking Jira calls
- Easy to add caching, rate limiting, auth later
- Pydantic for request validation

## Consequences

**Good**: Secure credential handling, normalized API contract, async performance, easy to extend with OAuth 2.0 later.
**Bad**: Extra hop adds latency (~10-50ms), requires running two services, Python dependency management.
