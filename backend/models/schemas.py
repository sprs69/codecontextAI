"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


# ─── Repository ─────────────────────────────────────────────────────────────

class RepositoryAnalyzeRequest(BaseModel):
    path: Optional[str] = None
    use_demo: bool = False


class LanguageInfo(BaseModel):
    name: str
    percentage: float
    files: int


class DependencyInfo(BaseModel):
    name: str
    version: Optional[str] = None
    type: str  # runtime | dev | peer


class ArchitectureComponent(BaseModel):
    name: str
    type: str  # frontend | backend | database | api | service | utility | external
    path: Optional[str] = None
    description: Optional[str] = None
    files: List[str] = []
    dependencies: List[str] = []


class DetectedPattern(BaseModel):
    name: str
    description: str
    confidence: float
    files: List[str] = []


class PotentialRisk(BaseModel):
    name: str
    description: str
    severity: str  # HIGH | MEDIUM | LOW
    files: List[str] = []


class RepositoryAnalysisResult(BaseModel):
    project_name: str
    languages: List[LanguageInfo]
    frameworks: List[str]
    directories: List[str]
    important_files: List[str]
    dependencies: List[DependencyInfo]
    architecture_components: List[ArchitectureComponent]
    detected_patterns: List[DetectedPattern]
    potential_risks: List[PotentialRisk]
    total_files: int
    total_lines: int
    health_score: int


class RepositoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    status: str
    source_type: str
    created_at: datetime
    analysis_result: Optional[Dict[str, Any]] = None


# ─── Architecture Rules ──────────────────────────────────────────────────────

class ArchitectureRuleCreate(BaseModel):
    rule: str
    description: Optional[str] = None
    severity: str = "MEDIUM"
    category: Optional[str] = None


class ArchitectureRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    repository_id: str
    rule: str
    description: Optional[str]
    severity: str
    category: Optional[str]
    created_at: datetime


# ─── Guardrail Violations ─────────────────────────────────────────────────────

class GuardrailViolationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    repository_id: str
    rule: str
    severity: str
    file_path: str
    line_number: Optional[int]
    explanation: Optional[str]
    suggested_fix: Optional[str]
    status: str
    created_at: datetime


# ─── Technical Decisions ─────────────────────────────────────────────────────

class TechnicalDecisionCreate(BaseModel):
    title: str
    context: Optional[str] = None
    problem: Optional[str] = None
    chosen_approach: Optional[str] = None
    alternatives: Optional[List[str]] = []
    reasoning: Optional[str] = None
    affected_components: Optional[List[str]] = []
    status: str = "active"


class DecisionFromTextRequest(BaseModel):
    text: str
    repository_id: Optional[str] = None


class TechnicalDecisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    repository_id: str
    title: str
    context: Optional[str]
    problem: Optional[str]
    chosen_approach: Optional[str]
    alternatives: Optional[List[str]]
    reasoning: Optional[str]
    affected_components: Optional[List[str]]
    status: str
    decision_date: datetime
    created_at: datetime


# ─── PR Analysis ─────────────────────────────────────────────────────────────

class PRAnalyzeRequest(BaseModel):
    repository_id: str
    pr_title: Optional[str] = None
    diff_content: str


class PRAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    repository_id: str
    pr_title: Optional[str]
    risk_score: int
    risk_level: str
    changed_components: Optional[List[str]]
    violations: Optional[List[Dict[str, Any]]]
    reviewer_questions: Optional[List[str]]
    suggested_fixes: Optional[List[str]]
    tests_to_add: Optional[List[str]]
    created_at: datetime


# ─── Onboarding ──────────────────────────────────────────────────────────────

class OnboardingRequest(BaseModel):
    repository_id: Optional[str] = None
    developer_role: str = "backend"
    skill_level: str = "mid"  # junior | mid | senior
    known_technologies: List[str] = []
    team_area: Optional[str] = None


class OnboardingPlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    repository_id: str
    developer_role: str
    skill_level: str
    plan: Optional[List[Dict[str, Any]]]
    recommended_files: Optional[List[str]]
    starter_tasks: Optional[List[str]]
    created_at: datetime


# ─── Health ──────────────────────────────────────────────────────────────────

class HealthMetric(BaseModel):
    name: str
    score: int
    max_score: int
    status: str  # good | warning | critical
    details: Optional[str] = None


class RepositoryHealthResponse(BaseModel):
    overall_score: int
    metrics: List[HealthMetric]
    violations_count: int
    decisions_count: int
    repository_id: str
