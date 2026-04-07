from __future__ import annotations


QUESTION_BANK = {
    "backend": {
        "easy": [
            "What is a REST API and how does it work?",
            "What is the difference between GET and POST requests?",
            "Why do backend systems use databases?",
        ],
        "medium": [
            "What is a REST API and how does it work?",
            "How would you design authentication for a FastAPI backend?",
            "What are database indexes and when would you add them?",
        ],
        "hard": [
            "How would you design a scalable REST API for high traffic?",
            "How would you handle caching, retries, and failures in a backend service?",
            "What tradeoffs do you consider when designing database transactions in distributed systems?",
        ],
    },
    "frontend": {
        "easy": [
            "What is the React virtual DOM?",
            "What is the difference between props and state?",
            "How do you make a layout responsive in modern frontend development?",
        ],
        "medium": [
            "What is the React virtual DOM and why does it help performance?",
            "How do you manage asynchronous API state in a React app?",
            "What causes unnecessary re-renders in React and how do you reduce them?",
        ],
        "hard": [
            "How would you architect a large frontend application for maintainability?",
            "How do you debug performance bottlenecks in a React production app?",
            "What tradeoffs do you consider between client-side rendering and server-side rendering?",
        ],
    },
    "general": {
        "easy": [
            "Tell me about a technical project you are proud of.",
            "How do you approach debugging when something breaks?",
            "What makes code maintainable?",
        ],
        "medium": [
            "Tell me about a challenging technical problem you solved recently.",
            "How do you prioritize code quality against delivery speed?",
            "How do you validate that a feature is production ready?",
        ],
        "hard": [
            "Describe a system design decision where tradeoffs mattered.",
            "How would you improve reliability in a system with recurring failures?",
            "How do you balance scalability, maintainability, and speed of delivery?",
        ],
    },
}


def role_track(role: str) -> str:
    normalized = role.strip().lower()
    if "front" in normalized or "react" in normalized or "ui" in normalized:
        return "frontend"
    if "back" in normalized or "api" in normalized or "server" in normalized:
        return "backend"
    return "general"


def generate_first_question(role: str, difficulty: str) -> str:
    return generate_questions(role, difficulty)[0]


def generate_questions(role: str, difficulty: str) -> list[str]:
    track = role_track(role)
    normalized_difficulty = difficulty.strip().lower()
    if normalized_difficulty not in {"easy", "medium", "hard"}:
        normalized_difficulty = "medium"
    return QUESTION_BANK[track][normalized_difficulty]
