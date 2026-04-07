from __future__ import annotations

import uuid
from typing import Any

from app.services.interview.evaluation_engine import evaluate_answer
from app.services.interview.question_generator import generate_questions, role_track


interview_sessions: dict[str, dict[str, Any]] = {}


def start_interview(*, role: str, difficulty: str, mode: str, user_id: str | None = None) -> dict[str, Any]:
    session_id = str(uuid.uuid4())
    questions = generate_questions(role, difficulty)

    interview_sessions[session_id] = {
        "user_id": user_id,
        "role": role.strip(),
        "difficulty": difficulty.strip().lower(),
        "mode": mode.strip().lower(),
        "questions": questions,
        "current_index": 0,
        "history": [],
    }

    return {
        "session_id": session_id,
        "role": role.strip(),
        "difficulty": difficulty.strip().lower(),
        "mode": mode.strip().lower(),
        "question": questions[0],
        "question_index": 1,
        "total_questions": len(questions),
        "remaining_seconds": 30,
    }


def next_interview_step(*, session_id: str, answer: str) -> dict[str, Any]:
    session = interview_sessions.get(session_id)
    if not session:
        raise ValueError("Invalid interview session")

    normalized_answer = answer.strip()
    if not normalized_answer:
        raise ValueError("Answer cannot be empty")

    current_index = int(session["current_index"])
    questions: list[str] = list(session["questions"])
    current_question = questions[current_index]
    evaluation = evaluate_answer(
        role_track=role_track(str(session["role"])),
        answer=normalized_answer,
    )

    session["history"].append(
        {
            "question": current_question,
            "answer": normalized_answer,
            **evaluation,
        }
    )
    session["current_index"] = current_index + 1

    completed = session["current_index"] >= len(questions)
    next_question = "" if completed else questions[session["current_index"]]

    return {
        "session_id": session_id,
        "feedback": str(evaluation["feedback"]),
        "score": int(evaluation["overall_score"]),
        "question": next_question,
        "question_index": int(session["current_index"]) + (0 if completed else 1),
        "total_questions": len(questions),
        "completed": completed,
        "report_url": f"/interview/report/{session_id}" if completed else None,
    }


def get_interview_report(session_id: str) -> dict[str, Any]:
    session = interview_sessions.get(session_id)
    if not session:
        raise ValueError("Invalid interview session")

    history = list(session["history"])
    if not history:
        raise ValueError("No answers submitted yet")

    technical_score = round(sum(item["technical_score"] for item in history) / len(history))
    communication_score = round(sum(item["communication_score"] for item in history) / len(history))
    confidence_score = round(sum(item["confidence_score"] for item in history) / len(history))
    overall_score = round(sum(item["overall_score"] for item in history) / len(history))

    strengths = []
    weaknesses = []
    for item in history:
        strengths.extend(item["strengths"])
        weaknesses.extend(item["weaknesses"])

    deduped_strengths = list(dict.fromkeys(strengths))[:4]
    deduped_weaknesses = list(dict.fromkeys(weaknesses))[:4]

    return {
        "session_id": session_id,
        "role": session["role"],
        "difficulty": session["difficulty"],
        "mode": session["mode"],
        "technical_score": technical_score,
        "communication_score": communication_score,
        "confidence_score": confidence_score,
        "overall_score": overall_score,
        "strengths": deduped_strengths or ["You provided enough relevant detail to move through the interview."],
        "weaknesses": deduped_weaknesses or ["Continue practicing with more precise and structured examples."],
        "questions_answered": len(history),
        "summary": (
            f"You completed {len(history)} interview questions for {session['role']} "
            f"at {session['difficulty']} difficulty with an overall score of {overall_score}."
        ),
    }
