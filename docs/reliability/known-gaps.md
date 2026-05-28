# Known Gaps and Next Fix Targets

- Redis drained with partial Postgres completion can still occur under abrupt process death windows; continue validating durability boundaries with clean-slate `down -v` chaos runs.
- Distributed exactly-once is not guaranteed; keep external messaging at **at-least-once with idempotent convergence**.
- End-to-end chaos/load benchmarks should remain release gates before deploy promotion.

## Recently Addressed

- Janitor reclaim now respects configured `minIdle` thresholds (no hard override).
- Worker `XACK` failures are now treated as retryable failures instead of being ignored.
- CI now includes Go worker build/tests in addition to backend/frontend checks.
