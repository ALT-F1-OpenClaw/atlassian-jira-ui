# ADR-006: Workbox NetworkFirst for Offline Caching

**Status**: Accepted
**Date**: 2026-03-11
**Deciders**: Abdelkrim BOUJRAF

## Context

As a PWA, the app should work offline — show cached data and queue mutations for sync on reconnect.

## Decision

- **Static assets**: Workbox precache (service worker)
- **API responses**: Workbox `NetworkFirst` strategy (24h expiry, max 200 entries, 5s network timeout)
- **Offline mutations**: Custom IndexedDB queue (`jira-ui-offline` → `mutations` store)
- **Sync**: Auto-replay queue on `online` event

## Consequences

**Good**: App loads offline, recent data visible from cache, mutations don't get lost.
**Bad**: Service worker intercepts API calls — must be disabled in E2E tests (blocks Playwright route mocking). Stale data risk if offline for >24h.

## E2E Test Workaround

Block `sw.js`, `registerSW.js`, `workbox-*.js` via `page.route()` fulfilling empty JS responses.
