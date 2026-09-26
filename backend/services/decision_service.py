"""
Decision service: creates, extracts and manages technical decisions.
"""
import uuid
import re
from typing import Dict, Optional, List
from datetime import datetime

from sqlalchemy.orm import Session

from backend.models.db_models import TechnicalDecision
from backend.data.demo_data import DEMO_DECISIONS


def seed_demo_decisions(db: Session, repository_id: str):
    """Seed the demo technical decisions for a repository."""
    existing = db.query(TechnicalDecision).filter(
        TechnicalDecision.repository_id == repository_id
    ).count()
    if existing > 0:
        return

    for d in DEMO_DECISIONS:
        decision = TechnicalDecision(
            repository_id=repository_id,
            title=d["title"],
            context=d["context"],
            problem=d["problem"],
            chosen_approach=d["chosen_approach"],
            alternatives=d["alternatives"],
            reasoning=d["reasoning"],
            affected_components=d["affected_components"],
            status=d["status"],
        )
        db.add(decision)
    db.commit()


def create_decision(db: Session, repository_id: str, data: Dict) -> TechnicalDecision:
    """Create a new technical decision."""
    decision = TechnicalDecision(
        repository_id=repository_id,
        title=data["title"],
        context=data.get("context"),
        problem=data.get("problem"),
        chosen_approach=data.get("chosen_approach"),
        alternatives=data.get("alternatives", []),
        reasoning=data.get("reasoning"),
        affected_components=data.get("affected_components", []),
        status=data.get("status", "active"),
    )
    db.add(decision)
    db.commit()
    db.refresh(decision)
    return decision


def extract_decision_from_text(text: str) -> Dict:
    """
    Parse a free-form text (commit message, PR description, meeting notes)
    and extract a structured technical decision.
    
    Uses heuristics to identify key decision components.
    """
    result = {
        "title": "",
        "context": "",
        "problem": "",
        "chosen_approach": "",
        "alternatives": [],
        "reasoning": "",
        "affected_components": [],
        "status": "active",
    }

    lines = text.strip().splitlines()
    if not lines:
        return result

    # Title: first non-empty line or text before first period
    result["title"] = lines[0].strip()[:120]

    # Try to extract sections by keywords
    lower_text = text.lower()

    # Context
    ctx_match = re.search(
        r"(?:context|background|situation)[:\s]+(.+?)(?=\n\n|\Z)",
        text, re.IGNORECASE | re.DOTALL,
    )
    if ctx_match:
        result["context"] = ctx_match.group(1).strip()[:500]

    # Problem
    prob_match = re.search(
        r"(?:problem|issue|challenge|why)[:\s]+(.+?)(?=\n\n|\Z)",
        text, re.IGNORECASE | re.DOTALL,
    )
    if prob_match:
        result["problem"] = prob_match.group(1).strip()[:500]

    # Decision / Approach
    dec_match = re.search(
        r"(?:decision|approach|solution|chose|we will|we decided)[:\s]+(.+?)(?=\n\n|\Z)",
        text, re.IGNORECASE | re.DOTALL,
    )
    if dec_match:
        result["chosen_approach"] = dec_match.group(1).strip()[:500]
    elif len(lines) > 1:
        result["chosen_approach"] = " ".join(lines[1:3]).strip()[:300]

    # Alternatives
    alt_section = re.search(
        r"(?:alternatives?|considered|options?)[:\s]+(.+?)(?=\n\n|\Z)",
        text, re.IGNORECASE | re.DOTALL,
    )
    if alt_section:
        alt_text = alt_section.group(1)
        alts = re.split(r"\n[-*•]\s*|\n\d+\.\s*", alt_text)
        result["alternatives"] = [a.strip() for a in alts if a.strip()][:5]

    # Reasoning
    reason_match = re.search(
        r"(?:reason|rationale|because|justification)[:\s]+(.+?)(?=\n\n|\Z)",
        text, re.IGNORECASE | re.DOTALL,
    )
    if reason_match:
        result["reasoning"] = reason_match.group(1).strip()[:500]

    # Affected components: look for file paths or module names
    file_paths = re.findall(r"[\w/\-]+\.(?:py|ts|js|go|java|rb)", text)
    module_names = re.findall(r"\b(?:service|repository|model|route|controller|api|auth)\w*\b", text, re.I)
    affected = list(set(file_paths[:5] + [m.lower() for m in module_names[:5]]))
    result["affected_components"] = affected[:8]

    # Fallback: if no structured parsing succeeded, use full text as context
    if not result["context"] and not result["problem"]:
        result["context"] = text.strip()[:500]

    return result
