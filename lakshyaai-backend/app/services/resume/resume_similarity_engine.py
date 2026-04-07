from __future__ import annotations

from uuid import UUID

import numpy as np
from sqlalchemy.orm import Session

from app.db import models
from app.services.resume.contracts import SimilarityMatch


class ResumeSimilarityEngine:
    @staticmethod
    def cosine_similarity(vector_a: list[float], vector_b: list[float]) -> float:
        if vector_a is None or vector_b is None:
            return 0.0

        a = np.array(vector_a, dtype=float)
        b = np.array(vector_b, dtype=float)
        if a.size == 0 or b.size == 0:
            return 0.0
        denominator = np.linalg.norm(a) * np.linalg.norm(b)
        if denominator == 0:
            return 0.0
        return float(np.dot(a, b) / denominator)

    @classmethod
    def find_similar_resumes(
        cls,
        db: Session,
        resume_id: UUID,
        embedding: list[float],
        *,
        user_id: UUID | None = None,
        limit: int = 5,
    ) -> list[dict]:
        query = db.query(models.ResumeEmbedding).join(models.Resume)
        query = query.filter(models.ResumeEmbedding.resume_id != resume_id)

        if user_id is not None:
            query = query.filter(models.Resume.user_id == user_id)

        candidates = query.all()
        matches: list[SimilarityMatch] = []

        for candidate in candidates:
            similarity = cls.cosine_similarity(embedding, candidate.embedding)
            matches.append(
                SimilarityMatch(
                    resume_id=candidate.resume_id,
                    filename=candidate.resume.original_filename,
                    similarity=similarity,
                )
            )

        ranked = sorted(matches, key=lambda item: item.similarity, reverse=True)[:limit]
        return [match.to_dict() for match in ranked]
