# ADR-003: TipTap for Rich Text Editing

**Status**: Accepted
**Date**: 2026-03-11
**Deciders**: Abdelkrim BOUJRAF

## Context

Jira stores descriptions in Atlassian Document Format (ADF), a JSON-based rich text format. We need bidirectional conversion: render ADF → display, and edit → ADF for saving.

## Alternatives Considered

1. **Plain textarea** — no formatting, loses ADF structure
2. **Slate.js** — powerful but complex API, steep learning curve
3. **TipTap** — ProseMirror-based, React-native, extensible, good docs

## Decision

Use TipTap with custom ADF↔TipTap conversion. Always show TipTap editor (never plain textarea fallback).

## ADF Mark Mappings

| ADF Mark | TipTap Mark |
|----------|-------------|
| bold | strong |
| italic | em |
| strike | strike |
| code | code |
| link | link (href only) |

## Consequences

**Good**: Full rich text editing, proper ADF round-tripping, toolbar with bold/italic/headings/lists/links/code.
**Bad**: Large bundle addition (~374KB vendor-tiptap chunk), ProseMirror learning curve for custom extensions.
