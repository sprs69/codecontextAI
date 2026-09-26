"""
Repository service: orchestrates scanning, analysis and persistence.
"""
import os
import zipfile
import shutil
import uuid
import tempfile
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from backend.analyzers.repo_scanner import RepositoryScanner
from backend.analyzers.guardrail_analyzer import GuardrailAnalyzer, BUILTIN_RULES
from backend.models.db_models import Repository, ArchitectureRule, GuardrailViolation
from backend.data.demo_data import (
    DEMO_ANALYSIS_RESULT, DEMO_GUARDRAIL_VIOLATIONS, DEMO_DECISIONS,
)


def load_demo_repository(db: Session) -> Repository:
    """
    Load the built-in ShopFlow demo repository into the database.
    Returns the Repository record.
    """
    # Check if demo already exists
    existing = db.query(Repository).filter(Repository.source_type == "demo").first()
    if existing:
        return existing

    repo_id = str(uuid.uuid4())
    repo = Repository(
        id=repo_id,
        name="ShopFlow Platform (Demo)",
        path=None,
        source_type="demo",
        status="ready",
        analysis_result=DEMO_ANALYSIS_RESULT,
    )
    db.add(repo)

    # Seed architecture rules
    for rule_data in BUILTIN_RULES:
        rule = ArchitectureRule(
            repository_id=repo_id,
            rule=rule_data["rule"],
            description=rule_data["description"],
            severity=rule_data["severity"],
            category=rule_data.get("category"),
        )
        db.add(rule)

    # Seed guardrail violations
    for v_data in DEMO_GUARDRAIL_VIOLATIONS:
        violation = GuardrailViolation(
            repository_id=repo_id,
            rule=v_data["rule"],
            severity=v_data["severity"],
            file_path=v_data["file_path"],
            line_number=v_data.get("line_number"),
            explanation=v_data["explanation"],
            suggested_fix=v_data["suggested_fix"],
            status="open",
        )
        db.add(violation)

    db.commit()
    db.refresh(repo)
    return repo


MAX_EXTRACTED_SIZE = 150 * 1024 * 1024  # 150 MB
MAX_FILE_COUNT = 10000


def validate_scan_path(path_str: str) -> Path:
    """Validate and sanitize local repository path for scanning."""
    if not path_str or not path_str.strip():
        raise ValueError("Repository path cannot be empty")

    resolved = Path(path_str.strip()).resolve()
    if not resolved.exists() or not resolved.is_dir():
        raise ValueError(f"Path does not exist or is not a directory: {path_str}")

    resolved_str = str(resolved).lower().replace("\\", "/")

    # Restrict system roots and sensitive OS directories
    disallowed_roots = [
        "/", "c:/", "d:/", "e:/",
        "/etc", "/root", "/bin", "/sbin", "/usr", "/proc", "/sys", "/dev",
        "c:/windows", "c:/program files", "c:/program files (x86)", "c:/programdata",
    ]

    if resolved_str in disallowed_roots or resolved_str.rstrip("/") in disallowed_roots:
        raise ValueError("Cannot scan root filesystem or system directories")

    for root_dir in disallowed_roots:
        if root_dir.endswith("/"):
            continue
        if resolved_str == root_dir or resolved_str.startswith(root_dir + "/"):
            raise ValueError("Scanning system or protected OS directories is not permitted")

    return resolved


def _safe_extract_zip(zf: zipfile.ZipFile, target_dir: str):
    """Safely extract ZIP file protecting against path traversal and zip bombs."""
    resolved_target = Path(target_dir).resolve()
    total_size = 0
    file_count = 0

    for member in zf.infolist():
        file_count += 1
        if file_count > MAX_FILE_COUNT:
            raise ValueError(f"ZIP contains too many files (maximum allowed is {MAX_FILE_COUNT})")

        total_size += member.file_size
        if total_size > MAX_EXTRACTED_SIZE:
            raise ValueError(
                f"ZIP extracted content exceeds maximum allowed limit ({MAX_EXTRACTED_SIZE // (1024 * 1024)}MB)"
            )

        name = member.filename
        # Disallow absolute paths
        if name.startswith("/") or name.startswith("\\"):
            raise ValueError(f"Unsafe absolute path in ZIP entry: {name}")

        dest_path = (resolved_target / name).resolve()
        # Verify target is strictly within the extraction directory
        if not str(dest_path).startswith(str(resolved_target)):
            raise ValueError(f"Path traversal detected in ZIP entry: {name}")

    zf.extractall(target_dir)


def analyze_local_repository(db: Session, path: str) -> Repository:
    """Scan a local repository path and persist results."""
    resolved_path = validate_scan_path(path)
    clean_path_str = str(resolved_path)

    repo_id = str(uuid.uuid4())
    repo = Repository(
        id=repo_id,
        name=resolved_path.name,
        path=clean_path_str,
        source_type="local",
        status="analyzing",
    )
    db.add(repo)
    db.commit()

    try:
        # Run scanner
        scanner = RepositoryScanner(clean_path_str)
        analysis_result = scanner.scan()

        # Run guardrail analyzer
        guardrail_result = GuardrailAnalyzer(clean_path_str).run()

        # Persist analysis
        repo.analysis_result = analysis_result
        repo.status = "ready"
        db.commit()

        # Seed architecture rules
        for rule_data in BUILTIN_RULES:
            rule = ArchitectureRule(
                repository_id=repo_id,
                rule=rule_data["rule"],
                description=rule_data["description"],
                severity=rule_data["severity"],
                category=rule_data.get("category"),
            )
            db.add(rule)

        # Persist violations
        for v_data in guardrail_result["violations"]:
            violation = GuardrailViolation(
                repository_id=repo_id,
                rule=v_data["rule"],
                severity=v_data["severity"],
                file_path=v_data["file_path"],
                line_number=v_data.get("line_number"),
                explanation=v_data.get("explanation"),
                suggested_fix=v_data.get("suggested_fix"),
                status="open",
            )
            db.add(violation)

        db.commit()
        db.refresh(repo)
        return repo

    except Exception as e:
        repo.status = "error"
        db.commit()
        raise


def analyze_zip_repository(db: Session, zip_path: str) -> Repository:
    """Extract a ZIP securely, analyze it, and clean up temporary files."""
    temp_dir = tempfile.mkdtemp(prefix="codecontext_")
    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            _safe_extract_zip(zf, temp_dir)

        # Find the root of the extracted content
        extracted_items = os.listdir(temp_dir)
        if len(extracted_items) == 1 and os.path.isdir(os.path.join(temp_dir, extracted_items[0])):
            extract_path = os.path.join(temp_dir, extracted_items[0])
        else:
            extract_path = temp_dir

        repo = analyze_local_repository(db, extract_path)
        # Update name from ZIP filename and tag as zip source
        repo.name = Path(zip_path).stem
        repo.source_type = "zip"
        db.commit()
        return repo
    finally:
        # Secure cleanup of temporary extraction directory
        shutil.rmtree(temp_dir, ignore_errors=True)
