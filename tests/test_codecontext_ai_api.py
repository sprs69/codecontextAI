"""
End-to-end API and service tests for CodeContext AI.
Tests all endpoints, demo datasets, guardrails, PR intelligence, decisions, onboarding, and health metrics.
"""
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database.connection import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "CodeContext AI"
    assert data["status"] == "running"


def test_ping_endpoint():
    response = client.get("/api/ping")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_demo_repository_load_and_list():
    # 1. Load demo repository
    response = client.post("/api/repository/demo")
    assert response.status_code == 200
    repo = response.json()
    assert "ShopFlow Platform" in repo["name"]
    assert "analysis_result" in repo
    repo_id = repo["id"]

    # 2. List repositories
    list_resp = client.get("/api/repository/list")
    assert list_resp.status_code == 200
    repos = list_resp.json()
    assert len(repos) >= 1
    assert any(r["id"] == repo_id for r in repos)

    # 3. Get single repository
    get_resp = client.get(f"/api/repository/{repo_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == repo_id


def test_architecture_endpoints():
    # Load demo repo first
    repo = client.post("/api/repository/demo").json()
    repo_id = repo["id"]

    # Architecture components
    arch_resp = client.get(f"/api/architecture/{repo_id}")
    assert arch_resp.status_code == 200
    arch_data = arch_resp.json()
    assert "components" in arch_data
    assert len(arch_data["components"]) > 0
    assert "patterns" in arch_data

    # Architecture rules
    rules_resp = client.get(f"/api/architecture/{repo_id}/rules")
    assert rules_resp.status_code == 200
    rules = rules_resp.json()
    assert len(rules) >= 4


def test_guardrails_endpoints():
    repo = client.post("/api/repository/demo").json()
    repo_id = repo["id"]

    # Summary
    summary_resp = client.get(f"/api/guardrails/{repo_id}/summary")
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert summary["summary"]["total"] >= 3
    assert summary["summary"]["HIGH"] >= 1

    # Violations list
    violations_resp = client.get(f"/api/guardrails/{repo_id}")
    assert violations_resp.status_code == 200
    violations = violations_resp.json()
    assert len(violations) >= 3

    # Update violation status
    viol_id = violations[0]["id"]
    update_resp = client.patch(
        f"/api/guardrails/{repo_id}/violations/{viol_id}/status",
        json={"status": "resolved"}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "resolved"


def test_pr_intelligence_analysis():
    repo = client.post("/api/repository/demo").json()
    repo_id = repo["id"]

    # Demo PR diff
    demo_pr_resp = client.get("/api/pr-intelligence/demo")
    assert demo_pr_resp.status_code == 200
    demo_diff = demo_pr_resp.json()["diff"]
    assert "diff --git" in demo_diff

    # Analyze PR diff
    analyze_resp = client.post(
        "/api/pr-intelligence/analyze",
        json={
            "repository_id": repo_id,
            "pr_title": "feat: Direct DB query in checkout",
            "diff_content": demo_diff
        }
    )
    assert analyze_resp.status_code == 200
    result = analyze_resp.json()
    assert "risk_score" in result
    assert result["risk_score"] > 50
    assert "violations" in result
    assert len(result["violations"]) >= 1
    assert "reviewer_questions" in result
    assert "suggested_fixes" in result
    assert "tests_to_add" in result


def test_decision_memory_crud_and_extraction():
    repo = client.post("/api/repository/demo").json()
    repo_id = repo["id"]

    # List decisions
    decisions_resp = client.get(f"/api/decisions/{repo_id}")
    assert decisions_resp.status_code == 200
    decisions = decisions_resp.json()
    assert len(decisions) >= 3

    # Create new decision
    create_resp = client.post(
        f"/api/decisions/{repo_id}",
        json={
            "title": "Use Redis for Token Blacklisting",
            "context": "Need immediate revocation on logout",
            "problem": "JWTs are stateless and cannot be revoked without DB",
            "chosen_approach": "Store revoked jti with TTL in Redis",
            "alternatives": ["Short-lived tokens only", "Database lookup on each call"],
            "reasoning": "Redis lookup is sub-millisecond and TTL handles automatic cleanup",
            "affected_components": ["src/auth/jwt_handler.py"]
        }
    )
    assert create_resp.status_code == 201
    new_dec = create_resp.json()
    assert new_dec["title"] == "Use Redis for Token Blacklisting"

    # Extract decision from text
    sample_text = """
    Decision: Adopt Structured Logging with JSON
    Problem: Logs were plain text and unsearchable in Datadog
    Approach: Use python-json-logger for all app logs
    Reasoning: Enables indexing and alert queries
    """
    extract_resp = client.post(
        f"/api/decisions/{repo_id}/extract",
        json={"text": sample_text}
    )
    assert extract_resp.status_code == 200
    extracted = extract_resp.json()
    assert "Structured Logging" in extracted["title"] or "Adopt" in extracted["title"]


def test_onboarding_generation():
    repo = client.post("/api/repository/demo").json()
    repo_id = repo["id"]

    onboard_resp = client.post(
        "/api/onboarding/generate",
        json={
            "repository_id": repo_id,
            "developer_role": "backend",
            "skill_level": "mid",
            "known_technologies": ["Python", "PostgreSQL"],
            "team_area": "Payments"
        }
    )
    assert onboard_resp.status_code == 200
    plan = onboard_resp.json()
    assert plan["developer_role"] == "backend"
    assert "plan" in plan
    assert len(plan["plan"]) >= 3
    assert "starter_tasks" in plan
    assert "recommended_files" in plan


def test_health_metrics():
    repo = client.post("/api/repository/demo").json()
    repo_id = repo["id"]

    health_resp = client.get(f"/api/health/{repo_id}")
    assert health_resp.status_code == 200
    health = health_resp.json()
    assert "overall_score" in health
    assert "metrics" in health
    assert len(health["metrics"]) >= 5
