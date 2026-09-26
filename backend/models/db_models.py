"""
SQLAlchemy ORM models for CodeContext AI.
"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, JSON, Float, Boolean
from sqlalchemy.sql import func
import uuid

from backend.database.connection import Base


def new_uuid():
    return str(uuid.uuid4())


class Repository(Base):
    __tablename__ = "repositories"

    id = Column(String, primary_key=True, default=new_uuid)
    name = Column(String, nullable=False)
    path = Column(String, nullable=True)
    source_type = Column(String, default="local")  # local | zip | demo
    status = Column(String, default="pending")  # pending | analyzing | ready | error
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Stored analysis result (JSON blob)
    analysis_result = Column(JSON, nullable=True)


class ArchitectureRule(Base):
    __tablename__ = "architecture_rules"

    id = Column(String, primary_key=True, default=new_uuid)
    repository_id = Column(String, nullable=False)
    rule = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String, default="MEDIUM")  # HIGH | MEDIUM | LOW
    category = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())


class GuardrailViolation(Base):
    __tablename__ = "guardrail_violations"

    id = Column(String, primary_key=True, default=new_uuid)
    repository_id = Column(String, nullable=False)
    rule_id = Column(String, nullable=True)
    rule = Column(String, nullable=False)
    severity = Column(String, default="MEDIUM")
    file_path = Column(String, nullable=False)
    line_number = Column(Integer, nullable=True)
    explanation = Column(Text, nullable=True)
    suggested_fix = Column(Text, nullable=True)
    status = Column(String, default="open")  # open | resolved | ignored
    created_at = Column(DateTime, default=func.now())


class TechnicalDecision(Base):
    __tablename__ = "technical_decisions"

    id = Column(String, primary_key=True, default=new_uuid)
    repository_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    context = Column(Text, nullable=True)
    problem = Column(Text, nullable=True)
    chosen_approach = Column(Text, nullable=True)
    alternatives = Column(JSON, nullable=True)
    reasoning = Column(Text, nullable=True)
    affected_components = Column(JSON, nullable=True)
    status = Column(String, default="active")  # active | deprecated | superseded
    decision_date = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())


class PRAnalysis(Base):
    __tablename__ = "pr_analyses"

    id = Column(String, primary_key=True, default=new_uuid)
    repository_id = Column(String, nullable=False)
    pr_title = Column(String, nullable=True)
    diff_content = Column(Text, nullable=True)
    risk_score = Column(Integer, default=0)  # 0-100
    risk_level = Column(String, default="LOW")  # LOW | MEDIUM | HIGH | CRITICAL
    changed_components = Column(JSON, nullable=True)
    violations = Column(JSON, nullable=True)
    reviewer_questions = Column(JSON, nullable=True)
    suggested_fixes = Column(JSON, nullable=True)
    tests_to_add = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())


class OnboardingPlan(Base):
    __tablename__ = "onboarding_plans"

    id = Column(String, primary_key=True, default=new_uuid)
    repository_id = Column(String, nullable=False)
    developer_role = Column(String, nullable=True)
    skill_level = Column(String, nullable=True)
    known_technologies = Column(JSON, nullable=True)
    team_area = Column(String, nullable=True)
    plan = Column(JSON, nullable=True)
    recommended_files = Column(JSON, nullable=True)
    starter_tasks = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())
