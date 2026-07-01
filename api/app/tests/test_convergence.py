from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.core import convergence as convergence_module
from app.core.convergence import build_convergence_report
from app.models import Application, Event, EventAttempt, Worker


class _RedisStub:
    def zcard(self, *_args, **_kwargs):
        return 4

    def xlen(self, stream):
        return 7 if stream.endswith("incoming") else 2

    def xpending(self, stream, _group):
        return {"pending": 3 if stream.endswith("incoming") else 1}


def _event(db, app_id, status: str, attempt_count: int = 0) -> Event:
    event = Event(
        application_id=app_id,
        workflow_id=f"wf-{uuid4().hex[:8]}",
        event_type="checkout.started",
        service_name="checkout-service",
        idempotency_key=uuid4().hex,
        status=status,
        attempt_count=attempt_count,
        payload_json={},
    )
    db.add(event)
    db.flush()
    return event


def test_convergence_report_surfaces_recovery_gaps(db, monkeypatch):
    app = Application(name=f"app-{uuid4().hex[:6]}")
    db.add(app)
    db.flush()

    succeeded = _event(db, app.id, "succeeded")
    retrying = _event(db, app.id, "retrying", attempt_count=1)
    dead = _event(db, app.id, "dead_lettered", attempt_count=4)
    queued = _event(db, app.id, "queued")
    processing = _event(db, app.id, "processing")

    now = datetime.now(timezone.utc)
    db.add_all(
        [
            EventAttempt(
                event_id=succeeded.id,
                attempt_number=1,
                worker_name="worker-a",
                status="succeeded",
                started_at=now - timedelta(seconds=4),
                finished_at=now - timedelta(seconds=3),
                duration_ms=120,
                metadata_json={},
            ),
            EventAttempt(
                event_id=succeeded.id,
                attempt_number=2,
                worker_name="worker-a",
                status="succeeded",
                started_at=now - timedelta(seconds=2),
                finished_at=now - timedelta(seconds=1),
                duration_ms=90,
                metadata_json={},
            ),
            EventAttempt(
                event_id=retrying.id,
                attempt_number=1,
                worker_name="worker-b",
                status="failed",
                error_message="boom",
                started_at=now - timedelta(minutes=1),
                finished_at=now - timedelta(minutes=1, seconds=1),
                duration_ms=250,
                metadata_json={},
            ),
        ]
    )
    db.add(Worker(worker_name="worker-a", status="active", last_heartbeat_at=now))
    db.add(Worker(worker_name="worker-b", status="busy", last_heartbeat_at=now - timedelta(seconds=45)))
    db.commit()

    monkeypatch.setattr(convergence_module, "get_redis", lambda: _RedisStub())

    report = build_convergence_report(db)

    assert report.total_events == 5
    assert report.processed_events == 2
    assert report.acknowledged_events == 3
    assert report.retrying_events == 1
    assert report.dlq_events == 1
    assert report.pending_events == 4
    assert report.stream_backlog == 17
    assert report.orphaned_records == 0
    assert report.duplicate_deliveries == 3
    assert report.duplicate_side_effects == 1
    assert report.converged is False
    assert report.convergence_state == "degraded"
    assert any("pending stream entries" in issue for issue in report.convergence_issues)
    assert report.worker_heartbeat_age_seconds is not None
