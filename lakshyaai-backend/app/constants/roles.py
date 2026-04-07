from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.database import get_db
from app.db import models
from app.core.dependencies import get_current_user
from app.services.resume.embedding_engine import EmbeddingEngine
from app.services.role.role_alignment_engine import RoleAlignmentEngine

router = APIRouter(prefix="/roles", tags=["Roles"])


# =========================
# CREATE ROLE
# =========================

@router.post("/")
def create_role(
    name: str,
    description: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):

    existing_role = db.query(models.Role).filter(
        models.Role.name == name
    ).first()

    if existing_role:
        raise HTTPException(status_code=400, detail="Role already exists")

    new_role = models.Role(
        name=name,
        description=description
    )

    db.add(new_role)
    db.commit()
    db.refresh(new_role)

    # Generate embedding
    role_text = f"{name} {description}"
    vector = EmbeddingEngine.generate(role_text)

    role_embedding = models.RoleEmbedding(
        role_id=new_role.id,
        embedding=vector
    )

    db.add(role_embedding)
    db.commit()

    return {
        "message": "Role created successfully",
        "role_id": new_role.id
    }


# =========================
# GET ROLES
# =========================

@router.get("/")
def get_roles(db: Session = Depends(get_db)):
    roles = db.query(models.Role).all()
    return roles


# =========================
# ALIGN RESUME WITH ROLES
# =========================

@router.get("/align/{resume_id}")
def align_resume_to_roles(
    resume_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):

    resume_embedding = db.query(models.ResumeEmbedding).filter(
        models.ResumeEmbedding.resume_id == resume_id
    ).first()

    if not resume_embedding:
        raise HTTPException(status_code=404, detail="Resume embedding not found")

    matches = RoleAlignmentEngine.find_best_roles(
        db,
        resume_embedding.embedding
    )

    return {
        "resume_id": resume_id,
        "matches": matches
    }


# =========================
# GET ROLE BY ID
# =========================

@router.get("/{role_id}")
def get_role(role_id: UUID, db: Session = Depends(get_db)):

    role = db.query(models.Role).filter(
        models.Role.id == role_id
    ).first()

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    return role