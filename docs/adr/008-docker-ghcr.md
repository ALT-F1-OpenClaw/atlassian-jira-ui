# ADR-008: Docker Multi-Arch Images on GHCR

**Status**: Accepted
**Date**: 2026-03-11
**Deciders**: Abdelkrim BOUJRAF

## Context

The app runs on Raspberry Pi 4 (ARM64) and CI runs on x86_64. Need images that work on both architectures.

## Decision

- Publish to GitHub Container Registry (GHCR) on tag push
- Multi-arch builds: `linux/amd64` + `linux/arm64` via QEMU + Buildx
- Tags: `:latest`, `:1.x.0`, `:1.x`
- Workflow: `.github/workflows/publish-docker.yml`

## Images

- `ghcr.io/alt-f1-openclaw/atlassian-jira-ui-backend`
- `ghcr.io/alt-f1-openclaw/atlassian-jira-ui-frontend`

## Consequences

**Good**: Single `docker pull` works on any architecture. No manual builds on Pi. CI-verified images.
**Bad**: Multi-arch builds via QEMU are slow (~5 min). GHCR requires GitHub token for private repos (ours is public).
