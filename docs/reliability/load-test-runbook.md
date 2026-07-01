# Load Test Runbook

## Commands

```bash
docker compose up -d --scale go-worker=3
python3 scripts/load_test.py --events 200 --concurrency 20
```

## Key Metrics

- Ingestion throughput (events/sec)
- Median and tail ingestion latency
- End-to-end latency under retries
- Active worker count returned by API
