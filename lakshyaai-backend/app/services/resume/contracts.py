from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID


@dataclass(frozen=True)
class ExtractedSkill:
    skill: str
    category: str
    confidence: float
    source: str = "keyword"
    frequency: int = 1

    def to_dict(self) -> dict[str, Any]:
        return {
            "skill": self.skill,
            "category": self.category,
            "confidence": round(self.confidence, 3),
            "source": self.source,
            "frequency": self.frequency,
        }


@dataclass(frozen=True)
class ATSBreakdown:
    keyword_match: float
    skill_diversity: float
    formatting: float
    action_verbs: float
    section_coverage: float

    def to_dict(self) -> dict[str, float]:
        return {
            "keyword_match": round(self.keyword_match, 2),
            "skill_diversity": round(self.skill_diversity, 2),
            "formatting": round(self.formatting, 2),
            "action_verbs": round(self.action_verbs, 2),
            "section_coverage": round(self.section_coverage, 2),
        }


@dataclass(frozen=True)
class MissingSkill:
    skill: str
    category: str
    importance: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "skill": self.skill,
            "category": self.category,
            "importance": self.importance,
        }


@dataclass(frozen=True)
class SimilarityMatch:
    resume_id: UUID
    filename: str
    similarity: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "resume_id": self.resume_id,
            "filename": self.filename,
            "similarity": round(self.similarity, 4),
        }
