from __future__ import annotations

import re


class KeywordEngine:
    STOP_WORDS = {
        "and",
        "the",
        "with",
        "for",
        "that",
        "this",
        "from",
        "have",
        "your",
        "will",
        "you",
        "our",
        "are",
        "was",
        "were",
        "into",
        "about",
        "using",
        "used",
        "build",
        "built",
    }

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        return re.findall(r"[a-zA-Z][a-zA-Z0-9.+#/-]{1,}", text.lower())

    @classmethod
    def score(cls, resume_text: str, job_description: str = "") -> float:
        if not resume_text.strip():
            return 0.0

        resume_words = {
            token
            for token in cls._tokenize(resume_text)
            if token not in cls.STOP_WORDS and len(token) > 2
        }

        if not job_description.strip():
            coverage = min(len(resume_words) / 40, 1.0)
            return round(coverage * 100, 2)

        job_words = [
            token
            for token in cls._tokenize(job_description)
            if token not in cls.STOP_WORDS and len(token) > 2
        ]

        if not job_words:
            return 0.0

        unique_job_words = set(job_words)
        matched_keywords = unique_job_words.intersection(resume_words)
        match_ratio = len(matched_keywords) / max(len(unique_job_words), 1)
        density_bonus = min(sum(1 for token in job_words if token in resume_words) / max(len(job_words), 1), 1.0)

        return round(min((match_ratio * 0.8 + density_bonus * 0.2) * 100, 100), 2)
