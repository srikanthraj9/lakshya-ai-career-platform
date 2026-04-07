from __future__ import annotations

from app.services.llm.client import llm_client

DEFAULT_ROLE = "Software Engineer"
FALLBACK_QUESTIONS = {
    "software engineer": "Tell me about a recent technical problem you solved and how you approached it.",
    "frontend engineer": "Describe a frontend performance issue you debugged and how you improved it.",
    "backend engineer": "Explain how you would design and secure a production API for scale.",
    "data scientist": "Walk through a project where you moved from messy data to a useful model or decision.",
}


def generate_question(role: str = DEFAULT_ROLE) -> str:
    normalized_role = role.strip() or DEFAULT_ROLE

    if llm_client.is_configured:
        prompt = (
            "Generate one concise but realistic technical interview question.\n"
            f"Target role: {normalized_role}\n"
            "Constraints:\n"
            "- Ask exactly one question\n"
            "- Make it suitable for a voice interview answer in under 2 minutes\n"
            "- Avoid greetings or extra commentary\n"
        )
        try:
            question = llm_client.chat(
                prompt,
                system_prompt="You are a professional technical interviewer.",
                max_tokens=120,
            ).strip()
            if question:
                return question
        except Exception:
            pass

    role_key = normalized_role.lower()
    return FALLBACK_QUESTIONS.get(role_key, FALLBACK_QUESTIONS["software engineer"])
