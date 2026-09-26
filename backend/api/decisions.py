"""
Decision Memory API routes.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.models.db_models import TechnicalDecision
from backend.models.schemas import (
    TechnicalDecisionCreate,
    TechnicalDecisionResponse,
    DecisionFromTextRequest,
)
from backend.services.decision_service import create_decision, extract_decision_from_text

router = APIRouter(prefix="/api/decisions", tags=["decisions"])


@router.get("", response_model=List[TechnicalDecisionResponse])
@router.get("/", response_model=List[TechnicalDecisionResponse])
def get_all_decisions(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get all technical decisions across repositories or for latest repository."""
    query = db.query(TechnicalDecision)
    if status:
        query = query.filter(TechnicalDecision.status == status)
    return query.order_by(TechnicalDecision.decision_date.desc()).all()


@router.get("/{repo_id}", response_model=List[TechnicalDecisionResponse])
def get_decisions(
    repo_id: str,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get all technical decisions for a repository."""
    query = db.query(TechnicalDecision).filter(
        TechnicalDecision.repository_id == repo_id
    )
    if status:
        query = query.filter(TechnicalDecision.status == status)
    return query.order_by(TechnicalDecision.decision_date.desc()).all()


@router.post("/{repo_id}", response_model=TechnicalDecisionResponse, status_code=201)
def create_new_decision(
    repo_id: str,
    decision_data: TechnicalDecisionCreate,
    db: Session = Depends(get_db),
):
    """Create a new technical decision manually."""
    return create_decision(db, repo_id, decision_data.model_dump())


@router.post("/{repo_id}/extract", response_model=TechnicalDecisionResponse)
def extract_decision(
    repo_id: str,
    request: DecisionFromTextRequest,
    db: Session = Depends(get_db),
):
    """
    Extract a structured decision from free-form text.
    
    Accepts commit messages, PR descriptions, meeting notes, or discussion threads
    and produces a structured TechnicalDecision.
    """
    extracted = extract_decision_from_text(request.text)
    if not extracted.get("title"):
        raise HTTPException(
            status_code=400,
            detail="Could not extract a decision title from the provided text"
        )
    return create_decision(db, repo_id, extracted)


@router.get("/single/{decision_id}", response_model=TechnicalDecisionResponse)
def get_decision(decision_id: str, db: Session = Depends(get_db)):
    """Get a specific decision by ID."""
    decision = db.query(TechnicalDecision).filter(
        TechnicalDecision.id == decision_id
    ).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    return decision


@router.put("/single/{decision_id}", response_model=TechnicalDecisionResponse)
def update_decision(
    decision_id: str,
    decision_data: TechnicalDecisionCreate,
    db: Session = Depends(get_db),
):
    """Update an existing technical decision."""
    decision = db.query(TechnicalDecision).filter(
        TechnicalDecision.id == decision_id
    ).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    for field, value in decision_data.model_dump(exclude_unset=True).items():
        setattr(decision, field, value)

    db.commit()
    db.refresh(decision)
    return decision


@router.delete("/single/{decision_id}")
def delete_decision(decision_id: str, db: Session = Depends(get_db)):
    """Delete a technical decision."""
    decision = db.query(TechnicalDecision).filter(
        TechnicalDecision.id == decision_id
    ).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    db.delete(decision)
    db.commit()
    return {"message": "Decision deleted"}
