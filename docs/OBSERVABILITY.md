# Observability Guide — Taskara

Implement distributed tracing, metrics, logging, and alerting across the Taskara stack.

**Roadmap**: Task #53 — OpenTelemetry

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Observability Stack                        │
│                                                              │
│  ┌─────────┐   ┌──────────┐   ┌───────────┐   ┌─────────┐  │
│  │ Grafana  │   │  Loki    │   │ Prometheus│   │  Tempo  │  │
│  │ :3000    │   │ (logs)   │   │ (metrics) │   │(traces) │  │
│  └────┬─────┘   └────┬─────┘   └────┬──────┘   └────┬────┘  │
│       │              │              │              │         │
│       └──────────────┴──────────────┴──────────────┘         │
│                          ▲                                    │
│                          │ OTLP (gRPC :4317)                 │
│                   ┌──────┴───────┐                           │
│                   │  OTel        │                           │
│                   │  Collector   │                           │
│                   └──────┬───────┘                           │
│                          │                                    │
│            ┌─────────────┼─────────────┐                     │
│            ▼             ▼             ▼                      │
│      ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│      │ Backend  │  │ Frontend │  │ Traefik/ │               │
│      │ FastAPI  │  │ nginx    │  │cloudflared│               │
│      └──────────┘  └──────────┘  └──────────┘               │
└──────────────────────────────────────────────────────────────┘
```

**Stack**: Grafana LGTM (Loki + Grafana + Tempo + Mimir/Prometheus) — all open source, Docker-based.

---

## 1. Backend Instrumentation (FastAPI)

### 1.1 Dependencies

```bash
# Add to backend/requirements.txt
opentelemetry-api>=1.25.0
opentelemetry-sdk>=1.25.0
opentelemetry-exporter-otlp-proto-grpc>=1.25.0
opentelemetry-instrumentation-fastapi>=0.46b0
opentelemetry-instrumentation-httpx>=0.46b0
opentelemetry-instrumentation-redis>=0.46b0
opentelemetry-instrumentation-logging>=0.46b0
```

### 1.2 Initialization (`backend/app/telemetry.py`)

```python
"""OpenTelemetry instrumentation for Taskara backend."""

import logging
import os
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor

logger = logging.getLogger(__name__)

OTEL_ENDPOINT = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4317")


def init_telemetry(app, version: str):
    """Initialize OpenTelemetry tracing + metrics."""
    if not os.getenv("OTEL_ENABLED", "").lower() in ("1", "true"):
        logger.info("OpenTelemetry disabled (set OTEL_ENABLED=true to enable)")
        return

    resource = Resource.create({
        SERVICE_NAME: "taskara-backend",
        SERVICE_VERSION: version,
        "deployment.environment": os.getenv("APP_ENV", "development"),
    })

    # Traces
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=OTEL_ENDPOINT, insecure=True))
    )
    trace.set_tracer_provider(tracer_provider)

    # Metrics
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint=OTEL_ENDPOINT, insecure=True),
        export_interval_millis=30000,
    )
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    # Auto-instrument
    FastAPIInstrumentor.instrument_app(app)
    HTTPXClientInstrumentor().instrument()  # Jira API calls
    RedisInstrumentor().instrument()        # Session store

    logger.info("OpenTelemetry initialized → %s", OTEL_ENDPOINT)


# ── Custom Metrics ────────────────────────────────────────────

def get_meter():
    return metrics.get_meter("taskara.backend")

# Example counters (add in routers):
# meter = get_meter()
# jira_api_calls = meter.create_counter("jira.api.calls", description="Jira API calls")
# auth_logins = meter.create_counter("auth.logins", description="OAuth login attempts")
# issues_created = meter.create_counter("issues.created", description="Issues created")
```

### 1.3 Integration in `main.py`

```python
from .telemetry import init_telemetry
from .version import __version__

# After app = FastAPI(...)
init_telemetry(app, __version__)
```

### 1.4 Custom Metrics to Track

| Metric | Type | Description |
|--------|------|-------------|
| `jira.api.calls` | Counter | Total Jira API calls (by endpoint, status) |
| `jira.api.latency` | Histogram | Jira API response time (ms) |
| `jira.api.errors` | Counter | Jira API errors (by status code) |
| `jira.api.rate_limited` | Counter | 429 responses from Jira |
| `auth.logins` | Counter | OAuth login attempts (success/failure) |
| `auth.refreshes` | Counter | Token refresh attempts |
| `auth.sessions.active` | Gauge | Current active sessions |
| `issues.created` | Counter | Issues created through Taskara |
| `issues.transitioned` | Counter | Status transitions |
| `sprints.viewed` | Counter | Sprint dashboard views |
| `search.queries` | Counter | Command palette searches |
| `http.requests` | Counter | Total HTTP requests (auto via FastAPI instrumentation) |
| `http.latency` | Histogram | Request latency (auto) |

### 1.5 Structured Logging

```python
# Replace basic logging with structured JSON logs
import json
import logging

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": "taskara-backend",
        }
        if record.exc_info:
            log["exception"] = self.formatException(record.exc_info)
        # Add trace context if available
        span = trace.get_current_span()
        if span.is_recording():
            ctx = span.get_span_context()
            log["trace_id"] = format(ctx.trace_id, "032x")
            log["span_id"] = format(ctx.span_id, "016x")
        return json.dumps(log)
```

---

## 2. Frontend Instrumentation (optional)

### 2.1 Real User Monitoring (RUM)

```typescript
// frontend/src/telemetry.ts
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';

export function initTelemetry() {
  if (!import.meta.env.VITE_OTEL_ENABLED) return;

  const provider = new WebTracerProvider({
    resource: { attributes: { 'service.name': 'taskara-frontend' } },
  });

  provider.addSpanProcessor(
    new SimpleSpanProcessor(
      new OTLPTraceExporter({ url: '/api/otel/traces' })
    )
  );

  provider.register({ contextManager: new ZoneContextManager() });

  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: [/\/api\//],
      }),
    ],
  });
}
```

### 2.2 Frontend Metrics to Track

| Metric | Description |
|--------|-------------|
| Page load time | Time to interactive |
| API call latency | Fetch duration per endpoint |
| Errors | JavaScript exceptions |
| Navigation | View switches (list/board/sprint/dashboard) |
| Offline events | Online/offline transitions |
| Cache hit rate | React Query cache hits vs network fetches |

---

## 3. Docker Compose — Observability Stack

```yaml
# docker-compose.observability.yml
# Run alongside the main docker-compose.yml
# docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d

services:
  # ── OpenTelemetry Collector ──
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    container_name: taskara-otel
    restart: unless-stopped
    ports:
      - "127.0.0.1:4317:4317"   # OTLP gRPC
      - "127.0.0.1:4318:4318"   # OTLP HTTP
    volumes:
      - ./observability/otel-collector.yml:/etc/otelcol-contrib/config.yaml:ro

  # ── Grafana (dashboards) ──
  grafana:
    image: grafana/grafana:latest
    container_name: taskara-grafana
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"   # SSH tunnel access
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-taskara}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
      - ./observability/grafana/provisioning:/etc/grafana/provisioning:ro

  # ── Prometheus (metrics) ──
  prometheus:
    image: prom/prometheus:latest
    container_name: taskara-prometheus
    restart: unless-stopped
    volumes:
      - ./observability/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus

  # ── Loki (logs) ──
  loki:
    image: grafana/loki:latest
    container_name: taskara-loki
    restart: unless-stopped
    volumes:
      - loki-data:/loki

  # ── Tempo (traces) ──
  tempo:
    image: grafana/tempo:latest
    container_name: taskara-tempo
    restart: unless-stopped
    volumes:
      - ./observability/tempo.yml:/etc/tempo/config.yaml:ro
      - tempo-data:/var/tempo

volumes:
  grafana-data:
  prometheus-data:
  loki-data:
  tempo-data:
```

---

## 4. Configuration Files

### 4.1 OTel Collector (`observability/otel-collector.yml`)

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024

exporters:
  otlphttp/tempo:
    endpoint: http://tempo:4318
  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write
  loki:
    endpoint: http://loki:3100/loki/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/tempo]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheusremotewrite]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [loki]
```

### 4.2 Prometheus (`observability/prometheus.yml`)

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:8889']
```

### 4.3 Tempo (`observability/tempo.yml`)

```yaml
server:
  http_listen_port: 3200

distributor:
  receivers:
    otlp:
      protocols:
        http:
        grpc:

storage:
  trace:
    backend: local
    local:
      path: /var/tempo/traces
    wal:
      path: /var/tempo/wal

metrics_generator:
  storage:
    path: /var/tempo/metrics
```

---

## 5. Grafana Dashboards

### 5.1 Taskara Overview Dashboard

| Panel | Query | Type |
|-------|-------|------|
| Request Rate | `rate(http_server_request_count[5m])` | Time series |
| Error Rate | `rate(http_server_request_count{http_status_code=~"5.."}[5m])` | Time series |
| P95 Latency | `histogram_quantile(0.95, rate(http_server_duration_bucket[5m]))` | Time series |
| Active Sessions | `auth_sessions_active` | Stat |
| Jira API Calls | `rate(jira_api_calls_total[5m])` | Time series |
| Jira API Latency | `histogram_quantile(0.95, rate(jira_api_latency_bucket[5m]))` | Time series |
| Jira Rate Limits | `rate(jira_api_rate_limited_total[5m])` | Time series |
| OAuth Logins | `rate(auth_logins_total[1h])` | Bar gauge |
| Issues Created | `increase(issues_created_total[24h])` | Stat |

### 5.2 Infrastructure Dashboard

| Panel | Query | Type |
|-------|-------|------|
| Container CPU | Docker metrics | Time series |
| Container Memory | Docker metrics | Time series |
| Redis Memory | `redis_memory_used_bytes` | Gauge |
| Redis Connections | `redis_connected_clients` | Stat |

### 5.3 Alerting Rules

```yaml
# Grafana alert rules
groups:
  - name: taskara-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_server_request_count{http_status_code=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High 5xx error rate ({{ $value }}/s)"

      - alert: JiraAPIDown
        expr: rate(jira_api_errors_total[5m]) > 1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Jira API errors increasing"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_server_duration_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P95 latency above 2s"

      - alert: RedisDown
        expr: up{job="redis"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis is down — sessions will fail"
```

---

## 6. Environment Variables

```env
# Add to .env
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
GRAFANA_PASSWORD=your-secure-password
```

---

## 7. Implementation Steps

| Step | Task | Effort |
|------|------|--------|
| 1 | Add OTel dependencies to `requirements.txt` | 5 min |
| 2 | Create `backend/app/telemetry.py` | 30 min |
| 3 | Add `init_telemetry(app)` to `main.py` | 5 min |
| 4 | Add custom metrics to key endpoints | 1 hour |
| 5 | Create `observability/` config files | 30 min |
| 6 | Create `docker-compose.observability.yml` | 15 min |
| 7 | Set up Grafana dashboards | 1 hour |
| 8 | Configure alert rules | 30 min |
| 9 | Structured JSON logging | 30 min |
| 10 | Frontend RUM (optional) | 2 hours |
| **Total** | | **~6 hours** |

---

## 8. Resource Requirements

| Component | RAM | Disk |
|-----------|-----|------|
| OTel Collector | ~50 MB | — |
| Grafana | ~100 MB | ~500 MB |
| Prometheus | ~200 MB | ~1 GB/month |
| Loki | ~100 MB | ~500 MB/month |
| Tempo | ~100 MB | ~500 MB/month |
| **Total** | **~550 MB** | **~2.5 GB/month** |

Recommended: add 2 GB RAM to VPS if running full stack.
