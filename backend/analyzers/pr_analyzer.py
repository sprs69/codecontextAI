"""
PR diff analyzer: assesses risk and finds violations in a code diff.
"""
import re
from typing import Dict, List, Optional, Any


RISK_INDICATORS = {
    "CRITICAL": [
        (r"STRIPE_KEY\s*=\s*['\"][^'\"]+['\"]|sk_live_[A-Za-z0-9_]+|DEMO_STRIPE_KEY", "Hardcoded Stripe key in code"),
        (r"(password|secret)\s*=\s*['\"][^'\"]{8,}['\"]", "Hardcoded credential"),
        (r"DROP\s+TABLE", "Destructive SQL operation"),
        (r"eval\(", "Unsafe eval() call"),
    ],
    "HIGH": [
        (r"db\.query\(|session\.query\(|\.commit\(\)", "Direct database access"),
        (r"request\s*:\s*dict|request\.json\(\)", "Unvalidated request body"),
        (r"import\s+stripe|stripe\.api_key", "Inline Stripe integration"),
        (r"subprocess\.call|os\.system\(", "Shell command execution"),
        (r"except\s*:\s*pass", "Silent exception swallowing"),
    ],
    "MEDIUM": [
        (r"TODO|FIXME|HACK|XXX", "Code quality markers present"),
        (r"print\(", "Debug print statements in production code"),
        (r"time\.sleep\(", "Blocking sleep call"),
        (r"# noqa|type:\s*ignore", "Type/lint suppression"),
    ],
    "LOW": [
        (r"\.lower\(\)\.strip\(\)", "Minor code style"),
        (r"magic\s+number", "Magic number"),
    ],
}

INDICATOR_METADATA: Dict[str, Dict[str, str]] = {
    "Hardcoded Stripe key in code": {
        "explanation": "A Stripe API secret key or live credential was detected in the diff. Committing secret keys to version control risks unauthorized payment access and financial compromise.",
        "suggested_fix": "Remove the hardcoded key immediately. Load it from environment variables: os.getenv('STRIPE_SECRET_KEY') and add the variable to .env.example.",
    },
    "Hardcoded credential": {
        "explanation": "Hardcoded passwords, secrets, or tokens in source code violate security compliance and risk unauthorized system access if committed.",
        "suggested_fix": "Store credentials in environment variables (e.g., os.getenv('SECRET_KEY')) or a dedicated secret management vault.",
    },
    "Destructive SQL operation": {
        "explanation": "A destructive SQL statement (DROP TABLE) was detected. Direct table drops can cause irreversible schema deletion, data loss, and downtime.",
        "suggested_fix": "Manage schema changes using reversible Alembic migrations rather than ad-hoc raw SQL DROP statements.",
    },
    "Unsafe eval() call": {
        "explanation": "eval() executes arbitrary code strings, opening the service to Remote Code Execution (RCE) vulnerabilities if inputs are tainted.",
        "suggested_fix": "Avoid eval(). Use ast.literal_eval() for safe data deserialization or typed Pydantic models for parsing.",
    },
    "Direct database access": {
        "explanation": "Direct database query or commit calls bypass the repository and service layers, violating separation of concerns and architectural boundaries.",
        "suggested_fix": "Delegate database queries to the Repository layer and coordinate persistence through the Service layer.",
    },
    "Unvalidated request body": {
        "explanation": "Endpoint accepts an untyped dictionary or calls request.json() directly without schema validation, leaving API vulnerable to malformed payloads.",
        "suggested_fix": "Define a typed Pydantic BaseModel for the request payload to ensure automatic type checking and payload validation.",
    },
    "Inline Stripe integration": {
        "explanation": "Direct inline third-party SDK calls tightly couple route handlers to payment provider details without centralized error handling or abstraction.",
        "suggested_fix": "Encapsulate payment operations inside a dedicated PaymentService and inject it via dependency injection.",
    },
    "Shell command execution": {
        "explanation": "Executing shell commands directly risks command injection vulnerabilities if arguments contain unescaped user input.",
        "suggested_fix": "Use subprocess.run() with shell=False, pass arguments as a list of strings, and sanitize all parameters.",
    },
    "Silent exception swallowing": {
        "explanation": "Catching exceptions with 'except: pass' conceals runtime failures, prevents crash diagnosis, and may leave the system in an inconsistent state.",
        "suggested_fix": "Catch specific exception types, log error diagnostics using logger.exception(), and handle or re-raise appropriately.",
    },
    "Code quality markers present": {
        "explanation": "Code contains TODO, FIXME, or HACK markers indicating unfinished logic or temporary workarounds in code submitted for review.",
        "suggested_fix": "Complete the required implementation or track the pending item as an issue ticket prior to merging.",
    },
    "Debug print statements in production code": {
        "explanation": "print() statements output unformatted text to standard out and can leak sensitive payload data into production console logs.",
        "suggested_fix": "Replace print() with structured logger calls (e.g., logger.info() or logger.debug()).",
    },
    "Blocking sleep call": {
        "explanation": "time.sleep() blocks the server worker thread or event loop, severely degrading concurrent request throughput.",
        "suggested_fix": "Use await asyncio.sleep() in async functions or offload long-running tasks to background worker queues.",
    },
    "Type/lint suppression": {
        "explanation": "Suppression directives (# noqa, type: ignore) bypass static analysis and can conceal actual type errors or linter defects.",
        "suggested_fix": "Fix the root typing or linting issue properly rather than silencing static analyzer warnings.",
    },
    "Minor code style": {
        "explanation": "Redundant or chained string normalization operations.",
        "suggested_fix": "Standardize string input sanitization through a helper or Pydantic validator.",
    },
    "Magic number": {
        "explanation": "Unexplained numeric literals reduce code readability and make maintenance error-prone.",
        "suggested_fix": "Extract numeric literals into named configuration constants.",
    },
}


def analyze_pr_diff(
    diff_content: str,
    repository_analysis: Optional[Dict] = None,
    guardrail_violations: Optional[List[Dict]] = None,
) -> Dict[str, Any]:
    """
    Analyze a code diff and return risk assessment.
    
    Args:
        diff_content: The unified diff string
        repository_analysis: Repository analysis result for context
        guardrail_violations: Existing violations for rule context
    
    Returns:
        Full PR analysis result
    """
    changed_files = _extract_changed_files(diff_content)
    violations = _detect_violations(diff_content)
    risk_score = _calculate_risk_score(violations, changed_files)
    risk_level = _score_to_level(risk_score)

    reviewer_questions = _generate_reviewer_questions(
        violations, changed_files, diff_content, repository_analysis
    )
    suggested_fixes = _generate_fixes(violations)
    tests_to_add = _suggest_tests(changed_files, diff_content)
    changed_components = _map_to_components(changed_files, repository_analysis)

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "changed_components": changed_components,
        "violations": violations,
        "reviewer_questions": reviewer_questions,
        "suggested_fixes": suggested_fixes,
        "tests_to_add": tests_to_add,
    }


def _extract_added_lines(diff: str) -> str:
    """Extract only the added ('+') lines from a diff."""
    lines = []
    for line in diff.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            lines.append(line[1:])
    return "\n".join(lines)


def _extract_changed_files(diff: str) -> List[str]:
    """Extract list of changed filenames from a diff."""
    files = []
    for line in diff.splitlines():
        if line.startswith("+++ b/"):
            fname = line[6:].strip()
            if fname != "/dev/null":
                files.append(fname)
    return files


def _detect_violations(diff_content: str, full_diff: Optional[str] = None) -> List[Dict]:
    """Find rule violations in the diff's added lines with file and line traceability."""
    source_diff = full_diff if full_diff else diff_content
    violations = []
    seen = set()

    current_file = None
    current_target_line = 1
    lines_metadata = []

    for diff_idx, line in enumerate(source_diff.splitlines(), 1):
        if line.startswith("diff --git"):
            match = re.search(r"diff --git a/.+ b/(.+)", line)
            if match:
                current_file = match.group(1).strip()
            continue
        if line.startswith("+++ b/"):
            fname = line[6:].strip()
            if fname != "/dev/null":
                current_file = fname
            continue
        if line.startswith("@@"):
            match = re.search(r"@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@", line)
            if match:
                current_target_line = int(match.group(1))
            continue

        if line.startswith("+") and not line.startswith("+++"):
            added_text = line[1:]
            lines_metadata.append((diff_idx, current_file or "patch", current_target_line, added_text))
            current_target_line += 1
        elif line.startswith("-") and not line.startswith("---"):
            pass
        else:
            current_target_line += 1

    # Fallback if no hunks were recognized
    if not lines_metadata and source_diff.strip():
        for diff_idx, line in enumerate(source_diff.splitlines(), 1):
            if line.startswith("+") and not line.startswith("+++"):
                lines_metadata.append((diff_idx, "patch", diff_idx, line[1:]))
            elif not line.startswith("-"):
                lines_metadata.append((diff_idx, "patch", diff_idx, line))

    # Scan each added line against RISK_INDICATORS
    for diff_idx, file_path, target_line, added_text in lines_metadata:
        line_has_stripe = bool(re.search(
            r"STRIPE_KEY\s*=\s*['\"][^'\"]+['\"]|sk_live_[A-Za-z0-9_]+|DEMO_STRIPE_KEY",
            added_text,
            re.IGNORECASE
        ))

        for severity, patterns in RISK_INDICATORS.items():
            for pattern, description in patterns:
                # Deduplication: if line matched a specific Stripe key, suppress generic credential on that line
                if line_has_stripe and description == "Hardcoded credential":
                    continue

                if re.search(pattern, added_text, re.IGNORECASE):
                    key = (file_path, description)
                    if key not in seen:
                        seen.add(key)
                        meta = INDICATOR_METADATA.get(description, {
                            "explanation": f"Detected {description.lower()} which violates security/architecture standards.",
                            "suggested_fix": "Refactor according to project architecture guidelines.",
                        })
                        violations.append({
                            "rule": description,
                            "severity": severity,
                            "file": file_path,
                            "line": target_line,
                            "diff_line": diff_idx,
                            "description": description,
                            "explanation": meta["explanation"],
                            "suggested_fix": meta["suggested_fix"],
                        })

    return violations


def _calculate_risk_score(violations: List[Dict], changed_files: List[str]) -> int:
    """Calculate a risk score from 0-100."""
    score = 0

    weights = {"CRITICAL": 35, "HIGH": 20, "MEDIUM": 8, "LOW": 3}
    for v in violations:
        score += weights.get(v.get("severity", "LOW"), 3)

    # File count penalty
    file_count = len(changed_files)
    if file_count > 10:
        score += 15
    elif file_count > 5:
        score += 8
    elif file_count > 2:
        score += 4

    # Penalty for touching critical file types
    critical_files = ["auth", "payment", "security", "migration", "database"]
    for f in changed_files:
        if any(c in f.lower() for c in critical_files):
            score += 10
            break

    return min(100, score)


def _score_to_level(score: int) -> str:
    if score >= 80:
        return "CRITICAL"
    if score >= 60:
        return "HIGH"
    if score >= 35:
        return "MEDIUM"
    return "LOW"


def _generate_reviewer_questions(
    violations: List[Dict],
    files: List[str],
    diff: str,
    repo_analysis: Optional[Dict],
) -> List[str]:
    """Generate targeted questions a reviewer should ask."""
    questions = []

    if any(v["severity"] in ("CRITICAL", "HIGH") for v in violations):
        questions.append("Why does this change bypass the established service/repository layers?")

    if "sk_live" in diff or "secret" in diff.lower():
        questions.append("Has any live credential been committed? Please check git history immediately.")

    if "stripe" in diff.lower() or "payment" in diff.lower():
        questions.append("What happens if the payment succeeds but the subsequent DB write fails?")
        questions.append("Is this endpoint idempotent? What prevents duplicate charges?")

    if any("test" not in f.lower() for f in files):
        questions.append("Are there unit tests covering the new code paths in this diff?")

    if "TODO" in diff or "FIXME" in diff:
        questions.append("There are TODO/FIXME markers — should these be resolved before merging?")

    if len(files) > 5:
        questions.append(
            "This PR touches many files. Should this be split into smaller, focused changes?"
        )

    if not questions:
        questions.append("Does this change require any documentation updates?")
        questions.append("Have edge cases (empty input, network failure) been handled?")

    return questions[:8]


def _generate_fixes(violations: List[Dict]) -> List[str]:
    """Generate actionable fix suggestions per violation."""
    fixes_map = {
        "Direct database access": (
            "Move database queries to the appropriate Repository class and call via Service layer"
        ),
        "Unvalidated request body": (
            "Replace `dict` parameter with a typed Pydantic BaseModel; FastAPI handles validation automatically"
        ),
        "Inline Stripe integration": (
            "Move Stripe calls into PaymentService and inject it as a dependency"
        ),
        "Hardcoded credential": (
            "Replace hardcoded value with os.getenv('VAR_NAME'); add to .env.example"
        ),
        "Hardcoded Stripe key in code": (
            "URGENT: Remove the hardcoded Stripe key immediately; load it securely from os.getenv('STRIPE_SECRET_KEY') and add to .env.example"
        ),
        "Live Stripe key hardcoded in code": (
            "URGENT: Remove the live key immediately; rotate the key in Stripe dashboard; use os.getenv('STRIPE_SECRET_KEY')"
        ),
        "Destructive SQL operation": (
            "Manage schema changes using reversible Alembic migrations rather than ad-hoc raw SQL DROP statements"
        ),
        "Unsafe eval() call": (
            "Avoid eval(). Use ast.literal_eval() for safe data deserialization or typed Pydantic models"
        ),
        "Silent exception swallowing": (
            "Log the exception with appropriate severity before passing or re-raising"
        ),
        "Debug print statements in production code": (
            "Replace print() with structured logging using the project's logger"
        ),
        "Blocking sleep call": (
            "Use await asyncio.sleep() in async functions or offload long-running tasks to background worker queues"
        ),
        "Shell command execution": (
            "Use subprocess.run() with shell=False and validate all inputs"
        ),
    }

    fixes = []
    for v in violations:
        fix = fixes_map.get(v.get("rule", ""), None)
        if not fix:
            fix = fixes_map.get(v.get("description", ""), None)
        if not fix and v.get("suggested_fix"):
            fix = v["suggested_fix"]
        if fix and fix not in fixes:
            fixes.append(fix)

    if not fixes:
        fixes.append("Review the changes against the project's architecture guidelines")
        fixes.append("Ensure all new code has corresponding unit tests")

    return fixes


def _suggest_tests(files: List[str], diff: str) -> List[str]:
    """Suggest specific tests to add."""
    tests = []

    if any("route" in f or "endpoint" in f or "api" in f for f in files):
        tests.append("test_<endpoint>_success: Happy path with valid input and mocked services")
        tests.append("test_<endpoint>_invalid_input: Verify 422 response for missing/invalid fields")
        tests.append("test_<endpoint>_unauthorized: Verify 401/403 for unauthenticated requests")

    if "payment" in diff.lower() or "stripe" in diff.lower():
        tests.append("test_payment_success: Mock payment provider and verify order creation")
        tests.append("test_payment_failure: Verify no order is created if payment fails")
        tests.append("test_payment_duplicate: Verify idempotency for duplicate payment attempts")

    if "auth" in " ".join(files).lower():
        tests.append("test_auth_valid_token: Verify successful authentication with valid JWT")
        tests.append("test_auth_expired_token: Verify 401 for expired tokens")

    if not tests:
        tests.append("test_<changed_functionality>: Unit test for the new behavior")
        tests.append("test_<changed_functionality>_edge_cases: Test boundary and error conditions")

    return tests[:8]


def _map_to_components(files: List[str], repo_analysis: Optional[Dict]) -> List[str]:
    """Map changed files to architecture component names."""
    components = set()
    for f in files:
        f_lower = f.lower()
        if "route" in f_lower or "endpoint" in f_lower or "api" in f_lower:
            components.add("API Layer")
        if "service" in f_lower:
            components.add("Services Layer")
        if "repositor" in f_lower or "repo" in f_lower:
            components.add("Repository Layer")
        if "model" in f_lower or "schema" in f_lower:
            components.add("Data Models")
        if "auth" in f_lower or "jwt" in f_lower:
            components.add("Auth Layer")
        if "payment" in f_lower or "stripe" in f_lower:
            components.add("Payment Processing")
        if "test" in f_lower or "spec" in f_lower:
            components.add("Test Suite")
        if "migration" in f_lower:
            components.add("Database Migrations")
        if "frontend" in f_lower or ".tsx" in f_lower or ".jsx" in f_lower:
            components.add("Frontend SPA")

    if not components:
        components.add("Application Core")

    return sorted(components)
