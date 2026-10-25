from __future__ import annotations

import logging
from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ValidationException
from app.core.dependencies import get_current_user
from app.db import models
from app.db.database import get_db
from app.db.schemas import (
    ResumeCreate,
    ResumeDetailResponse,
    ResumeFeedbackResponse,
    ResumeListItemResponse,
    ResumeResponse,
    ResumeRewriteListItem,
    ResumeRewriteRequest,
    ResumeRewriteResponse,
    ResumeSelectorItem,
    ResumeSimilarityResponse,
)
from app.services.resume.latex_compiler import compile_latex_to_pdf
from app.services.resume.rewrite_storage import ResumeRewriteStorage
from app.services.resume.resume_service import ResumeService
from app.services.storage.file_storage import FileStorageService

router = APIRouter(prefix="/resumes", tags=["Resumes"])
rewrite_router = APIRouter(prefix="/resume", tags=["Resume Rewrite"])
logger = logging.getLogger("lakshyaai.resume_rewrite")


def _rewrite_response_payload(
    request: ResumeRewriteRequest,
    current_user: models.User,
    db: Session | None = None,
) -> dict[str, str | dict]:
    try:
        logger.info("Resume rewrite request received user_id=%s text_length=%s", current_user.id, len(request.text))

        result = ResumeService.rewrite_resume(
            user=current_user,
            resume_text=request.text,
            job_description=request.job_description or "",
        )
        logger.info("Resume rewrite service completed user_id=%s", current_user.id)

        try:
            pdf_bytes = compile_latex_to_pdf(result["latex"])
            logger.info("LaTeX compilation completed user_id=%s pdf_size=%s", current_user.id, len(pdf_bytes))
        except Exception as latex_exc:
            logger.warning("LaTeX PDF compilation failed or compiler unavailable: %s", latex_exc)
            pdf_bytes = b""

        document_id = ResumeRewriteStorage.store(
            user_id=current_user.id,
            latex=result["latex"],
            pdf_bytes=pdf_bytes,
            structured=result["structured"],
            preview=result["rewritten"],
        )
        logger.info("Resume rewrite stored user_id=%s document_id=%s", current_user.id, document_id)

        # Persist in PostgreSQL
        if db is not None:
            try:
                rewrite_record = models.ResumeRewrite(
                    id=UUID(document_id),
                    user_id=current_user.id,
                    title="Optimized Resume",
                    latex_content=result["latex"],
                    preview_text=result.get("rewritten", ""),
                    structured_data=result.get("structured", {}),
                    pdf_path=f"/api/resume/rewrite/{document_id}/pdf",
                    tex_path=f"/api/resume/rewrite/{document_id}/tex",
                )
                db.add(rewrite_record)
                db.commit()
            except Exception as e:
                logger.warning("Could not persist ResumeRewrite metadata: %s", e)
                db.rollback()

        return {
            **result,
            "document_id": document_id,
            "pdf_url": f"/api/resume/rewrite/{document_id}/pdf",
            "tex_url": f"/api/resume/rewrite/{document_id}/tex",
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Resume rewrite failed user_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/", response_model=ResumeResponse)
def create_resume(
    resume: ResumeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return ResumeService.create_resume(
        db,
        user=current_user,
        original_filename=resume.original_filename,
        parsed_text=resume.parsed_text,
        job_description=resume.job_description or "",
    )


@router.post("/upload", response_model=ResumeResponse)
@rewrite_router.post("/upload", response_model=ResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    job_description: Annotated[str | None, Form()] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise ValidationException("Only PDF files are supported")

    file_bytes = await file.read()
    return ResumeService.create_resume_from_pdf(
        db,
        user=current_user,
        filename=file.filename,
        file_bytes=file_bytes,
        job_description=job_description or "",
    )


@router.get("/", response_model=list[ResumeListItemResponse])
def get_user_resumes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return ResumeService.list_resumes(db, current_user.id)


@router.get("/selector", response_model=list[ResumeSelectorItem])
def get_resume_selector(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return ResumeService.get_selector(db, current_user.id)


@router.get("/{resume_id}/feedback", response_model=ResumeFeedbackResponse)
def get_resume_feedback(
    resume_id: UUID,
    job_description: str = "",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return ResumeService.get_feedback(db, resume_id, current_user.id, job_description)


@router.get("/{resume_id}/similar", response_model=ResumeSimilarityResponse)
def find_similar_resumes(
    resume_id: UUID,
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return ResumeService.find_similar_resumes(db, resume_id, current_user.id, limit=limit)


@router.get("/{resume_id}/file")
@router.get("/{resume_id}/download")
def download_original_resume(
    resume_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    resume = (
        db.query(models.Resume)
        .filter(
            models.Resume.id == resume_id,
            models.Resume.user_id == current_user.id,
        )
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if not resume.file_path:
        raise HTTPException(status_code=404, detail="Original resume file not found on storage")

    path = FileStorageService.get_resume_path(resume.file_path)
    if not path:
        raise HTTPException(status_code=404, detail="Resume file missing from storage directory")

    return FileResponse(
        path,
        media_type=resume.mime_type or "application/pdf",
        filename=resume.original_filename or "resume.pdf",
    )


@router.post("/rewrite", response_model=ResumeRewriteResponse)
async def rewrite_resume(
    request: ResumeRewriteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return _rewrite_response_payload(request, current_user, db)


@router.post("/rewrite/pdf")
async def rewrite_resume_pdf(
    request: ResumeRewriteRequest,
    current_user: models.User = Depends(get_current_user),
):
    rewrite_result = ResumeService.rewrite_resume(
        user=current_user,
        resume_text=request.text,
        job_description=request.job_description or "",
    )
    pdf_bytes = compile_latex_to_pdf(rewrite_result["latex"])

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=ai_resume.pdf"},
    )


@rewrite_router.post("/rewrite", response_model=ResumeRewriteResponse)
async def rewrite_resume_alias(
    request: ResumeRewriteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return _rewrite_response_payload(request, current_user, db)


@rewrite_router.get("/rewrites", response_model=List[ResumeRewriteListItem])
def list_user_rewrites(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rewrites = (
        db.query(models.ResumeRewrite)
        .filter(models.ResumeRewrite.user_id == current_user.id)
        .order_by(models.ResumeRewrite.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "title": r.title,
            "pdf_url": r.pdf_path or f"/api/resume/rewrite/{r.id}/pdf",
            "tex_url": r.tex_path or f"/api/resume/rewrite/{r.id}/tex",
            "created_at": r.created_at,
        }
        for r in rewrites
    ]


@rewrite_router.get("/rewrite/{document_id}/pdf")
async def download_rewritten_pdf(
    document_id: str,
    current_user: models.User = Depends(get_current_user),
):
    manifest = ResumeRewriteStorage.get_manifest(document_id)
    if manifest.get("owner_id") != str(current_user.id):
        raise ValidationException("You do not have access to this generated resume")
    pdf_path = ResumeRewriteStorage.get_pdf_path(document_id)
    if not pdf_path.exists() or pdf_path.stat().st_size == 0:
        raise HTTPException(status_code=404, detail="PDF preview was not generated for this rewrite")
    return FileResponse(pdf_path, media_type="application/pdf", filename="ai_resume.pdf")


@rewrite_router.get("/rewrite/{document_id}/tex")
async def download_rewritten_tex(
    document_id: str,
    current_user: models.User = Depends(get_current_user),
):
    manifest = ResumeRewriteStorage.get_manifest(document_id)
    if manifest.get("owner_id") != str(current_user.id):
        raise ValidationException("You do not have access to this generated resume")
    tex_path = ResumeRewriteStorage.get_tex_path(document_id)
    return FileResponse(tex_path, media_type="application/x-tex", filename="ai_resume.tex")


@router.get("/{resume_id}", response_model=ResumeDetailResponse)
def get_resume(
    resume_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return ResumeService.get_resume(db, resume_id, current_user.id)


@router.delete("/{resume_id}")
def delete_resume(
    resume_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ResumeService.delete_resume(db, resume_id, current_user.id)
    return {"message": "Resume deleted successfully"}
