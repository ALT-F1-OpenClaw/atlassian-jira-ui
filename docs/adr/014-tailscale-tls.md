# ADR-014: Tailscale TLS Certificates

**Status**: Accepted
**Date**: 2026-03-16
**Deciders**: Abdelkrim BOUJRAF

## Context

HTTPS is required for PWA install prompts and secure API communication. The app runs on a private Tailscale network — no public DNS.

## Decision

Use `tailscale cert` to generate TLS certificates for `atlf1be-raspberry-pi-4.tail981e59.ts.net`. Certificates mounted into the Traefik container.

## Certificate Management

- Generated via: `sudo tailscale cert atlf1be-raspberry-pi-4.tail981e59.ts.net`
- Stored at: `/srv/atlassian-jira-ui/traefik/*.crt` and `*.key`
- Certificates auto-renewed by Tailscale (90-day Let's Encrypt certs)
- Traefik reads them on startup and on file change (watch mode)

## Consequences

**Good**: Free, auto-renewed TLS. No public DNS or Let's Encrypt ACME needed. Trusted by all browsers on Tailscale network.
**Bad**: Only accessible within Tailscale tailnet. No public internet access without Tailscale Funnel.
