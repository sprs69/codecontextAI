"""
Guardrail analyzer: checks architecture rules against a scanned repository.
"""
import re
from pathlib import Path
from typing import Dict, List, Optional


# Built-in architecture rules
BUILTIN_RULES = [
    {
        "rule": "API routes must not directly access the database",
        "description": "Route handlers should delegate DB operations to service/repository layers",
        "severity": "HIGH",
        "category": "Layered Architecture",
    },
    {
        "rule": "API routes must validate all input using Pydantic schemas",
        "description": "Use typed Pydantic models for request bodies instead of raw dicts",
        "severity": "HIGH",
        "category": "Input Validation",
    },
    {
        "rule": "Secrets must not be hardcoded in source files",
        "description": "Credentials, API keys and secrets should come from environment variables",
        "severity": "MEDIUM",
        "category": "Security",
    },
    {
        "rule": "Services must contain business logic, not routes",
        "description": "Business logic should live in service classes, not route handlers",
        "severity": "MEDIUM",
        "category": "Layered Architecture",
    },
    {
        "rule": "Database access should remain inside repository/data-access modules",
        "description": "ORM queries should be encapsulated in repository classes",
        "severity": "MEDIUM",
        "category": "Layered Architecture",
    },
    {
        "rule": "External API calls must be isolated in dedicated service modules",
        "description": "Third-party SDK calls should not appear in route handlers",
        "severity": "MEDIUM",
        "category": "Modularity",
    },
]

# Patterns that indicate direct DB access in a route
DB_ROUTE_PATTERNS = [
    r"db\.query\(",
    r"session\.query\(",
    r"\.add\(.*\)",
    r"\.commit\(\)",
    r"\.execute\(",
    r"cursor\.execute",
]

SECRET_PATTERNS = [
    r"(api_key|secret|password|token|stripe_key)\s*=\s*['\"][A-Za-z0-9_\-\.]{8,}['\"]",
    r"sk_live_[A-Za-z0-9_]+",
    r"sk_test_[A-Za-z0-9_]+",
]

RAW_DICT_PATTERN = r"async def \w+\([^)]*request\s*:\s*dict"


class GuardrailAnalyzer:
    """Detects architectural violations in a repository."""

    def __init__(self, repo_path: str):
        self.repo_path = Path(repo_path).resolve()

    def _read_file(self, path: Path) -> str:
        try:
            return path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            return ""

    def _get_line_number(self, content: str, pattern: str) -> Optional[int]:
        lines = content.splitlines()
        for i, line in enumerate(lines, 1):
            if re.search(pattern, line, re.IGNORECASE):
                return i
        return None

    def analyze_routes_for_db_access(self) -> List[Dict]:
        """Find route files that directly access the database."""
        violations = []
        route_dirs = ["routes", "route", "endpoints", "views", "controllers"]

        for f in self.repo_path.rglob("*.py"):
            rel = str(f.relative_to(self.repo_path)).replace("\\", "/")
            is_route_file = any(d in rel.lower() for d in route_dirs)
            if not is_route_file:
                continue

            content = self._read_file(f)
            # Skip if it's a pure dependency-injection route
            if "Depends(get_db)" not in content and "Session" not in content:
                continue

            for pattern in DB_ROUTE_PATTERNS:
                if re.search(pattern, content):
                    line = self._get_line_number(content, pattern)
                    violations.append({
                        "rule": "API routes must not directly access the database",
                        "severity": "HIGH",
                        "file_path": rel,
                        "line_number": line,
                        "explanation": (
                            f"File '{rel}' is an API route that directly executes database "
                            "operations. This bypasses the service/repository layers defined "
                            "in this codebase and violates separation of concerns."
                        ),
                        "suggested_fix": (
                            "Move database queries into the appropriate Repository class "
                            "and call them via a Service. The route handler should only "
                            "call service methods and format responses."
                        ),
                    })
                    break

        return violations

    def analyze_for_hardcoded_secrets(self) -> List[Dict]:
        """Scan source files for hardcoded secrets."""
        violations = []
        skip_dirs = {".git", "node_modules", "__pycache__", "venv", ".venv", "tests", "test"}

        for f in self.repo_path.rglob("*.py"):
            if any(part in skip_dirs for part in f.parts):
                continue
            rel = str(f.relative_to(self.repo_path)).replace("\\", "/")
            content = self._read_file(f)
            for pattern in SECRET_PATTERNS:
                match = re.search(pattern, content, re.IGNORECASE)
                if match:
                    line = self._get_line_number(content, pattern)
                    violations.append({
                        "rule": "Secrets must not be hardcoded in source files",
                        "severity": "MEDIUM",
                        "file_path": rel,
                        "line_number": line,
                        "explanation": (
                            f"A potential hardcoded secret was found in '{rel}'. "
                            "Committing secrets to version control is a serious security risk."
                        ),
                        "suggested_fix": (
                            "Replace the hardcoded value with os.getenv('VAR_NAME'). "
                            "Add the variable to .env.example (without the value) "
                            "and ensure .env is in .gitignore."
                        ),
                    })
                    break

        return violations

    def analyze_for_unvalidated_input(self) -> List[Dict]:
        """Detect route functions accepting raw dicts instead of Pydantic models."""
        violations = []
        route_dirs = ["routes", "route", "endpoints", "views", "controllers"]

        for f in self.repo_path.rglob("*.py"):
            rel = str(f.relative_to(self.repo_path)).replace("\\", "/")
            is_route = any(d in rel.lower() for d in route_dirs)
            if not is_route:
                continue
            content = self._read_file(f)
            if re.search(RAW_DICT_PATTERN, content):
                line = self._get_line_number(content, RAW_DICT_PATTERN)
                violations.append({
                    "rule": "API routes must validate all input using Pydantic schemas",
                    "severity": "HIGH",
                    "file_path": rel,
                    "line_number": line,
                    "explanation": (
                        f"Route in '{rel}' accepts a raw 'dict' instead of a typed Pydantic "
                        "model. No validation occurs before data reaches business logic."
                    ),
                    "suggested_fix": (
                        "Define a Pydantic BaseModel for the request body and use it as the "
                        "parameter type. FastAPI will validate incoming data automatically."
                    ),
                })

        return violations

    def run(self) -> Dict:
        """Run all guardrail checks and return results."""
        violations = []
        violations.extend(self.analyze_routes_for_db_access())
        violations.extend(self.analyze_for_hardcoded_secrets())
        violations.extend(self.analyze_for_unvalidated_input())

        # Deduplicate by (file, rule)
        seen = set()
        unique_violations = []
        for v in violations:
            key = (v["file_path"], v["rule"])
            if key not in seen:
                seen.add(key)
                unique_violations.append(v)

        return {
            "rules": BUILTIN_RULES,
            "violations": unique_violations,
            "total_violations": len(unique_violations),
            "high_count": sum(1 for v in unique_violations if v["severity"] == "HIGH"),
            "medium_count": sum(1 for v in unique_violations if v["severity"] == "MEDIUM"),
            "low_count": sum(1 for v in unique_violations if v["severity"] == "LOW"),
        }
