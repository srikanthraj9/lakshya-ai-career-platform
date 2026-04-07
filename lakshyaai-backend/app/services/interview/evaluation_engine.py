from __future__ import annotations


KEYWORD_MAP = {
    "backend": ["api", "http", "database", "authentication", "scalable", "cache"],
    "frontend": ["react", "component", "state", "render", "performance", "ui"],
    "general": ["problem", "tradeoff", "design", "testing", "debug", "impact"],
}


def evaluate_answer(*, role_track: str, answer: str) -> dict[str, object]:
    normalized = answer.strip()
    lowered = normalized.lower()
    word_count = len([word for word in normalized.split() if word])
    keyword_hits = sum(1 for keyword in KEYWORD_MAP.get(role_track, KEYWORD_MAP["general"]) if keyword in lowered)

    technical_score = min(100, 35 + min(keyword_hits * 12, 36) + min(max(word_count - 20, 0), 29))
    communication_score = min(100, 40 + min(word_count, 35))
    confidence_score = min(100, 38 + min(keyword_hits * 10, 30) + (12 if "." in normalized else 0))
    overall_score = round((technical_score * 0.45) + (communication_score * 0.30) + (confidence_score * 0.25))

    if word_count < 20:
        feedback = "Your answer is directionally correct but too short. Add structure, explanation, and one concrete example."
    elif keyword_hits < 2:
        feedback = "You explained the idea, but the answer needs more technical depth and sharper terminology."
    else:
        feedback = "Strong answer. You combined explanation with relevant technical detail."

    strengths: list[str] = []
    weaknesses: list[str] = []

    if technical_score >= 70:
        strengths.append("Technical concepts were explained with relevant detail.")
    else:
        weaknesses.append("Technical depth was lighter than expected for the role.")

    if communication_score >= 70:
        strengths.append("The answer had enough detail to sound structured and complete.")
    else:
        weaknesses.append("The answer needs clearer structure and fuller sentences.")

    if confidence_score >= 70:
        strengths.append("You used role-relevant language that signals confidence.")
    else:
        weaknesses.append("Use more precise terminology and stronger reasoning to sound more confident.")

    return {
        "feedback": feedback,
        "technical_score": technical_score,
        "communication_score": communication_score,
        "confidence_score": confidence_score,
        "overall_score": overall_score,
        "strengths": strengths,
        "weaknesses": weaknesses,
    }
