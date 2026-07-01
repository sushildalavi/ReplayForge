from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.redis_streams import GROUP, RETRY_ZSET, STREAM_INCOMING, STREAM_RETRY, get_redis
from app.models import Event, EventAttempt, Worker

@dataclass(frozen=True)
class ConvergenceReport:
    total_events: int
    processed_events: int
    acknowledged_events: int
    received_events: int
    queued_events: int
    processing_events: int
    retrying_events: int
    dead_lettered_events: int
    pending_events: int
    retry_queue_depth: int
    retry_stream_depth: int
    incoming_stream_depth: int
    stream_backlog: int
    dlq_events: int
    orphaned_records: int
    duplicate_deliveries: int
    duplicate_side_effects: int
    recent_failures: int
    active_workers: int
    stale_workers: int
    worker_heartbeat_age_seconds: float | None
    convergence_state: str
    converged: bool
    convergence_issues: list[str]
    verified_at: datetime

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _worker_heartbeat_age_seconds(workers: list[Worker]) -> float | None:
    if not workers:
        return None
    now = datetime.now(timezone.utc)
    ages: list[float] = []
    for worker in workers:
        hb = worker.last_heartbeat_at
        if hb.tzinfo is None:
            hb = hb.replace(tzinfo=timezone.utc)
        ages.append((now - hb).total_seconds())
    return round(max(ages), 1)


def build_convergence_report(db: Session) -> ConvergenceReport:
    status_rows = db.execute(
        select(Event.status, func.count(Event.id)).group_by(Event.status)
    ).all()
    counts = {row[0]: int(row[1]) for row in status_rows}

    total_events = sum(counts.values())
    received_events = counts.get("received", 0)
    queued_events = counts.get("queued", 0)
    processing_events = counts.get("processing", 0)
    retrying_events = counts.get("retrying", 0)
    dead_lettered_events = counts.get("dead_lettered", 0)

    processed_events = db.execute(
        select(func.count(func.distinct(EventAttempt.event_id)))
    ).scalar() or 0

    acknowledged_events = total_events - (received_events + queued_events + processing_events)
    if acknowledged_events < 0:
        acknowledged_events = 0

    recent_cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)
    recent_failures = db.execute(
        select(func.count(EventAttempt.id)).where(
            EventAttempt.status == "failed",
            EventAttempt.finished_at.isnot(None),
            EventAttempt.finished_at >= recent_cutoff,
        )
    ).scalar() or 0

    retry_queue_depth = 0
    incoming_stream_depth = 0
    retry_stream_depth = 0
    pending_events = 0
    try:
        r = get_redis()
        retry_queue_depth = int(r.zcard(RETRY_ZSET))
        incoming_stream_depth = int(r.xlen(STREAM_INCOMING))
        retry_stream_depth = int(r.xlen(STREAM_RETRY))
        pending_events = int((r.xpending(STREAM_INCOMING, GROUP) or {}).get("pending", 0)) + int(
            (r.xpending(STREAM_RETRY, GROUP) or {}).get("pending", 0)
        )
    except Exception:
        pass

    stream_backlog = incoming_stream_depth + retry_stream_depth + retry_queue_depth + pending_events

    workers = db.query(Worker).all()
    active_workers = sum(1 for w in workers if w.status in ("active", "busy"))
    now = datetime.now(timezone.utc)
    stale_workers = sum(
        1
        for w in workers
        if (now - (w.last_heartbeat_at.replace(tzinfo=timezone.utc) if w.last_heartbeat_at.tzinfo is None else w.last_heartbeat_at)).total_seconds() > 30
    )
    worker_heartbeat_age_seconds = _worker_heartbeat_age_seconds(workers)

    orphaned_records = db.execute(
        select(func.count(Worker.id))
        .select_from(Worker)
        .outerjoin(Event, Worker.current_event_id == Event.id)
        .where(Worker.current_event_id.isnot(None), Event.id.is_(None))
    ).scalar() or 0

    duplicate_deliveries = db.execute(
        select(func.coalesce(func.sum(func.greatest(Event.attempt_count - 1, 0)), 0)).select_from(Event)
    ).scalar() or 0

    duplicate_side_effects = db.execute(
        select(func.count())
        .select_from(
            select(EventAttempt.event_id)
            .where(EventAttempt.status == "succeeded")
            .group_by(EventAttempt.event_id)
            .having(func.count(EventAttempt.id) > 1)
            .subquery()
        )
    ).scalar() or 0

    convergence_issues: list[str] = []
    if pending_events > 0:
        convergence_issues.append(f"{pending_events} pending stream entries")
    if retrying_events > 0:
        convergence_issues.append(f"{retrying_events} events waiting on retry")
    if queued_events > 0 or processing_events > 0 or received_events > 0:
        convergence_issues.append(
            f"{received_events + queued_events + processing_events} in-flight database rows"
        )
    if orphaned_records > 0:
        convergence_issues.append(f"{orphaned_records} orphaned worker claim(s)")
    if duplicate_side_effects > 0:
        convergence_issues.append(f"{duplicate_side_effects} duplicate side effect(s)")
    converged = not convergence_issues
    if converged:
        convergence_state = "converged"
    elif orphaned_records > 0 or duplicate_side_effects > 0:
        convergence_state = "degraded"
    else:
        convergence_state = "recovering"

    return ConvergenceReport(
        total_events=total_events,
        processed_events=int(processed_events),
        acknowledged_events=int(acknowledged_events),
        received_events=received_events,
        queued_events=queued_events,
        processing_events=processing_events,
        retrying_events=retrying_events,
        dead_lettered_events=dead_lettered_events,
        pending_events=int(pending_events),
        retry_queue_depth=int(retry_queue_depth),
        retry_stream_depth=int(retry_stream_depth),
        incoming_stream_depth=int(incoming_stream_depth),
        stream_backlog=int(stream_backlog),
        dlq_events=dead_lettered_events,
        orphaned_records=int(orphaned_records),
        duplicate_deliveries=int(duplicate_deliveries),
        duplicate_side_effects=int(duplicate_side_effects),
        recent_failures=int(recent_failures),
        active_workers=active_workers,
        stale_workers=stale_workers,
        worker_heartbeat_age_seconds=worker_heartbeat_age_seconds,
        convergence_state=convergence_state,
        converged=converged,
        convergence_issues=convergence_issues,
        verified_at=now,
    )
