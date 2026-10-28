from __future__ import annotations

import re
from typing import Any


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
        analysis = cls.analyze(resume_text, job_description)
        return analysis["score"]

    @classmethod
    def analyze(cls, resume_text: str, job_description: str = "") -> dict[str, Any]:
        if not resume_text.strip():
            return {
                "has_target_job": bool(job_description.strip()),
                "score": 0.0,
                "matched_keywords": [],
                "missing_keywords": [],
                "match_ratio": 0.0,
            }

        resume_words = {
            token
            for token in cls._tokenize(resume_text)
            if token not in cls.STOP_WORDS and len(token) > 2
        }

        if not job_description.strip():
            # Without a target job description, keyword matching is not applicable (0.0 points)
            return {
                "has_target_job": False,
                "score": 0.0,
                "matched_keywords": [],
                "missing_keywords": [],
                "match_ratio": 0.0,
            }

        job_words = [
            token
            for token in cls._tokenize(job_description)
            if token not in cls.STOP_WORDS and len(token) > 2
        ]

        if not job_words:
            return {
                "has_target_job": False,
                "score": 0.0,
                "matched_keywords": [],
                "missing_keywords": [],
                "match_ratio": 0.0,
            }

        unique_job_words = sorted(set(job_words))
        matched_keywords = sorted(set(job_words).intersection(resume_words))
        missing_keywords = sorted(set(job_words).difference(resume_words))
        match_ratio = len(matched_keywords) / max(len(unique_job_words), 1)
        density_bonus = min(sum(1 for token in job_words if token in resume_words) / max(len(job_words), 1), 1.0)
        final_score = round(min((match_ratio * 0.8 + density_bonus * 0.2) * 100, 100), 2)

        return {
            "has_target_job": True,
            "score": final_score,
            "matched_keywords": matched_keywords[:30],
            "missing_keywords": missing_keywords[:30],
            "match_ratio": round(match_ratio, 4),
        }
