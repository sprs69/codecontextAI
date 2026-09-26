"""
Repository API routes.
"""
import os
import tempfile
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.models.db_models import Repository, ArchitectureRule, GuardrailViolation
from backend.models.schemas import RepositoryResponse, RepositoryAnalyzeRequest
from backend.services.repository_service import (
    load_demo_repository,
    analyze_local_repository,
    analyze_zip_repository,
)
from backend.services.decision_service import seed_demo_decisions

router = APIRouter(prefix="/api/repository", tags=["repository"])


@router.get("/list", response_model=List[RepositoryResponse])
def list_repositories(db: Session = Depends(get_db)):
    """List all analyzed repositories."""
    repos = db.query(Repository).order_by(Repository.created_at.desc()).all()
    return repos


@router.get("/current", response_model=Optional[RepositoryResponse])
def get_current_repository(db: Session = Depends(get_db)):
    """Get the latest analyzed or demo repository."""
    repo = db.query(Repository).order_by(Repository.created_at.desc()).first()
    if not repo:
        repo = load_demo_repository(db)
        seed_demo_decisions(db, repo.id)
    return repo


@router.get("/{repo_id}", response_model=RepositoryResponse)
def get_repository(repo_id: str, db: Session = Depends(get_db)):
    """Get a specific repository by ID."""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo


@router.post("/demo", response_model=RepositoryResponse)
def load_demo(db: Session = Depends(get_db)):
    """
    Load the built-in ShopFlow demo repository.
    Use this to explore all features without a real repository.
    """
    repo = load_demo_repository(db)
    seed_demo_decisions(db, repo.id)
    return repo


@router.post("/analyze", response_model=RepositoryResponse)
def analyze_repository(request: RepositoryAnalyzeRequest, db: Session = Depends(get_db)):
    """
    Analyze a repository from a local filesystem path.
    
    Body:
    - path: Absolute path to the repository directory
    - use_demo: If true, loads the built-in demo dataset instead
    """
    if request.use_demo:
        repo = load_demo_repository(db)
        seed_demo_decisions(db, repo.id)
        return repo

    if not request.path:
        raise HTTPException(status_code=400, detail="Either 'path' or 'use_demo=true' is required")

    try:
        repo = analyze_local_repository(db, request.path)
        return repo
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/upload", response_model=RepositoryResponse)
async def upload_repository(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a repository ZIP file for analysis.
    The ZIP should contain the repository root at the top level or in a single subdirectory.
    """
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only ZIP files are supported")

    MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50 MB
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="Uploaded file exceeds maximum limit of 50MB")

    # Save upload to temp file
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        repo = analyze_zip_repository(db, tmp_path)
        # Use uploaded filename as repo name
        repo.name = file.filename.replace(".zip", "")
        db.commit()
        return repo
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload analysis failed: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.delete("/{repo_id}")
def delete_repository(repo_id: str, db: Session = Depends(get_db)):
    """Delete a repository and all associated data."""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    db.query(ArchitectureRule).filter(ArchitectureRule.repository_id == repo_id).delete()
    db.query(GuardrailViolation).filter(GuardrailViolation.repository_id == repo_id).delete()
    db.delete(repo)
    db.commit()
    return {"message": "Repository deleted successfully"}
