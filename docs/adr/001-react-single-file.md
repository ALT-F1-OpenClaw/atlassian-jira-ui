# ADR-001: React Single-File Architecture

**Status**: Accepted
**Date**: 2026-03-11
**Deciders**: Abdelkrim BOUJRAF

## Context

The frontend UI needs to be built rapidly with many interconnected components (list view, board view, sprint dashboard, issue detail, modals, filters). Traditional React architecture splits each component into its own file.

## Decision

Keep all UI in a single file (`frontend/src/App.tsx`) until complexity demands splitting.

## Rationale

- Faster iteration — no switching between files during rapid development
- All state flows visible in one place
- AI-assisted coding works better with single-file context
- Components share types and constants without import/export ceremony
- Can split later when needed (explicitly asked for)

## Consequences

**Good**: Rapid development, easy to understand full data flow, no circular dependency issues.
**Bad**: Large file (~5000 lines), IDE performance may degrade, harder for multi-developer teams. Code splitting for lazy loading requires explicit component extraction.

**Mitigated by**: Vite's `manualChunks` handles vendor bundle splitting without component file splitting.
