# Chaos Testing

Converge ships a local chaos runner that interrupts a live Go worker and verifies recovery.

## Recommended flow

```bash
docker compose up -d --build
python scripts/chaos_replay.py --events 1000 --workers 2 --kill-delay 2
```

## What it checks

- worker interruption mid-processing
- pending-entry recovery
- retry stream handling
- DLQ counts
- orphaned worker claims
- duplicate side effects
- final convergence state

## Optional larger run

```bash
python scripts/chaos_replay.py --events 10000 --workers 4 --kill-delay 2 --restart-delay 3
```

Not yet run to completion in this environment — see Measured results below for the largest run actually completed.

## Measured results

Measured locally via Docker Compose (4 `go-worker` replicas):

| Events | Killed workers | Converged | Recovery time | Pending after recovery | DLQ | Duplicate side effects |
|---|---|---|---|---|---|---|
| 10 | 1 | true | 1.78-3.82s | 0 | 0 | 0 |
| 100 | 1 | true | 5.29s | 0 | 0 | 0 |

A 1000-event chaos/benchmark attempt was tried at this scale but the harness's polling loop did not confirm terminal status for all events within a 600s window (sustained processing throughput measured under 3.5 events/sec in this environment) even though the system did fully converge (zero pending entries). 100 events is the largest run in this repository with a clean, fully-completed measured artifact.

## Honesty rule

- Do not claim 100K-event convergence, zero backlog at scale, or thousands of messages/sec unless the command above is actually run to completion and the artifact is checked into `benchmarks/`.
- The script writes optional JSON and Markdown artifacts for local inspection, but benchmark output files should not be committed unless they are intentional evidence.
