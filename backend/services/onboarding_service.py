"""
Onboarding service: generates personalized onboarding plans.
"""
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from backend.models.db_models import OnboardingPlan, Repository


ROLE_FOCUS = {
    "backend": ["src/api", "src/services", "src/repositories", "src/models"],
    "frontend": ["src/frontend", "src/components", "src/pages", "src/store"],
    "fullstack": ["src/api", "src/frontend", "src/services"],
    "devops": ["docker-compose.yml", "Dockerfile", "migrations", ".github"],
    "qa": ["tests/", "src/api", "src/services"],
    "data": ["src/models", "migrations", "src/repositories"],
}

SKILL_DAYS = {
    "junior": 5,
    "mid": 3,
    "senior": 2,
}


def generate_onboarding_plan(
    db: Session,
    repository_id: str,
    developer_role: str,
    skill_level: str,
    known_technologies: List[str],
    team_area: Optional[str],
    repo: Repository,
) -> OnboardingPlan:
    """Generate a personalized onboarding plan based on repo structure."""

    analysis = repo.analysis_result or {}
    directories = analysis.get("directories", [])
    important_files = analysis.get("important_files", [])
    frameworks = analysis.get("frameworks", [])
    components = analysis.get("architecture_components", [])

    days = SKILL_DAYS.get(skill_level.lower(), 4)
    role_lower = developer_role.lower()

    # Build day-by-day plan
    plan = _build_plan(
        role_lower, skill_level.lower(), days, directories, components, known_technologies, frameworks
    )

    # Recommended files for this role
    recommended_files = _recommend_files(role_lower, important_files, directories)

    # Starter tasks
    starter_tasks = _generate_starter_tasks(role_lower, skill_level.lower(), frameworks)

    onboarding = OnboardingPlan(
        repository_id=repository_id,
        developer_role=developer_role,
        skill_level=skill_level,
        known_technologies=known_technologies,
        team_area=team_area,
        plan=plan,
        recommended_files=recommended_files,
        starter_tasks=starter_tasks,
    )
    db.add(onboarding)
    db.commit()
    db.refresh(onboarding)
    return onboarding


def _build_plan(
    role: str,
    level: str,
    days: int,
    directories: List[str],
    components: List[Dict],
    known_tech: List[str],
    frameworks: List[str],
) -> List[Dict]:
    """Build a structured day-by-day onboarding plan."""
    plan = []

    # Day 1 is always repository orientation
    plan.append({
        "day": 1,
        "title": "Repository Overview & Architecture",
        "description": "Understand the overall structure, technology stack, and coding conventions",
        "paths": ["README.md", "docs/", "src/"],
        "tasks": [
            "Read the README and setup documentation",
            "Run the application locally",
            "Review the architecture diagram",
            "Identify the main entry point",
        ],
        "estimated_hours": 4,
    })

    # Role-specific days
    if role in ("backend", "fullstack"):
        plan.append({
            "day": 2,
            "title": "API Layer & Request Handling",
            "description": "Understand how HTTP requests are routed and handled",
            "paths": [d for d in directories if "api" in d.lower() or "route" in d.lower()][:3],
            "tasks": [
                "Trace a request from HTTP entry to database",
                "Review the existing API routes",
                "Understand the middleware pipeline",
                "Run the existing API tests",
            ],
            "estimated_hours": 4,
        })
        plan.append({
            "day": 3,
            "title": "Services & Business Logic",
            "description": "Learn the business logic layer and domain operations",
            "paths": [d for d in directories if "service" in d.lower()][:3],
            "tasks": [
                "Read the main service classes",
                "Understand the dependency injection pattern",
                "Review how services interact with repositories",
                "Write a simple unit test for an existing service",
            ],
            "estimated_hours": 5,
        })
        if days >= 4:
            plan.append({
                "day": 4,
                "title": "Database & Repository Layer",
                "description": "Understand data models and database access patterns",
                "paths": [d for d in directories if any(k in d.lower() for k in ["repo", "model", "database", "migration"])][:4],
                "tasks": [
                    "Review the ORM models",
                    "Run existing database migrations",
                    "Understand the repository pattern used",
                    "Add a simple query to an existing repository",
                ],
                "estimated_hours": 4,
            })
        if days >= 5:
            plan.append({
                "day": 5,
                "title": "Auth & Security",
                "description": "Understand authentication, authorization, and security practices",
                "paths": [d for d in directories if "auth" in d.lower()][:3],
                "tasks": [
                    "Review the authentication flow",
                    "Understand JWT token lifecycle",
                    "Review permission/role checks",
                    "Test an authenticated endpoint",
                ],
                "estimated_hours": 3,
            })

    if role in ("frontend", "fullstack") and days >= 2:
        plan.append({
            "day": 2 if role == "frontend" else min(days, 5),
            "title": "Frontend Architecture & Component Structure",
            "description": "Learn the React component hierarchy and state management",
            "paths": [d for d in directories if any(k in d.lower() for k in ["frontend", "component", "page", "store"])][:4],
            "tasks": [
                "Review the component architecture",
                "Understand state management (Redux/Context)",
                "Trace API calls from UI to backend",
                "Make a small UI change and see it reflected",
            ],
            "estimated_hours": 5,
        })

    if role == "devops":
        plan.append({
            "day": 2,
            "title": "Infrastructure & Deployment",
            "description": "Understand the containerization and deployment setup",
            "paths": ["docker-compose.yml", ".github/workflows", "Dockerfile"],
            "tasks": [
                "Run the application using Docker Compose",
                "Review the CI/CD pipeline configuration",
                "Understand environment variable management",
                "Check the database migration process",
            ],
            "estimated_hours": 4,
        })

    return plan


def _recommend_files(role: str, important_files: List[str], directories: List[str]) -> List[str]:
    """Recommend files to read based on developer role."""
    role_keywords = {
        "backend": ["main", "api", "service", "route", "model", "repository", "auth"],
        "frontend": ["app", "index", "component", "page", "store", "router"],
        "fullstack": ["main", "app", "api", "service", "component"],
        "devops": ["docker", "compose", "config", "env", "deploy", "workflow"],
        "qa": ["test", "spec", "conftest", "fixture"],
        "data": ["model", "schema", "migration", "repository"],
    }

    keywords = role_keywords.get(role, ["main", "app", "index"])
    recommended = []
    for f in important_files:
        if any(kw in f.lower() for kw in keywords):
            recommended.append(f)

    # Always include README
    if not any("readme" in f.lower() for f in recommended):
        recommended.insert(0, "README.md")

    return recommended[:10]


def _generate_starter_tasks(role: str, level: str, frameworks: List[str]) -> List[str]:
    """Generate starter tasks appropriate for role and skill level."""
    tasks_by_role = {
        "backend": [
            "Add a new field to an existing API response model",
            "Write a unit test for an existing service method",
            "Fix a linting issue identified by the code style checker",
            "Add input validation to an existing route",
            "Review and comment on one open pull request",
        ],
        "frontend": [
            "Fix a UI alignment issue on the dashboard",
            "Add a loading spinner to an existing API call",
            "Write a component test for an existing component",
            "Add a new form field with validation",
            "Review and comment on one open pull request",
        ],
        "fullstack": [
            "Add a new API endpoint with a corresponding frontend page",
            "Write both unit and integration tests for new functionality",
            "Improve error handling in an existing flow",
            "Review and comment on one open pull request",
        ],
        "devops": [
            "Add a health check endpoint to the Docker configuration",
            "Set up a new environment variable for local development",
            "Review and improve the CI pipeline run time",
            "Document the deployment process for a new developer",
        ],
        "qa": [
            "Write an integration test for an existing API endpoint",
            "Identify and document a missing test case",
            "Set up a test data fixture for common scenarios",
            "Review the existing test coverage report",
        ],
    }

    base_tasks = tasks_by_role.get(role, tasks_by_role["backend"])

    # For seniors, add architecture-level tasks
    if level == "senior":
        base_tasks = [
            "Review the architecture and identify one improvement opportunity",
        ] + base_tasks[:3]

    return base_tasks[:5]
