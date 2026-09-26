"""
PR Intelligence API routes.
"""
import os
import tempfile
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.models.db_models import PRAnalysis, Repository, GuardrailViolation
from backend.models.schemas import PRAnalyzeRequest, PRAnalysisResponse
from backend.analyzers.pr_analyzer import analyze_pr_diff
from backend.data.demo_data import DEMO_PR_DIFF, DEMO_PR_ANALYSIS
import uuid

router = APIRouter(tags=["pr-intelligence"])


@router.post("/analyze", response_model=PRAnalysisResponse)
def analyze_pr(request: PRAnalyzeRequest, db: Session = Depends(get_db)):
    """
    Analyze a PR diff against the repository's architecture.
    
    Body:
    - repository_id: ID of the analyzed repository
    - pr_title: Optional PR title for context
    - diff_content: Unified diff string
    """
    repo = db.query(Repository).filter(Repository.id == request.repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    repo_analysis = repo.analysis_result or {}
    existing_violations = db.query(GuardrailViolation).filter(
        GuardrailViolation.repository_id == request.repository_id
    ).all()
    violations_data = [{"rule": v.rule, "severity": v.severity} for v in existing_violations]

    result = analyze_pr_diff(
        diff_content=request.diff_content,
        repository_analysis=repo_analysis,
        guardrail_violations=violations_data,
    )

    pr_analysis = PRAnalysis(
        repository_id=request.repository_id,
        pr_title=request.pr_title,
        diff_content=request.diff_content[:5000],  # store truncated version
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        changed_components=result["changed_components"],
        violations=result["violations"],
        reviewer_questions=result["reviewer_questions"],
        suggested_fixes=result["suggested_fixes"],
        tests_to_add=result["tests_to_add"],
    )
    db.add(pr_analysis)
    db.commit()
    db.refresh(pr_analysis)
    return pr_analysis


@router.post("/analyze/upload", response_model=PRAnalysisResponse)
async def analyze_pr_file(
    repository_id: str,
    pr_title: Optional[str] = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a diff file (.diff or .patch) for analysis."""
    content = await file.read()
    diff_content = content.decode("utf-8", errors="ignore")

    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    result = analyze_pr_diff(diff_content=diff_content, repository_analysis=repo.analysis_result)

    pr_analysis = PRAnalysis(
        repository_id=repository_id,
        pr_title=pr_title or file.filename,
        diff_content=diff_content[:5000],
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        changed_components=result["changed_components"],
        violations=result["violations"],
        reviewer_questions=result["reviewer_questions"],
        suggested_fixes=result["suggested_fixes"],
        tests_to_add=result["tests_to_add"],
    )
    db.add(pr_analysis)
    db.commit()
    db.refresh(pr_analysis)
    return pr_analysis


@router.get("/demo")
def get_demo_pr(db: Session = Depends(get_db)):
    """Get the demo PR diff and analysis for demonstration."""
    return {
        "diff": DEMO_PR_DIFF,
        "analysis": DEMO_PR_ANALYSIS,
    }


@router.get("/history/{repo_id}")
def get_pr_history(repo_id: str, db: Session = Depends(get_db)):
    """Get all PR analyses for a repository."""
    analyses = db.query(PRAnalysis).filter(
        PRAnalysis.repository_id == repo_id
    ).order_by(PRAnalysis.created_at.desc()).all()
    return analyses
