"""
Health dashboard API route.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.models.db_models import Repository, GuardrailViolation, TechnicalDecision
from backend.models.schemas import RepositoryHealthResponse, HealthMetric

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("/dashboard", response_model=RepositoryHealthResponse)
@router.get("", response_model=RepositoryHealthResponse)
@router.get("/", response_model=RepositoryHealthResponse)
def get_dashboard_health(db: Session = Depends(get_db)):
    """Get health report for latest repository."""
    repo = db.query(Repository).order_by(Repository.created_at.desc()).first()
    if not repo:
        from backend.services.repository_service import load_demo_repository
        from backend.services.decision_service import seed_demo_decisions
        repo = load_demo_repository(db)
        seed_demo_decisions(db, repo.id)
    return get_repository_health(repo.id, db)


@router.get("/{repo_id}", response_model=RepositoryHealthResponse)
def get_repository_health(repo_id: str, db: Session = Depends(get_db)):
    """
    Get a comprehensive health report for a repository.
    Includes architecture health, test coverage indicator, dependency risk, etc.
    """
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    analysis = repo.analysis_result or {}
    violations = db.query(GuardrailViolation).filter(
        GuardrailViolation.repository_id == repo_id,
        GuardrailViolation.status == "open",
    ).all()

    decisions = db.query(TechnicalDecision).filter(
        TechnicalDecision.repository_id == repo_id
    ).count()

    metrics = []

    # Architecture Health
    arch_score = analysis.get("health_score", 70)
    metrics.append(HealthMetric(
        name="Architecture Health",
        score=arch_score,
        max_score=100,
        status=_score_status(arch_score),
        details=f"{len(analysis.get('architecture_components', []))} components detected, "
                f"{len(analysis.get('detected_patterns', []))} patterns identified",
    ))

    # Test Coverage Indicator (heuristic from directory structure)
    has_tests = any(
        "test" in d.lower() for d in analysis.get("directories", [])
    )
    test_score = 72 if has_tests else 20
    metrics.append(HealthMetric(
        name="Test Coverage Indicator",
        score=test_score,
        max_score=100,
        status=_score_status(test_score),
        details="Test directory detected — coverage requires a test runner for exact measurement" if has_tests
                else "No test directory detected — consider adding unit/integration tests",
    ))

    # Documentation Coverage
    has_readme = any("readme" in f.lower() for f in analysis.get("important_files", []))
    doc_score = 65 if has_readme else 25
    metrics.append(HealthMetric(
        name="Documentation Coverage",
        score=doc_score,
        max_score=100,
        status=_score_status(doc_score),
        details="README detected" if has_readme else "No README or documentation files found",
    ))

    # Dependency Risk
    deps = analysis.get("dependencies", [])
    dep_count = len(deps)
    dep_score = max(40, 100 - max(0, dep_count - 15) * 3)
    metrics.append(HealthMetric(
        name="Dependency Risk",
        score=dep_score,
        max_score=100,
        status=_score_status(dep_score),
        details=f"{dep_count} dependencies detected — review for outdated or vulnerable packages",
    ))

    # Guardrail Violations
    high_violations = sum(1 for v in violations if v.severity == "HIGH")
    med_violations = sum(1 for v in violations if v.severity == "MEDIUM")
    violation_score = max(0, 100 - (high_violations * 20) - (med_violations * 8))
    metrics.append(HealthMetric(
        name="Guardrail Violations",
        score=violation_score,
        max_score=100,
        status=_score_status(violation_score),
        details=f"{high_violations} HIGH, {med_violations} MEDIUM open violations",
    ))

    # Technical Debt Indicator
    risks = analysis.get("potential_risks", [])
    high_risks = sum(1 for r in risks if r.get("severity") == "HIGH")
    debt_score = max(20, 100 - (high_risks * 15) - (len(risks) * 5))
    metrics.append(HealthMetric(
        name="Technical Debt Indicator",
        score=debt_score,
        max_score=100,
        status=_score_status(debt_score),
        details=f"{len(risks)} risk areas identified, {high_risks} are HIGH severity",
    ))

    overall = int(sum(m.score for m in metrics) / len(metrics)) if metrics else 0

    return RepositoryHealthResponse(
        overall_score=overall,
        metrics=metrics,
        violations_count=len(violations),
        decisions_count=decisions,
        repository_id=repo_id,
    )


def _score_status(score: int) -> str:
    if score >= 70:
        return "good"
    if score >= 45:
        return "warning"
    return "critical"
