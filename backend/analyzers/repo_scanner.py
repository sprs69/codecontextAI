"""
Repository scanner: walks a local filesystem path and collects metadata.
"""
import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from collections import defaultdict


LANGUAGE_EXTENSIONS: Dict[str, str] = {
    ".py": "Python",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".java": "Java",
    ".go": "Go",
    ".rs": "Rust",
    ".cs": "C#",
    ".cpp": "C++",
    ".c": "C",
    ".rb": "Ruby",
    ".php": "PHP",
    ".swift": "Swift",
    ".kt": "Kotlin",
    ".sql": "SQL",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".json": "JSON",
    ".md": "Markdown",
    ".sh": "Shell",
    ".dockerfile": "Dockerfile",
}

IGNORE_DIRS = {
    ".git", ".svn", "node_modules", "__pycache__", ".pytest_cache",
    "venv", ".venv", "env", ".env", "dist", "build", ".next",
    ".nuxt", "coverage", ".mypy_cache", ".tox", "eggs", ".eggs",
    "*.egg-info", ".cache", "tmp", ".tmp",
}

FRAMEWORK_SIGNATURES: Dict[str, List[str]] = {
    "FastAPI": ["from fastapi", "import fastapi", "FastAPI()"],
    "Django": ["from django", "import django", "INSTALLED_APPS"],
    "Flask": ["from flask", "import Flask", "Flask(__name__)"],
    "React": ['"react"', "'react'", "import React"],
    "Vue": ['"vue"', "'vue'", "createApp"],
    "Angular": ["@NgModule", "@Component", "@angular/core"],
    "SQLAlchemy": ["from sqlalchemy", "import sqlalchemy"],
    "Alembic": ["from alembic", "alembic.ini"],
    "Celery": ["from celery", "Celery("],
    "Redis": ["import redis", "from redis"],
    "pytest": ["import pytest", "from pytest"],
    "Vite": ['"vite"', "'vite'"],
    "Next.js": ['"next"', "from 'next'"],
    "Express": ["require('express')", 'require("express")'],
    "Spring Boot": ["@SpringBootApplication", "spring-boot"],
    "Gin": ["gin.Default()", "\"github.com/gin-gonic/gin\""],
}

IMPORTANT_FILE_PATTERNS = [
    r"main\.py$", r"app\.py$", r"server\.py$", r"index\.py$",
    r"main\.ts$", r"app\.ts$", r"index\.ts$",
    r"main\.js$", r"app\.js$", r"index\.js$",
    r"requirements\.txt$", r"package\.json$", r"Pipfile$", r"pyproject\.toml$",
    r"docker-compose\.ya?ml$", r"Dockerfile$",
    r"\.env\.example$", r"\.env\.template$",
    r"alembic\.ini$", r"migrations/env\.py$",
    r"README\.md$", r"CONTRIBUTING\.md$",
    r"setup\.py$", r"setup\.cfg$",
    r"tsconfig\.json$", r"vite\.config\.(ts|js)$", r"webpack\.config\.js$",
    r"routes?\.py$", r"urls?\.py$", r"router\.(ts|js)$",
    r"models?\.py$", r"schema\.py$", r"schemas?\.py$",
    r"auth\.(py|ts|js)$", r"jwt\.(py|ts|js)$",
    r"config\.(py|ts|js|yaml|yml|json)$",
]

DEPENDENCY_FILES = {
    "requirements.txt": "python",
    "Pipfile": "python",
    "pyproject.toml": "python",
    "package.json": "node",
    "go.mod": "go",
    "Cargo.toml": "rust",
    "pom.xml": "java",
    "build.gradle": "java",
    "Gemfile": "ruby",
}


class RepositoryScanner:
    """Scans a local repository directory and extracts metadata."""

    def __init__(self, repo_path: str):
        self.repo_path = Path(repo_path).resolve()
        self._file_cache: List[Path] = []
        self._content_cache: Dict[str, str] = {}

    def _should_ignore(self, path: Path) -> bool:
        for part in path.parts:
            if part in IGNORE_DIRS or part.endswith(".egg-info"):
                return True
        return False

    def _collect_files(self) -> List[Path]:
        if self._file_cache:
            return self._file_cache
        files = []
        for f in self.repo_path.rglob("*"):
            if f.is_file() and not self._should_ignore(f.relative_to(self.repo_path)):
                files.append(f)
        self._file_cache = files
        return files

    def _read_file(self, path: Path, max_bytes: int = 50000) -> str:
        key = str(path)
        if key not in self._content_cache:
            try:
                content = path.read_text(encoding="utf-8", errors="ignore")[:max_bytes]
                self._content_cache[key] = content
            except Exception:
                self._content_cache[key] = ""
        return self._content_cache[key]

    def detect_languages(self) -> Tuple[List[Dict], int, int]:
        """Returns (language_list, total_files, total_lines)."""
        lang_counts: Dict[str, int] = defaultdict(int)
        lang_lines: Dict[str, int] = defaultdict(int)
        total_files = 0
        total_lines = 0

        for f in self._collect_files():
            ext = f.suffix.lower()
            lang = LANGUAGE_EXTENSIONS.get(ext)
            if lang:
                total_files += 1
                try:
                    lines = len(f.read_text(encoding="utf-8", errors="ignore").splitlines())
                    lang_counts[lang] += 1
                    lang_lines[lang] += lines
                    total_lines += lines
                except Exception:
                    lang_counts[lang] += 1

        total = sum(lang_counts.values()) or 1
        languages = [
            {
                "name": lang,
                "percentage": round(count / total * 100, 1),
                "files": count,
            }
            for lang, count in sorted(lang_counts.items(), key=lambda x: -x[1])
        ]
        return languages, total_files, total_lines

    def detect_frameworks(self) -> List[str]:
        """Scan file contents for framework signatures."""
        detected = set()
        all_content = ""
        for f in self._collect_files():
            if f.suffix.lower() in LANGUAGE_EXTENSIONS:
                all_content += self._read_file(f) + "\n"
            if len(all_content) > 500_000:
                break

        for framework, signatures in FRAMEWORK_SIGNATURES.items():
            if any(sig in all_content for sig in signatures):
                detected.add(framework)

        return sorted(detected)

    def detect_directories(self) -> List[str]:
        """Return significant directories (not ignored)."""
        dirs = set()
        for f in self._collect_files():
            rel = f.relative_to(self.repo_path)
            for i in range(1, len(rel.parts)):
                parent = str(Path(*rel.parts[:i]))
                if not any(part in IGNORE_DIRS for part in Path(parent).parts):
                    dirs.add(parent.replace("\\", "/"))
        return sorted(dirs)[:40]

    def detect_important_files(self) -> List[str]:
        """Identify key project files by pattern matching."""
        important = []
        for f in self._collect_files():
            rel_str = str(f.relative_to(self.repo_path)).replace("\\", "/")
            for pattern in IMPORTANT_FILE_PATTERNS:
                if re.search(pattern, rel_str, re.IGNORECASE):
                    important.append(rel_str)
                    break
        return important[:30]

    def detect_dependencies(self) -> List[Dict]:
        """Parse dependency files and extract package info."""
        deps = []
        for f in self._collect_files():
            fname = f.name
            if fname in DEPENDENCY_FILES:
                content = self._read_file(f)
                pkg_type = DEPENDENCY_FILES[fname]
                if pkg_type == "python" and fname == "requirements.txt":
                    deps.extend(self._parse_requirements_txt(content))
                elif pkg_type == "node" and fname == "package.json":
                    deps.extend(self._parse_package_json(content))
        return deps

    def _parse_requirements_txt(self, content: str) -> List[Dict]:
        deps = []
        for line in content.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            match = re.match(r"^([A-Za-z0-9_\-\.]+)([>=<!~^]{1,2}[\d\.]+)?", line)
            if match:
                name = match.group(1).lower()
                version_str = match.group(2) or ""
                version = version_str.lstrip("><=!~^") if version_str else None
                deps.append({"name": name, "version": version, "type": "runtime"})
        return deps

    def _parse_package_json(self, content: str) -> List[Dict]:
        import json
        deps = []
        try:
            data = json.loads(content)
            for name, version in (data.get("dependencies") or {}).items():
                deps.append({"name": name, "version": version.lstrip("^~>="), "type": "runtime"})
            for name, version in (data.get("devDependencies") or {}).items():
                deps.append({"name": name, "version": version.lstrip("^~>="), "type": "dev"})
        except Exception:
            pass
        return deps

    def detect_architecture_components(self) -> List[Dict]:
        """Heuristically build architecture component map from directory structure."""
        components = []
        dirs = self.detect_directories()

        type_map = {
            "frontend": "frontend",
            "ui": "frontend",
            "client": "frontend",
            "web": "frontend",
            "backend": "backend",
            "server": "backend",
            "api": "api",
            "routes": "api",
            "endpoints": "api",
            "service": "service",
            "services": "service",
            "database": "database",
            "db": "database",
            "repositories": "backend",
            "repository": "backend",
            "utils": "utility",
            "helpers": "utility",
            "middleware": "service",
            "auth": "service",
            "models": "backend",
            "schemas": "backend",
            "migrations": "database",
            "tasks": "service",
            "workers": "service",
        }

        seen_types = set()
        for d in dirs:
            parts = d.lower().split("/")
            leaf = parts[-1]
            comp_type = type_map.get(leaf)
            if comp_type and comp_type not in seen_types:
                seen_types.add(comp_type)
                # collect files in this directory
                dir_path = self.repo_path / d
                files = []
                if dir_path.is_dir():
                    files = [
                        str(f.relative_to(self.repo_path)).replace("\\", "/")
                        for f in dir_path.rglob("*")
                        if f.is_file() and not self._should_ignore(f.relative_to(self.repo_path))
                    ][:8]
                components.append({
                    "name": leaf.replace("_", " ").title(),
                    "type": comp_type,
                    "path": d,
                    "description": f"{leaf.title()} module",
                    "files": files,
                    "dependencies": [],
                })

        return components

    def detect_patterns(self) -> List[Dict]:
        """Detect software patterns from directory/file naming conventions."""
        patterns = []
        dirs_lower = set(d.lower() for d in self.detect_directories())
        files_lower = set(
            str(f.relative_to(self.repo_path)).replace("\\", "/").lower()
            for f in self._collect_files()
        )

        checks = [
            ("repositories" in dirs_lower or "repository" in dirs_lower,
             "Repository Pattern", "Data access abstracted behind repository interfaces", 0.88),
            ("services" in dirs_lower or "service" in dirs_lower,
             "Service Layer Pattern", "Business logic in dedicated service classes", 0.85),
            ("middleware" in dirs_lower,
             "Middleware Pipeline", "Request/response processing pipeline", 0.90),
            (any("jwt" in f or "token" in f for f in files_lower),
             "JWT Authentication", "Token-based stateless authentication", 0.92),
            (any("celery" in f or "worker" in f or "tasks" in f for f in files_lower),
             "Async Task Queue", "Background processing via task queue", 0.80),
            (any("migration" in f or "alembic" in f for f in files_lower),
             "Database Migrations", "Versioned schema migration management", 0.95),
            (any("test_" in f or "_test." in f for f in files_lower),
             "Automated Testing", "Test suite covering application logic", 0.87),
            ("docker-compose.yml" in files_lower or any("dockerfile" in f for f in files_lower),
             "Containerization (Docker)", "Application packaged in containers", 0.93),
        ]

        for condition, name, description, confidence in checks:
            if condition:
                patterns.append({
                    "name": name,
                    "description": description,
                    "confidence": confidence,
                    "files": [],
                })

        return patterns

    def scan(self) -> Dict:
        """Run the full scan and return a structured result."""
        languages, total_files, total_lines = self.detect_languages()
        frameworks = self.detect_frameworks()
        directories = self.detect_directories()
        important_files = self.detect_important_files()
        dependencies = self.detect_dependencies()
        architecture_components = self.detect_architecture_components()
        patterns = self.detect_patterns()

        # Basic risk detection
        risks = []
        all_content_sample = ""
        for f in self._collect_files()[:50]:
            all_content_sample += self._read_file(f) + "\n"

        if re.search(r"(password|secret|api_key)\s*=\s*['\"][^'\"]{6,}", all_content_sample, re.I):
            risks.append({
                "name": "Hardcoded Secrets",
                "description": "Potential credentials or secrets found hardcoded in source files",
                "severity": "HIGH",
                "files": [],
            })

        if total_files > 0 and not any("test" in d.lower() for d in directories):
            risks.append({
                "name": "No Test Directory Detected",
                "description": "No test directory found — test coverage may be missing",
                "severity": "MEDIUM",
                "files": [],
            })

        health_score = min(
            100,
            max(20, 60 + len(patterns) * 4 - len(risks) * 10),
        )

        project_name = self.repo_path.name

        return {
            "project_name": project_name,
            "languages": languages,
            "frameworks": frameworks,
            "directories": directories,
            "important_files": important_files,
            "dependencies": dependencies,
            "architecture_components": architecture_components,
            "detected_patterns": patterns,
            "potential_risks": risks,
            "total_files": total_files,
            "total_lines": total_lines,
            "health_score": health_score,
        }
