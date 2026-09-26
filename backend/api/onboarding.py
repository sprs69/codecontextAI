"""
Onboarding API routes.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.models.db_models import OnboardingPlan, Repository
from backend.models.schemas import OnboardingRequest, OnboardingPlanResponse
from backend.services.onboarding_service import generate_onboarding_plan

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


@router.post("/generate", response_model=OnboardingPlanResponse)
def generate_plan(request: OnboardingRequest, db: Session = Depends(get_db)):
    """
    Generate a personalized onboarding plan.
    
    Body:
    - repository_id: The repository to onboard into
    - developer_role: backend | frontend | fullstack | devops | qa | data
    - skill_level: junior | mid | senior
    - known_technologies: List of tech the developer already knows
    - team_area: Optional team/project area focus
    """
    repo = None
    if request.repository_id:
        repo = db.query(Repository).filter(Repository.id == request.repository_id).first()
    if not repo:
        repo = db.query(Repository).order_by(Repository.created_at.desc()).first()
    if not repo:
        from backend.services.repository_service import load_demo_repository
        from backend.services.decision_service import seed_demo_decisions
        repo = load_demo_repository(db)
        seed_demo_decisions(db, repo.id)

    target_repo_id = repo.id

    if repo.status != "ready":
        raise HTTPException(
            status_code=400,
            detail="Repository is not fully analyzed yet. Please wait for analysis to complete."
        )

    plan = generate_onboarding_plan(
        db=db,
        repository_id=target_repo_id,
        developer_role=request.developer_role,
        skill_level=request.skill_level,
        known_technologies=request.known_technologies,
        team_area=request.team_area,
        repo=repo,
    )
    return plan


@router.get("/history/{repo_id}")
def get_onboarding_history(repo_id: str, db: Session = Depends(get_db)):
    """Get all onboarding plans generated for a repository."""
    plans = db.query(OnboardingPlan).filter(
        OnboardingPlan.repository_id == repo_id
    ).order_by(OnboardingPlan.created_at.desc()).all()
    return plans


@router.get("/plan/{plan_id}", response_model=OnboardingPlanResponse)
def get_plan(plan_id: str, db: Session = Depends(get_db)):
    """Get a specific onboarding plan."""
    plan = db.query(OnboardingPlan).filter(OnboardingPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Onboarding plan not found")
    return plan
