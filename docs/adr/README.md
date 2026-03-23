# Architectural Decision Records (ADRs)

This directory contains the Architectural Decision Records for the atlassian-jira-ui project.

ADRs document significant architectural decisions made during the project, including context, decision rationale, and consequences.

## Format

Each ADR follows the [MADR](https://adr.github.io/madr/) format:
- **Status**: Proposed / Accepted / Deprecated / Superseded
- **Context**: What is the issue we're seeing?
- **Decision**: What did we decide?
- **Consequences**: What are the trade-offs?

## Index

| # | Title | Status | Date |
|---|-------|--------|------|
| 001 | [React single-file architecture](001-react-single-file.md) | Accepted | 2026-03-11 |
| 002 | [FastAPI backend as Jira API proxy](002-fastapi-jira-proxy.md) | Accepted | 2026-03-11 |
| 003 | [TipTap for rich text editing](003-tiptap-rich-text.md) | Accepted | 2026-03-11 |
| 004 | [dnd-kit for drag-and-drop](004-dnd-kit-drag-drop.md) | Accepted | 2026-03-11 |
| 005 | [CSS variable palette for dark/light mode](005-css-variable-theming.md) | Accepted | 2026-03-11 |
| 006 | [Workbox NetworkFirst for offline caching](006-workbox-offline.md) | Accepted | 2026-03-11 |
| 007 | [BDD test naming convention](007-bdd-test-naming.md) | Accepted | 2026-03-11 |
| 008 | [Docker multi-arch images on GHCR](008-docker-ghcr.md) | Accepted | 2026-03-11 |
| 009 | [Vite manualChunks code splitting](009-code-splitting.md) | Accepted | 2026-03-11 |
| 010 | [CI auto-fix workflow](010-ci-autofix.md) | Accepted | 2026-03-11 |
| 011 | [SearchableSelect custom dropdown](011-searchable-select.md) | Accepted | 2026-03-12 |
| 012 | [Traefik + Docker Compose for production](012-traefik-docker-production.md) | Accepted | 2026-03-16 |
| 013 | [Port-based environment separation](013-port-based-environments.md) | Accepted | 2026-03-16 |
| 014 | [Tailscale TLS certificates](014-tailscale-tls.md) | Accepted | 2026-03-16 |
| 015 | [No server-side Jira data storage](015-no-server-jira-storage.md) | Accepted | 2026-03-11 |
| 016 | [Platform API fallback for sprints](016-platform-api-sprint-fallback.md) | Accepted | 2026-03-23 |
| 017 | [Dual auth — Strategy Pattern with production mode](017-dual-auth-strategy.md) | Accepted | 2026-03-22 |
| 018 | [Jira URL construction rules](018-jira-url-construction.md) | Accepted | 2026-03-23 |
