# ADR-005: CSS Variable Palette for Dark/Light Mode

**Status**: Accepted
**Date**: 2026-03-11
**Deciders**: Abdelkrim BOUJRAF

## Context

The app needs dark and light modes. Tailwind CSS 4 uses the `dark:` variant, but our zinc palette needs complete inversion for light mode to maintain WCAG AA contrast.

## Decision

Override the zinc color palette via CSS custom properties in `index.css`. In light mode, the palette is flipped: zinc-950 becomes white, zinc-100 becomes near-black.

## Light Mode Mapping

| Variable | Dark Value | Light Value |
|----------|-----------|-------------|
| --color-zinc-950 | #09090b | #ffffff |
| --color-zinc-900 | #18181b | #f8f8f9 |
| --color-zinc-400 | #a1a1aa | #3f3f46 |
| --color-zinc-200 | #e4e4e7 | #18181b |
| --color-zinc-100 | #f4f4f5 | #09090b |

## Consequences

**Good**: Single set of Tailwind classes works in both modes. WCAG AA contrast (4.5:1 minimum). No `dark:` prefix needed for most elements.
**Bad**: Must test every view in both modes. Custom palette means Tailwind documentation examples don't map directly.
