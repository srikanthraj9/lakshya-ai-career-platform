from __future__ import annotations

import re
from collections import Counter
from typing import Any

from app.constants.skills import (
    SKILL_DICTIONARY,
    canonicalize_skill,
    extract_skills_fast,
    get_skill_category,
)
from app.core.config import settings
from app.services.llm.client import llm_client
from app.services.resume.contracts import ExtractedSkill


class SkillExtractor:
    CONTEXT_PATTERNS = [
        re.compile(r"(?:skills?|stack|technologies|tools)\s*[:\-]\s*([^\n]+)", re.IGNORECASE),
        re.compile(r"(?:experience with|proficient in|worked with|using)\s+([^\n.;]+)", re.IGNORECASE),
    ]
    TOKEN_PATTERN = re.compile(r"[A-Za-z][A-Za-z0-9.+#/-]{1,}")

    @staticmethod
    def normalize_text(text: str) -> str:
        return re.sub(r"\s+", " ", text.strip().lower())

    @staticmethod
    def _count_skill_mentions(text: str, skill: str) -> int:
        pattern = rf"(?<!\w){re.escape(skill)}(?!\w)"
        return len(re.findall(pattern, text.lower()))

    @staticmethod
    def _extract_keyword_skills(text: str) -> list[ExtractedSkill]:
        extracted: list[ExtractedSkill] = []
        for skill in extract_skills_fast(text):
            frequency = max(1, SkillExtractor._count_skill_mentions(text, skill))
            confidence = min(0.72 + (frequency * 0.06), 0.95)
            extracted.append(
                ExtractedSkill(
                    skill=skill,
                    category=get_skill_category(skill),
                    confidence=confidence,
                    source="keyword",
                    frequency=frequency,
                )
            )
        return extracted

    @staticmethod
    def _extract_nlp_skills(text: str) -> list[ExtractedSkill]:
        discovered: dict[str, ExtractedSkill] = {}

        for pattern in SkillExtractor.CONTEXT_PATTERNS:
            for fragment in pattern.findall(text):
                for part in re.split(r"[,\n|/]", fragment):
                    token = canonicalize_skill(part)
                    if token in SKILL_DICTIONARY:
                        discovered[token] = ExtractedSkill(
                            skill=token,
                            category=get_skill_category(token),
                            confidence=0.68,
                            source="nlp",
                            frequency=1,
                        )

        for token in SkillExtractor.TOKEN_PATTERN.findall(text):
            canonical = canonicalize_skill(token)
            if canonical in SKILL_DICTIONARY and canonical not in discovered:
                if any(marker in token for marker in (".", "+", "#")) or token[0].isupper():
                    discovered[canonical] = ExtractedSkill(
                        skill=canonical,
                        category=get_skill_category(canonical),
                        confidence=0.61,
                        source="nlp",
                        frequency=1,
                    )

        return list(discovered.values())

    @staticmethod
    def extract_ai_skills(text: str) -> list[str]:
        if not text or not llm_client.is_configured or not settings.enable_llm_skill_extraction:
            return []

        prompt = f"""
Extract technical skills from the resume below.
Return ONLY a JSON array of lowercase skill names.

Resume:
{text[:5000]}
"""
        try:
            result = llm_client.chat_json(
                prompt,
                temperature=0.0,
                max_tokens=400,
                timeout_seconds=settings.llm_aux_timeout_seconds,
            )
        except Exception:
            return []

        if not isinstance(result, list):
            return []

        skills: list[str] = []
        for skill in result:
            if isinstance(skill, str):
                canonical = canonicalize_skill(skill)
                if canonical:
                    skills.append(canonical)
        return skills

    @staticmethod
    def _merge_skills(skill_sets: list[list[ExtractedSkill]], ai_skills: list[str]) -> list[ExtractedSkill]:
        merged: dict[str, ExtractedSkill] = {}
        frequency_counter: Counter[str] = Counter()

        for skill_set in skill_sets:
            for skill in skill_set:
                frequency_counter[skill.skill] += skill.frequency
                existing = merged.get(skill.skill)
                if existing is None:
                    merged[skill.skill] = skill
                    continue

                merged[skill.skill] = ExtractedSkill(
                    skill=skill.skill,
                    category=skill.category,
                    confidence=min(max(existing.confidence, skill.confidence) + 0.1, 0.99),
                    source="hybrid",
                    frequency=frequency_counter[skill.skill],
                )

        for skill in ai_skills:
            if skill not in merged:
                merged[skill] = ExtractedSkill(
                    skill=skill,
                    category=get_skill_category(skill),
                    confidence=0.78,
                    source="llm",
                    frequency=1,
                )
            else:
                current = merged[skill]
                merged[skill] = ExtractedSkill(
                    skill=current.skill,
                    category=current.category,
                    confidence=min(current.confidence + 0.05, 0.99),
                    source="hybrid",
                    frequency=current.frequency,
                )

        return sorted(merged.values(), key=lambda item: (-item.confidence, item.skill))

    @staticmethod
    def extract(text: str) -> list[dict[str, Any]]:
        return [skill.to_dict() for skill in SkillExtractor.extract_hybrid(text)]

    @staticmethod
    def extract_with_metrics(text: str) -> list[dict[str, Any]]:
        return SkillExtractor.extract(text)

    @staticmethod
    def extract_hybrid(text: str) -> list[ExtractedSkill]:
        if not text or not text.strip():
            return []

        keyword_skills = SkillExtractor._extract_keyword_skills(text)
        nlp_skills = SkillExtractor._extract_nlp_skills(text)
        ai_skills = SkillExtractor.extract_ai_skills(text)
        return SkillExtractor._merge_skills([keyword_skills, nlp_skills], ai_skills)
