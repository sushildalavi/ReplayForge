#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

for i in {1..30}; do
  status=$(docker compose ps --format json 2>/dev/null | tr -d '\n' || true)
  if echo "$status" | grep -q '"Service":"postgres"' && echo "$status" | grep -q '"State":"running"'; then
    echo "postgres container is running"
    exit 0
  fi
  sleep 1
done

echo "timed out waiting for postgres container"
exit 1
