# ReplayForge

**Async Workflow Replay & Failure Debugging Platform**

A developer platform that ingests workflow events, processes them through Redis Streams worker pools with retries and exponential backoff, tracks failures in a dead-letter queue, and exposes a dashboard for inspecting workflow timelines and replaying failed events.

ReplayForge uses AI only for incident summary generation. Retry behavior, replay semantics, and failure classification are deterministic and testable.

---

## Architecture

```
Demo Checkout Simulator
        │
        ▼
FastAPI Ingestion API (/api/events)
  • validates payload
  • checks idempotency key (app_id + key unique constraint)
  • stores event in PostgreSQL (status: received → queued)
  • publishes event_id to Redis Streams (events:incoming)
        │
        ▼
Redis Streams: events:incoming
        │
        ▼
Worker pool (consumer group: replayforge-workers)
  • XREADGROUP reads events
  • simulates processing (failure rates by event type)
  • on success: status → succeeded, XACK
  • on failure: increment attempt_count, write EventAttempt
      ├── if attempts < max → ZADD retry zset, status → retrying
      └── if attempts ≥ max → insert DeadLetter, status → dead_lettered
        │
    RetryScheduler (in-process background thread)
  • polls ZRANGEBYSCORE every 1s
  • XADD events:retry when due
        │
        ▼
PostgreSQL event store
        │
        ▼
FastAPI Dashboard API
        │
        ▼
React dashboard (localhost:5173)
```

## Event Lifecycle

```
received → queued → processing → succeeded

         ↘ processing → failed → retrying → processing → failed → dead_lettered
                                                                         ↓
                                                                   (replay)
                                                                    queued → processing → succeeded
```

## Event Statuses

| Status | Meaning |
|--------|---------|
| `received` | Ingested, not yet queued |
| `queued` | Published to Redis stream |
| `processing` | Worker picked up |
| `succeeded` | Processed successfully |
| `failed` | Processing failed, will retry |
| `retrying` | Scheduled for retry |
| `dead_lettered` | Max attempts exceeded |
| `replayed` | Requeued from DLQ |
| `cancelled` | Manually cancelled |

---

## Redis Streams Design

Three streams:
- `events:incoming` — new events from the ingestion API
- `events:retry` — events re-queued by the retry scheduler
- `events:deadletter` — terminal failures (audit only)

Consumer group: `replayforge-workers`

Retry scheduling uses a Redis sorted set `events:retry:zset` (score = unix timestamp). A background thread polls every 1s and moves due entries into `events:retry`. This avoids DB polling, is durable across restarts, and requires no extra service.

---

## Idempotency Strategy

Every event has a unique `(application_id, idempotency_key)` constraint in PostgreSQL. On duplicate ingestion:
- The existing event is returned with `duplicate: true`
- No second publish to Redis
- Safe to retry POST /api/events from producers

---

## Retry Policy

| Attempt | Delay |
|---------|-------|
| 1 | 0s (immediate) |
| 2 | ~10s (±20% jitter) |
| 3 | ~30s (±20% jitter) |
| 4 | ~60s (±20% jitter) |
| 5+ | → dead_lettered |

Configured via `MAX_ATTEMPTS` env var (default 4).

---

## Replay Semantics

Replaying a dead letter **does not** create a new event or break idempotency. Instead:

1. A new `EventAttempt` row is inserted (linked via `metadata.replay_of_dead_letter_id`)
2. The original event's `status` is reset to `queued`
3. The event is re-published to `events:incoming`
4. `DeadLetter.replayed_at` and `replay_status` are updated

The idempotency key is untouched — the original event row is reused, preserving the full attempt history.

---

## Synthetic Workload Generator

`POST /api/demo/generate-workload?count=N` creates N synthetic checkout workflows:

```
checkout.started  → payment.authorized  → inventory.reserved  → email.receipt_sent  → shipment.created
```

Server-side failure rates (seeded RNG keyed on `event_id:attempt_count` for reproducibility):

| Event Type | Fail Rate |
|-----------|-----------|
| `payment.authorized` | 15% |
| `inventory.reserved` | 10% |
| `email.receipt_sent` | 25% |
| Worker crash | 5% per event |

Worker crashes are recovered via `XAUTOCLAIM` on restart — orphaned PEL entries are reclaimed after 60s idle.

---

## Quickstart

```bash
git clone https://github.com/sushildalavi/ReplayForge-Async-Workflow-Replay-Failure-Debugging-Platform.git
cd ReplayForge-Async-Workflow-Replay-Failure-Debugging-Platform
cp backend/.env.example backend/.env
docker compose up -d
```

Open http://localhost:5173

Generate workload:
```bash
curl -X POST 'http://localhost:8000/api/demo/generate-workload?count=30'
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | postgres://... | PostgreSQL connection string |
| `REDIS_URL` | redis://redis:6379/0 | Redis connection string |
| `ANTHROPIC_API_KEY` | *(empty)* | Optional. Leave blank for free template summaries |
| `WORKER_NAME` | `worker-1` | Unique worker identity |
| `MAX_ATTEMPTS` | `4` | Attempts before dead-lettering |
| `LOG_LEVEL` | `INFO` | Log verbosity |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |

---

## Running Tests

```bash
docker compose exec backend pytest app/tests/ -v
```

All 14 tests should pass:
- `test_duplicate_idempotency_key_returns_existing_event`
- `test_new_event_is_published_to_stream`
- `test_retry_policy_returns_expected_backoff`
- `test_event_moves_to_deadletter_after_max_attempts`
- `test_replay_requeues_deadletter_event`
- `test_worker_heartbeat_marks_worker_active`
- `test_stale_worker_detection`
- `test_workflow_timeline_ordering`
- *(and 6 more)*

---

## Free-Tier Deployment

### Postgres → Neon (free tier)
```bash
# Sign up at neon.tech, create project, copy connection string
export DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"
```

### Redis → Upstash (free tier)
```bash
# Sign up at upstash.com, create Redis database, copy TLS URL
export REDIS_URL="rediss://default:pass@host:port"
```

### Backend → Google Cloud Run
```bash
cd backend
gcloud run deploy replayforge-backend --source . \
  --set-env-vars DATABASE_URL=$DATABASE_URL,REDIS_URL=$REDIS_URL \
  --allow-unauthenticated --region us-central1
```

### Worker → Cloud Run (separate service)
```bash
gcloud run deploy replayforge-worker --source . \
  --command python,-m,app.workers.worker \
  --set-env-vars DATABASE_URL=$DATABASE_URL,REDIS_URL=$REDIS_URL,WORKER_NAME=worker-1 \
  --region us-central1 --no-allow-unauthenticated
```

### Frontend → Vercel
```bash
# In Vercel dashboard: connect repo, set root to frontend/
# Add env var: VITE_API_BASE_URL=https://your-cloud-run-url
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/events` | Ingest event (idempotent) |
| GET | `/api/events/{id}` | Get event with attempts |
| GET | `/api/workflows` | List all workflows |
| GET | `/api/workflows/{id}` | Workflow summary |
| GET | `/api/workflows/{id}/timeline` | Full event timeline |
| GET | `/api/deadletters` | List dead letters |
| POST | `/api/deadletters/{id}/replay` | Replay dead letter |
| GET | `/api/workers` | Worker health (stale detection) |
| GET | `/api/metrics` | Aggregate metrics + percentiles |
| POST | `/api/demo/generate-workload` | Generate synthetic workload |
| POST | `/api/incidents/{workflow_id}/summarize` | AI incident summary |

---

## Dashboard Pages

- **Dashboard** — live metrics tiles + workflow table (5s polling)
- **Workflow Detail** — vertical event timeline with attempt history, AI summarize button
- **Dead Letters** — table with one-click replay
- **Worker Health** — heartbeat status, stale detection

---

## Limitations / Out of Scope (v1)

- No authentication or authorization
- Single-tenant (one `demo-checkout` application)
- No WebSockets — UI polls every 5s
- No Prometheus / OpenTelemetry
- No cursor-based pagination (offset/limit only)
- Replay is one-at-a-time
- Single retry policy (no per-event-type overrides)
- `cancelled` status reserved but not exposed via API
- No CI/CD pipeline

---

## Screenshots

> *(add screenshots of Dashboard, WorkflowDetail, and DeadLetters pages)*

`docs/screenshots/dashboard.png`
`docs/screenshots/timeline.png`
`docs/screenshots/deadletters.png`
