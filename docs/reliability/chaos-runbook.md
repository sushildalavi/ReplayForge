# Chaos Benchmark Runbook

## Commands

```bash
docker compose down -v --remove-orphans
docker compose up --build -d
python3 tests/benchmark_chaos.py
```

## Success Criteria

- Redis group lag is 0
- Redis pending count is 0
- PostgreSQL `event_idempotency_registry` completed rows reach expected total
