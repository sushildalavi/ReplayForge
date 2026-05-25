#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import time
import uuid

import redis

STREAM = os.getenv("CHAOS_STREAM", "workflow_events")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
TOTAL = int(os.getenv("CHAOS_TOTAL_EVENTS", "100000"))


def seed_events() -> None:
    client = redis.from_url(REDIS_URL, decode_responses=True)
    t0 = time.perf_counter()

    for i in range(TOTAL):
        event_uuid = str(uuid.uuid4())
        pipeline_id = str(uuid.uuid4())
        payload = {
            "event_uuid": event_uuid,
            "pipeline_id": pipeline_id,
            "sequence": i,
            "payload": json.dumps({"kind": "chaos", "idx": i}),
        }
        client.xadd(STREAM, payload)

        if i > 0 and i % 10000 == 0:
            print(f"seeded={i}")

    elapsed = time.perf_counter() - t0
    print(f"seed_complete total={TOTAL} elapsed_s={elapsed:.2f}")


if __name__ == "__main__":
    seed_events()
