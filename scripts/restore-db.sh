#!/usr/bin/env bash
# Postgres restore script — restore from a gzipped dump.
# Usage: ./scripts/restore-db.sh ./backups/replayforge-20260505T100000Z.sql.gz
set -euo pipefail

FILE="${1:?usage: $0 <backup.sql.gz>}"

if [ ! -f "$FILE" ]; then
  echo "ERROR: file not found: $FILE" >&2
  exit 1
fi

echo "→ restoring $FILE → postgres (replayforge)"
gunzip -c "$FILE" | docker compose exec -T postgres \
  psql -U replayforge -d replayforge -v ON_ERROR_STOP=1

echo "✓ restore complete"
