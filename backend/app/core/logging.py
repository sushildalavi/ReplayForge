from __future__ import annotations

import json
import logging
import sys
import time
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.config import settings

# Per-request correlation ID (set by middleware)
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")


class JsonFormatter(logging.Formatter):
    """Structured JSON log formatter — production-grade observability."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": request_id_ctx.get(),
            "service": "replayforge-backend",
            "env": settings.environment,
            "worker": settings.worker_name if "worker" in record.name else None,
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        # Attach any structured `extra=` fields
        for key, value in record.__dict__.items():
            if key not in {
                "name","msg","args","levelname","levelno","pathname","filename",
                "module","exc_info","exc_text","stack_info","lineno","funcName",
                "created","msecs","relativeCreated","thread","threadName",
                "processName","process","message",
            }:
                payload[key] = value
        return json.dumps({k: v for k, v in payload.items() if v is not None})


class TextFormatter(logging.Formatter):
    """Human-readable formatter for local development."""

    def __init__(self) -> None:
        super().__init__(
            fmt="%(asctime)s %(levelname)-5s [%(name)s] %(message)s",
            datefmt="%H:%M:%S",
        )


def setup_logging() -> None:
    fmt: logging.Formatter
    if settings.log_format == "json":
        fmt = JsonFormatter()
    else:
        fmt = TextFormatter()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(fmt)

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(settings.log_level.upper())

    # Quiet noisy libraries in prod
    for lib in ("httpx", "uvicorn.access", "sqlalchemy.engine"):
        logging.getLogger(lib).setLevel(logging.WARNING)


def make_request_id() -> str:
    return uuid4().hex[:16]
