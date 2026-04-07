from __future__ import annotations

from sqlalchemy.orm import Session

from app.db import models


class UserCareerStateService:
    @staticmethod
    def upsert(
        db: Session,
        *,
        user_id,
        best_role: str,
        score: int,
        confidence: str,
    ) -> models.UserCareerState:
        state = (
            db.query(models.UserCareerState)
            .filter(models.UserCareerState.user_id == user_id)
            .first()
        )

        if state is None:
            state = models.UserCareerState(
                user_id=user_id,
                best_role=best_role,
                score=float(score),
                confidence=confidence,
            )
            db.add(state)
        else:
            state.best_role = best_role
            state.score = float(score)
            state.confidence = confidence

        db.commit()
        db.refresh(state)
        return state

    @staticmethod
    def serialize(state: models.UserCareerState | None) -> dict[str, object]:
        if state is None:
            return {
                "id": None,
                "user_id": None,
                "best_role": "",
                "score": 0,
                "confidence": "Low",
                "updated_at": None,
            }

        return {
            "id": state.id,
            "user_id": state.user_id,
            "best_role": state.best_role,
            "score": int(round(state.score or 0)),
            "confidence": state.confidence,
            "updated_at": state.updated_at,
        }
