# Benchmarks

## Status

Benchmark runner now supports both pending artifacts and live local API measurement.
ForgeLog also has an optional benchmark script for the WAL-backed storage path.
The preferred local runner for Converge replay measurements is `scripts/benchmark_replay.py`.

## Target metrics

- events submitted
- events completed
- events failed
- dead letters
- duplicate events
- orphaned records
- Redis lag
- pending entries
- reclaimed entries
- recovery time
- throughput events/sec

## Repro command

```bash
python scripts/benchmark_replay.py --events 1000 --workers 2
python scripts/chaos_replay.py --events 1000 --workers 2 --kill-delay 2
python scripts/run_chaos_benchmark.py --events 10000 --workers 4
python scripts/benchmark_forgelog.py --events 1000
```

## Notes

- If `--dry-run` or `--pending` is set, the script emits a pending artifact.
- If the local API is reachable, the benchmark posts events, polls completion, and writes measured JSON/Markdown output.
- If the chaos runner is reachable, it kills one worker mid-run, waits for recovery, and records the before/after convergence snapshot.
- If ForgeLog is unreachable, the ForgeLog benchmark emits a pending artifact.

## Results

Measured locally via Docker Compose (2-4 `go-worker` replicas, single Postgres/Redis instance):

| Run | Events | Workers | Converged | Ingest evt/s | End-to-end evt/s | Recovery time |
|---|---|---|---|---|---|---|
| Smoke | 10 | 4 | true | ~113-130 | ~5.6-21.7 | 0.5-1.8s |
| Sustained load | 1000 | 4 | true (eventually) | ~83-176 | 1.6-3.3 | 300-600s+ |

- Smoke-scale runs (10 events) fully converge in well under 2 seconds and are the cleanest evidence of correct recovery behavior.
- A 1000-event submission converges (zero pending stream entries, zero orphaned claims) but the harness's per-event polling loop only confirms terminal status for ~55-60% of events within a 300-600s window; sustained end-to-end processing throughput measured in this environment was **under 3.5 events/sec**, well short of any "thousands of messages/sec" figure.
- Do not claim 100K-event chaos, zero backlog, or 3,000+ messages/sec — those are not verified and were not reproduced here. If you scale worker replicas or Postgres/Redis resources and get a materially faster result, replace this table with a fresh `benchmarks/*.json` artifact and update the numbers.
