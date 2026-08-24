from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ValidationException
from app.db import models
from app.services.interview.evaluation_engine import evaluate_answer
from app.services.interview.question_generator import generate_questions, role_track

logger = logging.getLogger("lakshyaai.interview")


class InterviewService:
    @staticmethod
    def start_interview(
        db: Session,
        *,
        user: models.User,
        role: str,
        difficulty: str,
        mode: str,
    ) -> dict[str, Any]:
        role_clean = role.strip()
        diff_clean = difficulty.strip().lower()
        mode_clean = mode.strip().lower()

        questions = generate_questions(role_clean, diff_clean)

        session = models.InterviewSession(
            user_id=user.id,
            role=role_clean,
            difficulty=diff_clean,
            mode=mode_clean,
            status="in_progress",
            current_index=0,
            total_questions=len(questions),
            questions=questions,
        )

        db.add(session)
        db.commit()
        db.refresh(session)

        logger.info(
            "Created persistent interview session id=%s user_id=%s role=%s",
            session.id,
            user.id,
            role_clean,
        )

        return {
            "session_id": str(session.id),
            "role": session.role,
            "difficulty": session.difficulty,
            "mode": session.mode,
            "question": questions[0] if questions else "",
            "question_index": 1,
            "total_questions": len(questions),
            "remaining_seconds": 30,
        }

    @staticmethod
    def next_interview_step(
        db: Session,
        *,
        user: models.User,
        session_id: str | UUID,
        answer: str,
    ) -> dict[str, Any]:
        normalized_answer = answer.strip()
        if not normalized_answer:
            raise ValidationException("Answer cannot be empty")

        try:
            sid = UUID(str(session_id))
        except ValueError as exc:
            raise ValidationException("Invalid session ID format") from exc

        session = (
            db.query(models.InterviewSession)
            .filter(
                models.InterviewSession.id == sid,
                models.InterviewSession.user_id == user.id,
            )
            .first()
        )

        if not session:
            raise NotFoundException("Interview session not found")

        current_index = session.current_index
        questions = list(session.questions or [])

        if current_index >= len(questions):
            raise ValidationException("Interview is already completed")

        current_question = questions[current_index]

        evaluation = evaluate_answer(
            role_track=role_track(session.role),
            answer=normalized_answer,
        )

        # Store message
        message = models.InterviewMessage(
            session_id=session.id,
            sender="user",
            content=normalized_answer,
            feedback=str(evaluation.get("feedback", "")),
            score=float(evaluation.get("overall_score", 0)),
            question_index=current_index + 1,
            strengths=evaluation.get("strengths", []),
            weaknesses=evaluation.get("weaknesses", []),
        )
        db.add(message)

        session.current_index = current_index + 1
        completed = session.current_index >= len(questions)

        if completed:
            session.status = "completed"
            session.completed_at = datetime.now(timezone.utc)

            # Compute overall scores across all messages
            all_messages = (
                db.query(models.InterviewMessage)
                .filter(models.InterviewMessage.session_id == session.id)
                .all()
            )
            all_messages_with_current = all_messages + [message]

            scores = [m.score for m in all_messages_with_current if m.score is not None]
            if scores:
                session.overall_score = round(sum(scores) / len(scores), 1)
                session.technical_score = session.overall_score
                session.communication_score = round(
                    sum(
                        evaluate_answer(role_track(session.role), m.content).get("communication_score", 70)
                        for m in all_messages_with_current
                    )
                    / len(all_messages_with_current),
                    1,
                )
                session.confidence_score = round(
                    sum(
                        evaluate_answer(role_track(session.role), m.content).get("confidence_score", 70)
                        for m in all_messages_with_current
                    )
                    / len(all_messages_with_current),
                    1,
                )

            # Consolidate strengths & weaknesses
            all_str = []
            all_wk = []
            for m in all_messages_with_current:
                all_str.extend(m.strengths or [])
                all_wk.extend(m.weaknesses or [])
            session.strengths = list(dict.fromkeys(all_str))[:4]
            session.weaknesses = list(dict.fromkeys(all_wk))[:4]
            session.feedback_summary = (
                f"Completed {len(questions)} interview questions for {session.role} "
                f"at {session.difficulty} difficulty with overall score {session.overall_score or 70}."
            )

        db.commit()
        db.refresh(session)

        next_question = "" if completed else questions[session.current_index]

        return {
            "session_id": str(session.id),
            "feedback": str(evaluation.get("feedback", "")),
            "score": int(evaluation.get("overall_score", 70)),
            "question": next_question,
            "question_index": session.current_index + (0 if completed else 1),
            "total_questions": len(questions),
            "completed": completed,
            "report_url": f"/interview/report/{session.id}" if completed else None,
        }

    @staticmethod
    def get_interview_report(
        db: Session,
        *,
        user: models.User,
        session_id: str | UUID,
    ) -> dict[str, Any]:
        try:
            sid = UUID(str(session_id))
        except ValueError as exc:
            raise ValidationException("Invalid session ID format") from exc

        session = (
            db.query(models.InterviewSession)
            .filter(
                models.InterviewSession.id == sid,
                models.InterviewSession.user_id == user.id,
            )
            .first()
        )

        if not session:
            raise NotFoundException("Interview session not found")

        messages = (
            db.query(models.InterviewMessage)
            .filter(models.InterviewMessage.session_id == session.id)
            .order_by(models.InterviewMessage.created_at)
            .all()
        )

        if not messages and session.status != "completed":
            raise ValidationException("No answers submitted yet")

        overall = int(round(session.overall_score or 70))
        tech = int(round(session.technical_score or overall))
        comm = int(round(session.communication_score or overall))
        conf = int(round(session.confidence_score or overall))

        strengths = list(session.strengths or [])
        weaknesses = list(session.weaknesses or [])

        if not strengths:
            for m in messages:
                strengths.extend(m.strengths or [])
            strengths = list(dict.fromkeys(strengths))[:4] or [
                "Demonstrated relevant technical context and problem decomposition."
            ]

        if not weaknesses:
            for m in messages:
                weaknesses.extend(m.weaknesses or [])
            weaknesses = list(dict.fromkeys(weaknesses))[:4] or [
                "Practice structuring complex edge cases more explicitly."
            ]

        return {
            "session_id": str(session.id),
            "role": session.role,
            "difficulty": session.difficulty,
            "mode": session.mode,
            "technical_score": tech,
            "communication_score": comm,
            "confidence_score": conf,
            "overall_score": overall,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "questions_answered": len(messages),
            "summary": (
                session.feedback_summary
                or f"You completed {len(messages)} questions for {session.role} "
                f"at {session.difficulty} difficulty with an overall score of {overall}."
            ),
        }

    @staticmethod
    def list_user_interviews(db: Session, user: models.User) -> list[models.InterviewSession]:
        return (
            db.query(models.InterviewSession)
            .filter(models.InterviewSession.user_id == user.id)
            .order_by(models.InterviewSession.created_at.desc())
            .all()
        )

    @staticmethod
    def get_interview_session(
        db: Session,
        *,
        user: models.User,
        session_id: str | UUID,
    ) -> models.InterviewSession:
        try:
            sid = UUID(str(session_id))
        except ValueError as exc:
            raise ValidationException("Invalid session ID format") from exc

        session = (
            db.query(models.InterviewSession)
            .filter(
                models.InterviewSession.id == sid,
                models.InterviewSession.user_id == user.id,
            )
            .first()
        )
        if not session:
            raise NotFoundException("Interview session not found")
        return session
