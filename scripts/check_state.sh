#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "== Redis Group =="
docker compose exec -T redis redis-cli XINFO GROUPS workflow_events

echo "\n== Redis Pending =="
docker compose exec -T redis redis-cli XPENDING workflow_events replay_forge_workers

echo "\n== Postgres Status Counts =="
docker compose exec -T postgres psql -U replayforge_cp -d replayforge -c "SELECT status, COUNT(*) FROM event_idempotency_registry GROUP BY status ORDER BY status;"
