"""
Guardrails API routes.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.models.db_models import GuardrailViolation, Repository
from backend.models.schemas import GuardrailViolationResponse

router = APIRouter(prefix="/api/guardrails", tags=["guardrails"])


@router.get("/{repo_id}/violations", response_model=List[GuardrailViolationResponse])
@router.get("/{repo_id}", response_model=List[GuardrailViolationResponse])
def get_violations(
    repo_id: str,
    severity: Optional[str] = Query(None, description="Filter by severity: HIGH, MEDIUM, LOW"),
    status: Optional[str] = Query(None, description="Filter by status: open, resolved, ignored"),
    db: Session = Depends(get_db),
):
    """Get all guardrail violations for a repository."""
    query = db.query(GuardrailViolation).filter(
        GuardrailViolation.repository_id == repo_id
    )
    if severity:
        query = query.filter(GuardrailViolation.severity == severity.upper())
    if status:
        query = query.filter(GuardrailViolation.status == status.lower())

    return query.order_by(GuardrailViolation.severity).all()


@router.get("/{repo_id}/summary")
def get_violations_summary(repo_id: str, db: Session = Depends(get_db)):
    """Get a summary of violations grouped by severity."""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    violations = db.query(GuardrailViolation).filter(
        GuardrailViolation.repository_id == repo_id
    ).all()

    summary = {"HIGH": 0, "MEDIUM": 0, "LOW": 0, "total": len(violations)}
    for v in violations:
        summary[v.severity] = summary.get(v.severity, 0) + 1

    return {
        "repository_id": repo_id,
        "summary": summary,
        "open_violations": sum(1 for v in violations if v.status == "open"),
        "resolved_violations": sum(1 for v in violations if v.status == "resolved"),
    }


from pydantic import BaseModel

class StatusUpdateRequest(BaseModel):
    status: Optional[str] = None

@router.patch("/{repo_id}/violations/{violation_id}/status")
def update_violation_status(
    repo_id: str,
    violation_id: str,
    status: Optional[str] = Query(None),
    body: Optional[StatusUpdateRequest] = None,
    db: Session = Depends(get_db),
):
    """Update the status of a violation (open, resolved, ignored)."""
    target_status = status or (body.status if body else None)
    if not target_status or target_status not in ("open", "resolved", "ignored"):
        raise HTTPException(status_code=400, detail="Status must be: open, resolved, or ignored")

    violation = db.query(GuardrailViolation).filter(
        GuardrailViolation.id == violation_id,
        GuardrailViolation.repository_id == repo_id,
    ).first()
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")

    violation.status = target_status
    db.commit()
    return {"message": f"Violation status updated to '{target_status}'", "status": target_status, "id": violation_id}
