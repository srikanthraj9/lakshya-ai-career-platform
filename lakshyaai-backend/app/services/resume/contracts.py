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
    is_inferred: bool = False
    evidence_excerpt: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "skill": self.skill,
            "category": self.category,
            "confidence": round(self.confidence, 3),
            "source": self.source,
            "frequency": self.frequency,
            "is_inferred": self.is_inferred,
            "evidence_excerpt": self.evidence_excerpt,
        }


@dataclass(frozen=True)
class ATSBreakdown:
    keyword_match: float
    skill_diversity: float
    formatting: float
    action_verbs: float
    section_coverage: float
    scoring_mode: str = "base_quality"
    base_quality_score: float | None = None
    job_match_score: float | None = None
    required_skills_score: float | None = None
    preferred_skills_score: float | None = None
    experience_alignment_score: float | None = None

    def to_dict(self) -> dict[str, Any]:
        data = {
            "keyword_match": round(self.keyword_match, 2),
            "skill_diversity": round(self.skill_diversity, 2),
            "formatting": round(self.formatting, 2),
            "action_verbs": round(self.action_verbs, 2),
            "section_coverage": round(self.section_coverage, 2),
            "scoring_mode": self.scoring_mode,
        }
        if self.base_quality_score is not None:
            data["base_quality_score"] = round(self.base_quality_score, 2)
        if self.job_match_score is not None:
            data["job_match_score"] = round(self.job_match_score, 2)
        if self.required_skills_score is not None:
            data["required_skills_score"] = round(self.required_skills_score, 2)
        if self.preferred_skills_score is not None:
            data["preferred_skills_score"] = round(self.preferred_skills_score, 2)
        if self.experience_alignment_score is not None:
            data["experience_alignment_score"] = round(self.experience_alignment_score, 2)
        return data


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
