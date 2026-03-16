# ADR-009: Vite manualChunks Code Splitting

**Status**: Accepted
**Date**: 2026-03-11
**Deciders**: Abdelkrim BOUJRAF

## Context

The initial bundle reached 1,165KB — over double Vite's 500KB warning threshold. Heavy dependencies (TipTap, Recharts, dnd-kit) inflate the main chunk.

## Decision

Use Vite `manualChunks` in `vite.config.ts` to split vendor libraries into separate chunks:

| Chunk | Contents | Size |
|-------|----------|------|
| `index` | App code | 300KB |
| `vendor-tiptap` | @tiptap/* + prosemirror-* | 374KB |
| `vendor-charts` | recharts + d3-* | 395KB |
| `vendor-dnd` | @dnd-kit/* | 43KB |
| `vendor-query` | @tanstack/react-query | 50KB |
| **Total** | | **1,163KB** (349KB gzipped) |

## Why Not React.lazy()?

Single-file architecture (ADR-001) means no component files to lazy-load. `manualChunks` splits vendors without requiring component extraction.

## Consequences

**Good**: Initial load ~300KB, vendors cached separately, parallel loading.
**Bad**: All vendor chunks still load on first page visit. True route-level splitting would require component file extraction.
