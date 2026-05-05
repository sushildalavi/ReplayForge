from __future__ import annotations

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Event, EventAttempt
from app.schemas import WorkflowSummaryOut, WorkflowTimelineEventOut, WorkflowTimelineOut

router = APIRouter(tags=["workflows"])
log = logging.getLogger(__name__)

DbDep = Annotated[Session, Depends(get_db)]


@router.get("/api/workflows")
def list_workflows(db: DbDep, limit: int = 50, offset: int = 0) -> list[WorkflowSummaryOut]:
    rows = db.execute(
        select(
            Event.workflow_id,
            func.count(Event.id).label("total_events"),
            func.sum((Event.status == "succeeded").cast(int)).label("succeeded"),
            func.sum((Event.status.in_(["failed", "dead_lettered"])).cast(int)).label("failed"),
            func.sum((Event.status == "dead_lettered").cast(int)).label("dead_lettered"),
            func.sum((Event.status.in_(["queued", "processing", "retrying", "received"])).cast(int)).label("in_flight"),
            func.max(Event.updated_at).label("last_updated_at"),
        )
        .group_by(Event.workflow_id)
        .order_by(func.max(Event.updated_at).desc())
        .limit(limit)
        .offset(offset)
    ).all()

    return [
        WorkflowSummaryOut(
            workflow_id=r.workflow_id,
            total_events=r.total_events,
            succeeded=r.succeeded or 0,
            failed=r.failed or 0,
            dead_lettered=r.dead_lettered or 0,
            in_flight=r.in_flight or 0,
            has_failures=(r.dead_lettered or 0) > 0 or (r.failed or 0) > 0,
            last_updated_at=r.last_updated_at,
        )
        for r in rows
    ]


@router.get("/api/workflows/{workflow_id}/timeline")
def get_workflow_timeline(workflow_id: str, db: DbDep) -> WorkflowTimelineOut:
    events = db.execute(
        select(Event)
        .options(selectinload(Event.attempts))
        .where(Event.workflow_id == workflow_id)
        .order_by(Event.created_at)
    ).scalars().all()

    if not events:
        raise HTTPException(status_code=404, detail="workflow not found")

    event_outs = []
    for ev in events:
        sorted_attempts = sorted(ev.attempts, key=lambda a: a.attempt_number)
        event_outs.append(WorkflowTimelineEventOut.model_validate({**ev.__dict__, "attempts": sorted_attempts}))

    return WorkflowTimelineOut(workflow_id=workflow_id, events=event_outs)


@router.get("/api/workflows/{workflow_id}")
def get_workflow(workflow_id: str, db: DbDep) -> WorkflowSummaryOut:
    row = db.execute(
        select(
            Event.workflow_id,
            func.count(Event.id).label("total_events"),
            func.sum((Event.status == "succeeded").cast(int)).label("succeeded"),
            func.sum((Event.status.in_(["failed", "dead_lettered"])).cast(int)).label("failed"),
            func.sum((Event.status == "dead_lettered").cast(int)).label("dead_lettered"),
            func.sum((Event.status.in_(["queued", "processing", "retrying", "received"])).cast(int)).label("in_flight"),
            func.max(Event.updated_at).label("last_updated_at"),
        )
        .where(Event.workflow_id == workflow_id)
        .group_by(Event.workflow_id)
    ).one_or_none()

    if not row:
        raise HTTPException(status_code=404, detail="workflow not found")

    return WorkflowSummaryOut(
        workflow_id=row.workflow_id,
        total_events=row.total_events,
        succeeded=row.succeeded or 0,
        failed=row.failed or 0,
        dead_lettered=row.dead_lettered or 0,
        in_flight=row.in_flight or 0,
        has_failures=(row.dead_lettered or 0) > 0 or (row.failed or 0) > 0,
        last_updated_at=row.last_updated_at,
    )
