"""
Architecture API routes.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.models.db_models import ArchitectureRule, Repository
from backend.models.schemas import ArchitectureRuleCreate, ArchitectureRuleResponse

router = APIRouter(prefix="/api/architecture", tags=["architecture"])


@router.get("/{repo_id}/components")
@router.get("/{repo_id}")
def get_architecture_components(repo_id: str, db: Session = Depends(get_db)):
    """Get the architecture component map for a repository."""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    analysis = repo.analysis_result or {}
    return {
        "repository_id": repo_id,
        "project_name": analysis.get("project_name", repo.name),
        "components": analysis.get("architecture_components", []),
        "patterns": analysis.get("detected_patterns", []),
        "frameworks": analysis.get("frameworks", []),
    }


@router.get("/{repo_id}/rules", response_model=List[ArchitectureRuleResponse])
def get_architecture_rules(repo_id: str, db: Session = Depends(get_db)):
    """Get all architecture rules for a repository."""
    rules = db.query(ArchitectureRule).filter(
        ArchitectureRule.repository_id == repo_id
    ).all()
    return rules


@router.post("/{repo_id}/rules", response_model=ArchitectureRuleResponse)
def create_architecture_rule(
    repo_id: str,
    rule_data: ArchitectureRuleCreate,
    db: Session = Depends(get_db),
):
    """Add a new architecture rule to a repository."""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    rule = ArchitectureRule(
        repository_id=repo_id,
        rule=rule_data.rule,
        description=rule_data.description,
        severity=rule_data.severity,
        category=rule_data.category,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/{repo_id}/rules/{rule_id}")
def delete_architecture_rule(repo_id: str, rule_id: str, db: Session = Depends(get_db)):
    """Delete an architecture rule."""
    rule = db.query(ArchitectureRule).filter(
        ArchitectureRule.id == rule_id,
        ArchitectureRule.repository_id == repo_id,
    ).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()
    return {"message": "Rule deleted"}
