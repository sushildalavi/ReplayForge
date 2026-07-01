from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.convergence import build_convergence_report
from app.database import get_db
from app.schemas import ConvergenceOut

router = APIRouter(tags=["convergence"])

DbDep = Annotated[Session, Depends(get_db)]


@router.get("/api/convergence")
def get_convergence(db: DbDep) -> ConvergenceOut:
    return ConvergenceOut.model_validate(build_convergence_report(db).to_dict())
