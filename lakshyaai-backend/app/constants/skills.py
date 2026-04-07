from __future__ import annotations

import re

try:
    from flashtext import KeywordProcessor
except ImportError:  # pragma: no cover
    KeywordProcessor = None


BASE_SKILLS = {
    "python": "programming",
    "java": "programming",
    "c++": "programming",
    "c#": "programming",
    "go": "programming",
    "rust": "programming",
    "fastapi": "backend",
    "django": "backend",
    "flask": "backend",
    "spring boot": "backend",
    "node.js": "backend",
    "express": "backend",
    "graphql": "backend",
    "rest api": "backend",
    "microservices": "backend",
    "react": "frontend",
    "next.js": "frontend",
    "javascript": "frontend",
    "typescript": "frontend",
    "html": "frontend",
    "css": "frontend",
    "tailwind css": "frontend",
    "redux": "frontend",
    "sql": "database",
    "postgresql": "database",
    "mysql": "database",
    "mongodb": "database",
    "redis": "database",
    "sqlite": "database",
    "elasticsearch": "database",
    "docker": "devops",
    "kubernetes": "devops",
    "terraform": "devops",
    "ci/cd": "devops",
    "github actions": "devops",
    "jenkins": "devops",
    "linux": "devops",
    "machine learning": "ai",
    "deep learning": "ai",
    "pytorch": "ai",
    "tensorflow": "ai",
    "langchain": "ai",
    "openai": "ai",
    "llm": "ai",
    "rag": "ai",
    "pandas": "data",
    "numpy": "data",
    "matplotlib": "data",
    "seaborn": "data",
    "data analysis": "data",
    "scikit-learn": "data",
    "spark": "data",
    "aws": "cloud",
    "azure": "cloud",
    "gcp": "cloud",
    "serverless": "cloud",
    "git": "tooling",
    "jira": "tooling",
    "postman": "tooling",
    "latex": "tooling",
}

SKILL_ALIASES = {
    "py": "python",
    "postgres": "postgresql",
    "postgresql": "postgresql",
    "postgre sql": "postgresql",
    "ts": "typescript",
    "js": "javascript",
    "tailwind": "tailwind css",
    "tailwindcss": "tailwind css",
    "nodejs": "node.js",
    "node": "node.js",
    "restful api": "rest api",
    "restful apis": "rest api",
    "apis": "rest api",
    "api": "rest api",
    "ci cd": "ci/cd",
    "github action": "github actions",
    "aws cloud": "aws",
    "google cloud": "gcp",
    "gcp cloud": "gcp",
    "llms": "llm",
    "retrieval augmented generation": "rag",
}


def canonicalize_skill(skill: str) -> str:
    normalized = re.sub(r"\s+", " ", skill.strip().lower())
    return SKILL_ALIASES.get(normalized, normalized)


def get_skill_category(skill: str) -> str:
    canonical = canonicalize_skill(skill)
    return BASE_SKILLS.get(canonical, "general")


def _build_keyword_processor():
    if KeywordProcessor is None:
        return None

    processor = KeywordProcessor(case_sensitive=False)
    for skill in BASE_SKILLS:
        processor.add_keyword(skill, canonicalize_skill(skill))
    for alias, canonical in SKILL_ALIASES.items():
        processor.add_keyword(alias, canonical)
    return processor


keyword_processor = _build_keyword_processor()

SKILL_DICTIONARY = {
    skill: {"category": category}
    for skill, category in BASE_SKILLS.items()
}


def extract_skills_fast(text: str) -> list[str]:
    if not text:
        return []

    if keyword_processor is not None:
        results = keyword_processor.extract_keywords(text)
    else:
        lowered = text.lower()
        results = [
            skill
            for skill in BASE_SKILLS
            if re.search(rf"(?<!\w){re.escape(skill)}(?!\w)", lowered)
        ]

    unique_results: list[str] = []
    seen: set[str] = set()
    for result in results:
        canonical = canonicalize_skill(result)
        if canonical not in seen:
            seen.add(canonical)
            unique_results.append(canonical)
    return unique_results
