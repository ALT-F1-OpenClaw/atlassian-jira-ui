# ADR-004: dnd-kit for Drag-and-Drop

**Status**: Accepted
**Date**: 2026-03-11
**Deciders**: Abdelkrim BOUJRAF

## Context

The Kanban board needs drag-and-drop to move issues between status columns, triggering Jira status transitions.

## Alternatives Considered

1. **react-beautiful-dnd** — deprecated by Atlassian, no React 19 support
2. **@dnd-kit/core** — modern, accessible, touch-friendly, React 18/19 compatible
3. **HTML5 drag API** — no touch support, poor mobile experience

## Decision

Use `@dnd-kit/core` with PointerSensor (5px activation distance) and TouchSensor (250ms delay).

## Consequences

**Good**: Small bundle (43KB), works on mobile/touch, accessible (keyboard drag), React 19 compatible.
**Bad**: Mobile Kanban still needed ← → arrow button fallback for small screens where drag is awkward.
