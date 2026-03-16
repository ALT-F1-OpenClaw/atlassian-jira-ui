# ADR-011: SearchableSelect Custom Dropdown

**Status**: Accepted
**Date**: 2026-03-12
**Deciders**: Abdelkrim BOUJRAF

## Context

Native `<select>` elements don't support type-to-filter search. With many projects, team members, and filter options, users need autocomplete.

## Decision

Build a custom `SearchableSelect` React component replacing 7 native `<select>` elements:

1. Project filter (header)
2. Type filter
3. Status filter
4. Assignee filter
5. Create issue modal — project
6. Create issue modal — assignee
7. Bulk assign

Plus `InlineEditSelect` (priority, assignee in issue detail) uses `autoOpen` prop to open dropdown immediately on edit click.

## UX

- Click button → opens dropdown with search input
- Type to filter options
- Arrow keys ↑↓ to navigate, Enter to select, Escape to close
- Selected option highlighted in blue
- "No matches" when search yields nothing

## Test Impact

- `selectOptions()` (Testing Library) replaced with `selectSearchableOption()` custom helper
- Tests click button → find `role="listbox"` → click option by text
- `Element.prototype.scrollIntoView` mocked for JSDOM

## Consequences

**Good**: Type-to-search in all dropdowns, keyboard accessible, consistent UX.
**Bad**: 23 test rewrites needed, custom component to maintain, no native form integration.
