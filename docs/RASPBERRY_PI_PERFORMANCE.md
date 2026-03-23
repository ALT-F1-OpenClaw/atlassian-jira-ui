# Raspberry Pi 4 Performance Report

Performance data for the Jira UI deployment on Raspberry Pi 4 Model B Rev 1.4.

## Hardware

| Spec | Value |
|------|-------|
| **Model** | Raspberry Pi 4 Model B Rev 1.4 |
| **CPU** | BCM2711, Quad-core ARM Cortex-A72 (64-bit, 1.8GHz) |
| **RAM** | 8 GB LPDDR4 |
| **Storage** | 64 GB microSD (57 GB usable, 41% used) |
| **OS** | Debian GNU/Linux 13 (trixie), kernel 6.12.62+rpt-rpi-v8 |
| **Architecture** | aarch64 (ARM64) |
| **Network** | Ethernet + Tailscale VPN |

## Current Resource Usage (March 23, 2026)

### CPU

| Core | User % | System % | Idle % |
|------|--------|----------|--------|
| Core 0 | 0.0% | 2.0% | 98.0% |
| Core 1 | 4.0% | 4.0% | 92.0% |
| Core 2 | 2.0% | 0.0% | 98.0% |
| Core 3 | 2.0% | 1.0% | 97.0% |
| **Average** | **2.0%** | **1.8%** | **96.2%** |

**Load average**: 0.17, 0.22, 0.27 (1min, 5min, 15min) — very light.

**CPU temperature**: 60.4°C — normal operating range (throttling at 80°C).

### Memory

| Type | Total | Used | Available |
|------|-------|------|-----------|
| RAM | 7.6 GB | 2.6 GB (34%) | 5.1 GB |
| Swap | 2.0 GB | 0 B (0%) | 2.0 GB |

### Disk

| Filesystem | Size | Used | Available | Use% |
|------------|------|------|-----------|------|
| Root (`/`) | 57 GB | 22 GB | 33 GB | 41% |

**Disk I/O**: ~2.35 operations/sec average — very low. SD card is not a bottleneck for this workload.

### Docker Containers

| Container | CPU % | Status |
|-----------|-------|--------|
| prod-backend | 0.20% | Running |
| prod-frontend | 0.00% | Running |
| dev-backend | 0.19% | Running |
| dev-frontend | 0.00% | Running |
| traefik | 0.00% | Running |
| watchtower | 0.00% | Running (healthy) |
| **Total** | **~0.4%** | 6/6 containers |

## Observations

### CPU Usage Pattern

The Pi runs at **~2-4% CPU** during normal operation (serving API requests, nginx static files). Spikes occur during:

1. **Docker image pulls** (Watchtower updates) — CPU spikes to ~30-50% for 1-2 minutes during ARM64 image decompression
2. **Test runs** (`npm test`) — CPU at ~80-100% for ~2 minutes (255 Vitest tests + JSDOM)
3. **TypeScript compilation** (`tsc --noEmit`) — CPU at ~50% for ~30 seconds
4. **Git operations** — CPU at ~20% during pushes with pre-commit hooks

### Memory Usage Breakdown (estimated)

| Service | RAM |
|---------|-----|
| Docker daemon | ~200 MB |
| 2x FastAPI backends | ~150 MB each |
| 2x Nginx frontends | ~20 MB each |
| Traefik | ~50 MB |
| Watchtower | ~30 MB |
| OpenClaw agent | ~300 MB |
| Node.js (when running tests/dev) | ~500-800 MB |
| System + OS | ~800 MB |
| **Total active** | **~2.0-2.6 GB** |

**Headroom**: ~5 GB available — could run 2-3x more containers.

### Uptime

- **Current boot**: March 22, 2026 (00:41 CET) — 25+ hours uptime
- **Docker installed**: March 16, 2026
- **Systemd service**: `jira-ui.service` enabled — auto-starts containers on boot
- **No crashes observed** since deployment

### SD Card Considerations

- microSD has limited write endurance (~100K write cycles for consumer cards)
- Docker layer writes, log rotation, and session files contribute to wear
- **Mitigation**: Session files are small JSON (<10 KB), log rotation is handled by Docker
- **Future**: Consider USB SSD boot for production longevity

## Performance vs VPS Comparison

| Metric | Raspberry Pi 4 | Contabo VPS (4 vCPU) |
|--------|---------------|---------------------|
| CPU speed | 1.8 GHz ARM | 2.4+ GHz x86_64 |
| Single-core perf | ~200 (Geekbench) | ~800 (Geekbench) |
| RAM | 8 GB | 4-8 GB |
| Storage | SD card (~25 MB/s) | SSD (~500 MB/s) |
| Docker pull time | ~60 sec | ~10 sec |
| Test suite time | ~130 sec | ~30 sec |
| API response time | ~50-200ms | ~10-50ms |
| Cost | €0/mo (own hardware) | €5-10/mo |
| Uptime SLA | None | 99.9% |

## Recommendations

1. **Current setup is fine** for development and small-team usage
2. **Move to VPS** for production with external users (see `docs/PRODUCTION_DEPLOYMENT.md`)
3. **USB SSD** recommended if keeping the Pi long-term (avoids SD card wear)
4. **Monitoring**: Install `netdata` or `Prometheus + Grafana` for historical metrics (roadmap #53)
5. **Swap**: Currently 0% used — the 8 GB RAM is sufficient for 6 containers

## How to Monitor

```bash
# Real-time CPU/memory
htop

# Per-container stats
docker stats

# CPU temperature
cat /sys/class/thermal/thermal_zone0/temp  # divide by 1000 for °C

# Disk usage
df -h /

# Historical CPU (requires sysstat)
sar -u
```
