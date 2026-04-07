from __future__ import annotations

import logging
import math
import re
import uuid
from typing import Iterable

from app.constants.career_maps import DEFAULT_ROLE_LIBRARY, RESOURCE_MAP, ROLE_CAREER_PATHS
from app.constants.skills import canonicalize_skill, get_skill_category
from app.db import models


DEMAND_PRIORITY = {
    "high": 3,
    "medium": 2,
    "low": 1,
}

ROLE_TITLE_ALIASES = {
    "software developer": "software engineer",
    "software engineering": "software engineer",
    "sde": "software engineer",
    "frontend developer": "frontend engineer",
    "front end developer": "frontend engineer",
    "front end engineer": "frontend engineer",
    "backend developer": "backend engineer",
    "back end developer": "backend engineer",
    "back end engineer": "backend engineer",
    "full stack developer": "full stack engineer",
    "fullstack developer": "full stack engineer",
    "ml engineer": "machine learning engineer",
    "ai engineer": "machine learning engineer",
    "data analyst": "data analytics engineer",
}

SKILL_ACTION_HINTS = {
    "aws": "Deploy a production-style FastAPI service on AWS with monitoring, secrets, and environment separation.",
    "ci/cd": "Build a CI/CD pipeline that runs tests, linting, and deployment checks on every pull request.",
    "docker": "Build a Dockerized FastAPI project and deploy it with a PostgreSQL dependency.",
    "fastapi": "Ship a FastAPI service with auth, async APIs, validation, and database integration.",
    "postgresql": "Model relational data in PostgreSQL and optimize the queries your APIs depend on.",
    "sql": "Write complex SQL queries for analytics and API endpoints, then optimize the slow ones.",
    "python": "Ship a typed Python backend module with tests, clean package boundaries, and structured error handling.",
    "react": "Build a React dashboard that consumes APIs, handles loading/error states, and presents measurable outcomes.",
    "typescript": "Convert a feature to strict TypeScript and remove all implicit any usage while preserving behavior.",
    "machine learning": "Train, evaluate, and deploy a small ML model behind an API with measurable quality metrics.",
    "pytorch": "Implement an end-to-end PyTorch workflow for training, evaluation, and inference.",
}


class CareerIntelligenceEngine:
    MINIMUM_MATCH_SCORE = 30
    MINIMUM_RETURNED_MATCHES = 3
    logger = logging.getLogger("lakshyaai.role_matching")

    @staticmethod
    def _iterable_to_list(value: Iterable[float] | None) -> list[float]:
        if value is None:
            return []
        if hasattr(value, "shape") and hasattr(value, "tolist"):
            print("Array shape:", value.shape)
            print("Array values:", value)
            return list(value.tolist())
        return list(value)

    @staticmethod
    def _normalize_text(value: str | None) -> str:
        return re.sub(r"\s+", " ", (value or "").strip())

    @classmethod
    def seed_default_roles(cls) -> list[models.Role]:
        seeded_roles: list[models.Role] = []
        for entry in DEFAULT_ROLE_LIBRARY:
            seeded_roles.append(
                models.Role(
                    id=uuid.uuid4(),
                    name=entry["title"],
                    title=entry["title"],
                    category=entry["category"],
                    demand_level=entry["demand_level"],
                    core_skills=list(entry["core_skills"]),
                    advanced_skills=list(entry["advanced_skills"]),
                    description=entry["description"],
                    average_salary=entry["average_salary"],
                )
            )
        return seeded_roles

    @classmethod
    def canonical_role_key(cls, value: str | None) -> str:
        normalized = re.sub(r"[^a-z0-9]+", " ", cls._normalize_text(value).lower()).strip()
        return ROLE_TITLE_ALIASES.get(normalized, normalized)

    @staticmethod
    def confidence_for_score(score: int) -> str:
        if score > 75:
            return "High"
        if score > 50:
            return "Medium"
        return "Low"

    @staticmethod
    def _cosine_similarity(left: Iterable[float] | None, right: Iterable[float] | None) -> float:
        left_values = CareerIntelligenceEngine._iterable_to_list(left)
        right_values = CareerIntelligenceEngine._iterable_to_list(right)
        if not left_values or not right_values:
            return 0.0

        size = min(len(left_values), len(right_values))
        if size == 0:
            return 0.0

        left_values = left_values[:size]
        right_values = right_values[:size]

        numerator = sum(a * b for a, b in zip(left_values, right_values))
        left_norm = math.sqrt(sum(value * value for value in left_values))
        right_norm = math.sqrt(sum(value * value for value in right_values))
        if left_norm == 0 or right_norm == 0:
            return 0.0
        return max(0.0, min(1.0, numerator / (left_norm * right_norm)))

    @classmethod
    def _normalize_skill_map(
        cls,
        skills: Iterable[object],
        *,
        exclude_related: bool = False,
    ) -> dict[str, dict[str, object]]:
        normalized: dict[str, dict[str, object]] = {}
        for skill in skills:
            if exclude_related and getattr(skill, "skill_category", "") == "related_skill":
                continue

            raw_value = getattr(skill, "skill_name", skill)
            display_value = cls._normalize_text(str(raw_value)) if raw_value is not None else ""
            if not display_value:
                continue

            canonical = canonicalize_skill(display_value)
            current = normalized.get(canonical)
            confidence = float(getattr(skill, "confidence_score", 1.0) or 1.0)
            category = getattr(skill, "skill_category", None) or get_skill_category(canonical)

            if current is None or confidence >= float(current.get("confidence", 0.0)):
                normalized[canonical] = {
                    "display": display_value,
                    "canonical": canonical,
                    "confidence": round(confidence, 3),
                    "category": category,
                }
        return normalized

    @staticmethod
    def _unique_ordered(values: Iterable[str]) -> list[str]:
        seen: set[str] = set()
        ordered: list[str] = []
        for value in values:
            normalized = canonicalize_skill(value)
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            ordered.append(value.strip())
        return ordered

    @classmethod
    def _career_path_for_role(cls, title: str, role_key: str) -> list[str]:
        path = ROLE_CAREER_PATHS.get(role_key)
        if path:
            return path

        normalized_title = cls._normalize_text(title)
        if not normalized_title:
            return []

        if "backend" in role_key:
            return ["Backend Intern", "Junior Backend Engineer", normalized_title]
        if "frontend" in role_key:
            return ["Frontend Intern", "Junior Frontend Engineer", normalized_title]
        if "full stack" in role_key:
            return ["Full Stack Intern", "Junior Full Stack Engineer", normalized_title]
        if "machine learning" in role_key or "ml" in role_key:
            return ["ML Intern", "Junior ML Engineer", normalized_title]
        return ["Intern", f"Junior {normalized_title}", normalized_title]

    @staticmethod
    def _resource_for_skill(skill: str | None) -> dict[str, str]:
        canonical = canonicalize_skill(skill or "")
        resource = RESOURCE_MAP.get(canonical)
        if resource:
            return resource
        return {
            "video": "",
            "project": f"Build a portfolio-ready project that demonstrates {skill or 'the skill'} in a production-like context.",
            "time": "2 days",
        }

    @classmethod
    def build_role_profile(cls, role: models.Role, role_skills: Iterable[models.RoleSkill] | None = None) -> dict[str, object]:
        core_skills = cls._unique_ordered([skill for skill in (role.core_skills or []) if skill])
        advanced_skills = cls._unique_ordered([skill for skill in (role.advanced_skills or []) if skill])

        role_skill_list = list(role_skills or [])
        if not core_skills and not advanced_skills and role_skill_list:
            sorted_skills = sorted(
                role_skill_list,
                key=lambda item: (
                    -(item.importance_level or 0),
                    -(item.weight or 0),
                    (item.skill_name or "").lower(),
                ),
            )
            derived_core = [skill.skill_name for skill in sorted_skills if (skill.importance_level or 0) >= 4]
            derived_advanced = [skill.skill_name for skill in sorted_skills if (skill.importance_level or 0) < 4]

            if not derived_core:
                derived_core = [skill.skill_name for skill in sorted_skills[: min(4, len(sorted_skills))]]
                derived_advanced = [skill.skill_name for skill in sorted_skills[min(4, len(sorted_skills)) :]]

            core_skills = cls._unique_ordered([skill for skill in derived_core if skill])
            core_canonical = {canonicalize_skill(skill) for skill in core_skills}
            advanced_skills = cls._unique_ordered(
                [skill for skill in derived_advanced if skill and canonicalize_skill(skill) not in core_canonical]
            )

        title = cls._normalize_text(role.title or role.name) or "Untitled Role"
        role_key = cls.canonical_role_key(title)
        category = cls._normalize_text(role.category) or "Software Engineering"
        demand_level = cls._normalize_text(role.demand_level).title() or "Medium"
        description = cls._normalize_text(role.description) or "No description available yet."
        return {
            "title": title,
            "canonical_role_key": role_key,
            "career_path": cls._career_path_for_role(title, role_key),
            "category": category,
            "demand_level": demand_level,
            "description": description,
            "core_skills": core_skills,
            "advanced_skills": advanced_skills,
            "average_salary": role.average_salary,
        }

    @classmethod
    def role_embedding_text(cls, role: models.Role, role_skills: Iterable[models.RoleSkill] | None = None) -> str:
        profile = cls.build_role_profile(role, role_skills)
        return " ".join(
            [
                str(profile["title"]),
                str(profile["category"]),
                str(profile["description"]),
                "core skills",
                " ".join(profile["core_skills"]),
                "advanced skills",
                " ".join(profile["advanced_skills"]),
            ]
        ).strip()

    @classmethod
    def sync_role_skill_fields(cls, role: models.Role, role_skills: Iterable[models.RoleSkill]) -> None:
        profile = cls.build_role_profile(role, role_skills)
        role.title = str(profile["title"])
        role.category = str(profile["category"])
        role.demand_level = str(profile["demand_level"])
        role.core_skills = list(profile["core_skills"])
        role.advanced_skills = list(profile["advanced_skills"])

    @staticmethod
    def score_label(score: int) -> str:
        if score < 35:
            return "Low"
        if score < 60:
            return "Emerging"
        if score < 80:
            return "Promising"
        return "Strong"

    @staticmethod
    def readiness_band(score: int) -> str:
        if score >= 82:
            return "High"
        if score >= 62:
            return "Medium"
        return "Low"

    @staticmethod
    def _coverage_score(matched: int, total: int) -> int:
        if total <= 0:
            return 0
        return int(round((matched / total) * 100))

    @classmethod
    def _weighted_skill_score(
        cls,
        role_skills: Iterable[models.RoleSkill],
        role_profile: dict[str, object],
        resume_skill_map: dict[str, dict[str, object]],
    ) -> int:
        weighted_requirements: dict[str, float] = {}

        for skill in role_skills:
            skill_name = cls._normalize_text(skill.skill_name)
            if not skill_name:
                continue
            canonical = canonicalize_skill(skill_name)
            importance_multiplier = 1.0 + (max(1, int(skill.importance_level or 3)) - 3) * 0.25
            weighted_requirements[canonical] = max(
                weighted_requirements.get(canonical, 0.0),
                float(skill.weight or 1.0) * importance_multiplier,
            )

        if not weighted_requirements:
            for skill in role_profile["core_skills"]:
                weighted_requirements[canonicalize_skill(skill)] = 2.0
            for skill in role_profile["advanced_skills"]:
                canonical = canonicalize_skill(skill)
                weighted_requirements.setdefault(canonical, 1.0)

        total_weight = sum(weighted_requirements.values())
        if total_weight <= 0:
            return 0

        matched_weight = sum(
            weight for canonical, weight in weighted_requirements.items() if canonical in resume_skill_map
        )
        return int(round((matched_weight / total_weight) * 100))

    @classmethod
    def _semantic_score(
        cls,
        role: models.Role,
        resume_embedding: Iterable[float] | None,
    ) -> int:
        role_embeddings = list(getattr(role, "embeddings", []) or [])
        resume_embedding_values = cls._iterable_to_list(resume_embedding)
        if len(resume_embedding_values) == 0 or len(role_embeddings) == 0:
            return 0

        similarity = max(
            cls._cosine_similarity(resume_embedding_values, getattr(role_embedding, "embedding", []))
            for role_embedding in role_embeddings
        )
        cls.logger.info(
            "Cosine similarity role=%s semantic_score=%.4f",
            role.title or role.name,
            similarity,
        )
        return int(round(similarity * 100))

    @classmethod
    def _readiness_score(
        cls,
        *,
        core_coverage: int,
        advanced_coverage: int,
        missing_core_count: int,
        matched_advanced_count: int,
        ats_score: int | None = None,
    ) -> int:
        readiness = (core_coverage * 0.7) + (advanced_coverage * 0.2) + min(matched_advanced_count * 4, 12)
        readiness -= missing_core_count * 8
        if ats_score is not None:
            readiness += min(max(ats_score, 0), 100) * 0.1
        return max(0, min(100, int(round(readiness))))

    @classmethod
    def _verdict(cls, score: int, core_coverage: int, missing_core_count: int) -> tuple[str, str]:
        if score >= 80 and missing_core_count == 0:
            return (
                "Ready now",
                "Your resume already covers the core requirements, so this is a strong role to target immediately.",
            )
        if score >= 65 and missing_core_count <= 2:
            return (
                "Close fit",
                "You are within reach of this role, but a few high-impact gaps still need proof on the resume.",
            )
        if core_coverage >= 45:
            return (
                "Stretch role",
                "You have adjacent evidence for this path, but the core-skill coverage is not yet strong enough for a confident target.",
            )
        return (
            "Not ready yet",
            "This role is still too far from the current resume signal, so effort should go into foundational skill building first.",
        )

    @classmethod
    def _strengths(
        cls,
        *,
        title: str,
        matched_core_skills: list[str],
        matched_advanced_skills: list[str],
        semantic_score: int,
        demand_level: str,
    ) -> list[str]:
        strengths: list[str] = []
        if matched_core_skills:
            strengths.append(f"Core alignment is visible through {', '.join(matched_core_skills[:3])}.")
        if matched_advanced_skills:
            strengths.append(f"You also show deeper stack signals such as {', '.join(matched_advanced_skills[:3])}.")
        if semantic_score >= 60:
            strengths.append(f"The overall resume narrative is directionally consistent with {title}.")
        if demand_level == "High":
            strengths.append("Market demand is strong, so closing a few gaps can create outsized upside.")
        return strengths or ["The current resume has limited positive evidence for this role."]

    @classmethod
    def _risks(
        cls,
        *,
        missing_core_skills: list[str],
        missing_advanced_skills: list[str],
        semantic_score: int,
    ) -> list[str]:
        risks: list[str] = []
        if missing_core_skills:
            risks.append(f"Missing core skills reduce recruiter confidence: {', '.join(missing_core_skills[:3])}.")
        if len(missing_advanced_skills) >= 2:
            risks.append(f"Advanced depth is still thin in areas like {', '.join(missing_advanced_skills[:2])}.")
        if semantic_score < 40:
            risks.append("The resume narrative does not yet clearly signal this career direction.")
        return risks or ["No major risk signal was detected from the available role requirements."]

    @classmethod
    def _explanation(
        cls,
        *,
        title: str,
        verdict: str,
        matched_core_skills: list[str],
        missing_core_skills: list[str],
        matched_advanced_skills: list[str],
    ) -> str:
        if matched_core_skills and missing_core_skills:
            return (
                f"{title} is a {verdict.lower()} because your resume already proves "
                f"{', '.join(matched_core_skills[:3])}, but it still lacks core evidence for "
                f"{', '.join(missing_core_skills[:3])}."
            )
        if matched_core_skills:
            extra = f" and deeper signals like {', '.join(matched_advanced_skills[:2])}" if matched_advanced_skills else ""
            return f"{title} is a {verdict.lower()} because the resume already covers the main role requirements{extra}."
        if missing_core_skills:
            return (
                f"{title} is a {verdict.lower()} because the resume does not yet show enough proof for "
                f"{', '.join(missing_core_skills[:3])}."
            )
        return f"{title} needs clearer role requirements before the system can produce a strong explanation."

    @classmethod
    def _build_skill_action(
        cls,
        *,
        title: str,
        skill: str,
        priority: str,
        category: str,
        weeks: int,
    ) -> dict[str, object]:
        resource = cls._resource_for_skill(skill)
        action = SKILL_ACTION_HINTS.get(
            canonicalize_skill(skill),
            f"Build a portfolio-ready project that proves you can use {skill} in a production setting.",
        )
        return {
            "priority": priority,
            "category": category,
            "skill": skill,
            "action": action,
            "rationale": f"{skill} is a visible gap for {title}, so recruiters will expect project-level proof.",
            "estimated_weeks": weeks,
            "video": resource["video"],
            "project": resource["project"],
            "time": resource["time"],
        }

    @classmethod
    def _next_steps(
        cls,
        *,
        title: str,
        missing_core_skills: list[str],
        missing_advanced_skills: list[str],
        matched_skills: list[str],
    ) -> list[dict[str, object]]:
        steps: list[dict[str, object]] = []

        for skill in missing_core_skills[:2]:
            steps.append(
                cls._build_skill_action(
                    title=title,
                    skill=skill,
                    priority="high",
                    category="skill-gap",
                    weeks=3,
                )
            )

        for skill in missing_advanced_skills[:1]:
            steps.append(
                cls._build_skill_action(
                    title=title,
                    skill=skill,
                    priority="medium",
                    category="skill-depth",
                    weeks=2,
                )
            )

        if matched_skills:
            steps.append(
                {
                    "priority": "high" if missing_core_skills else "medium",
                    "category": "resume-proof",
                    "skill": None,
                    "action": "Rewrite three resume bullets to quantify impact, ownership, and technical complexity for your strongest projects.",
                    "rationale": f"You already have relevant skill signals for {title}; now the resume must prove execution quality.",
                    "estimated_weeks": 1,
                    "video": "",
                    "project": "Rewrite project and experience bullets using metrics, scale, latency, revenue, or adoption outcomes.",
                    "time": "1 day",
                }
            )

        steps.append(
            {
                "priority": "medium",
                "category": "career-positioning",
                "skill": None,
                "action": f"Tailor your resume summary, project ordering, and keywords specifically for {title} applications.",
                "rationale": "Positioning clarity improves screening conversion when the technical gap is manageable.",
                "estimated_weeks": 1,
                "video": "",
                "project": f"Create one role-specific resume version optimized for {title}.",
                "time": "1 day",
            }
        )

        return steps[:4]

    @classmethod
    def build_career_decision(
        cls,
        matches: list[dict[str, object]],
        resume_skills: Iterable[models.ResumeSkill],
    ) -> dict[str, object]:
        if not matches:
            return {
                "target_role": "",
                "career_verdict": "Insufficient evidence",
                "confidence": "Low",
                "confidence_label": "Low",
                "decision_guidance": "Add clearer technical skills and role-specific projects before making a career decision.",
                "why": "The system could not find enough role-alignment signal from the current resume.",
                "focus_skills": [],
                "readiness_band": "Low",
                "resume_skill_count": 0,
                "career_path": [],
            }

        top_match = matches[0]
        normalized_resume_skills = cls._normalize_skill_map(resume_skills, exclude_related=True)
        confidence = cls.confidence_for_score(int(top_match.get("score", 0)))
        return {
            "target_role": top_match["role_name"],
            "career_verdict": top_match["verdict"],
            "confidence": confidence,
            "confidence_label": confidence,
            "decision_guidance": (
                f"Prioritize {top_match['role_name']} next. "
                f"Close {len(top_match['missing_core_skills'])} core gaps and ship proof-driven projects before applying broadly."
            ),
            "why": top_match["explanation"],
            "focus_skills": top_match["missing_core_skills"][:3] or top_match["missing_skills"][:3],
            "readiness_band": cls.readiness_band(int(top_match.get("score", 0))),
            "resume_skill_count": len(normalized_resume_skills),
            "career_path": list(top_match.get("career_path", [])),
        }

    @classmethod
    def analyze_role_fit(
        cls,
        *,
        role: models.Role,
        role_skills: Iterable[models.RoleSkill],
        resume_skills: Iterable[models.ResumeSkill],
        resume_embedding: Iterable[float] | None = None,
        resume_ats_score: int | None = None,
    ) -> dict[str, object]:
        role_profile = cls.build_role_profile(role, role_skills)
        resume_skill_map = cls._normalize_skill_map(resume_skills, exclude_related=True)
        cls.logger.info("Resume skills: %s", list(resume_skill_map.keys()))
        cls.logger.info(
            "Role skills: %s",
            [canonicalize_skill(skill) for skill in (role_profile["core_skills"] + role_profile["advanced_skills"])],
        )

        core_skill_map = cls._normalize_skill_map(role_profile["core_skills"])
        advanced_skill_map = cls._normalize_skill_map(role_profile["advanced_skills"])

        matched_core_keys = [key for key in core_skill_map if key in resume_skill_map]
        missing_core_keys = [key for key in core_skill_map if key not in resume_skill_map]
        matched_advanced_keys = [key for key in advanced_skill_map if key in resume_skill_map]
        missing_advanced_keys = [key for key in advanced_skill_map if key not in resume_skill_map]

        matched_core_skills = [str(core_skill_map[key]["display"]) for key in matched_core_keys]
        missing_core_skills = [str(core_skill_map[key]["display"]) for key in missing_core_keys]
        matched_advanced_skills = [str(advanced_skill_map[key]["display"]) for key in matched_advanced_keys]
        missing_advanced_skills = [str(advanced_skill_map[key]["display"]) for key in missing_advanced_keys]

        matched_skill_map = {**core_skill_map, **advanced_skill_map}
        matched_skills = [str(matched_skill_map[key]["display"]) for key in matched_core_keys + matched_advanced_keys]
        missing_skills = [str(matched_skill_map[key]["display"]) for key in missing_core_keys + missing_advanced_keys]

        core_coverage = cls._coverage_score(len(matched_core_skills), len(core_skill_map))
        advanced_coverage = cls._coverage_score(len(matched_advanced_skills), len(advanced_skill_map))
        skill_score = cls._weighted_skill_score(role_skills, role_profile, resume_skill_map)
        semantic_score = cls._semantic_score(role, resume_embedding)
        readiness_score = cls._readiness_score(
            core_coverage=core_coverage,
            advanced_coverage=advanced_coverage,
            missing_core_count=len(missing_core_skills),
            matched_advanced_count=len(matched_advanced_skills),
            ats_score=resume_ats_score,
        )
        total_score = int(round((skill_score * 0.55) + (semantic_score * 0.25) + (readiness_score * 0.20)))
        cls.logger.info(
            "Score: role=%s total=%s skill=%s semantic=%s readiness=%s",
            role_profile["title"],
            total_score,
            skill_score,
            semantic_score,
            readiness_score,
        )
        confidence = cls.confidence_for_score(total_score)
        verdict, verdict_reason = cls._verdict(total_score, core_coverage, len(missing_core_skills))
        explanation = cls._explanation(
            title=str(role_profile["title"]),
            verdict=verdict,
            matched_core_skills=matched_core_skills,
            missing_core_skills=missing_core_skills,
            matched_advanced_skills=matched_advanced_skills,
        )
        next_steps = cls._next_steps(
            title=str(role_profile["title"]),
            missing_core_skills=missing_core_skills,
            missing_advanced_skills=missing_advanced_skills,
            matched_skills=matched_skills,
        )

        return {
            "role_id": role.id,
            "canonical_role_key": role_profile["canonical_role_key"],
            "role": role_profile["title"],
            "role_name": role_profile["title"],
            "category": role_profile["category"],
            "demand_level": role_profile["demand_level"],
            "description": role_profile["description"],
            "average_salary": role_profile["average_salary"],
            "career_path": list(role_profile["career_path"]),
            "core_skills": list(role_profile["core_skills"]),
            "advanced_skills": list(role_profile["advanced_skills"]),
            "matched_core_skills": matched_core_skills,
            "matched_advanced_skills": matched_advanced_skills,
            "matched_skills": matched_skills,
            "missing_core_skills": missing_core_skills,
            "missing_advanced_skills": missing_advanced_skills,
            "missing_skills": missing_skills,
            "core_skill_coverage": core_coverage,
            "advanced_skill_coverage": advanced_coverage,
            "confidence": confidence,
            "skill_score": skill_score,
            "semantic_score": semantic_score,
            "readiness_score": readiness_score,
            "score": total_score,
            "score_label": cls.score_label(total_score),
            "verdict": verdict,
            "verdict_reason": verdict_reason,
            "strengths": cls._strengths(
                title=str(role_profile["title"]),
                matched_core_skills=matched_core_skills,
                matched_advanced_skills=matched_advanced_skills,
                semantic_score=semantic_score,
                demand_level=str(role_profile["demand_level"]),
            ),
            "risks": cls._risks(
                missing_core_skills=missing_core_skills,
                missing_advanced_skills=missing_advanced_skills,
                semantic_score=semantic_score,
            ),
            "explanation": explanation,
            "recommendation": verdict_reason,
            "next_steps": next_steps,
            "similarity": round(semantic_score / 100, 4),
        }

    @classmethod
    def rank_roles(
        cls,
        *,
        roles: Iterable[models.Role],
        resume_skills: Iterable[models.ResumeSkill],
        resume_embedding: Iterable[float] | None = None,
        resume_ats_score: int | None = None,
        limit: int = 5,
    ) -> list[dict[str, object]]:
        deduplicated: dict[str, dict[str, object]] = {}
        analyzed_candidates: dict[str, dict[str, object]] = {}
        role_list = list(roles)
        if not role_list:
            cls.logger.warning("No roles found in database. Falling back to seeded role catalog.")
            role_list = cls.seed_default_roles()

        for role in role_list:
            role_skills = list(getattr(role, "skills", []) or [])
            analysis = cls.analyze_role_fit(
                role=role,
                role_skills=role_skills,
                resume_skills=resume_skills,
                resume_embedding=resume_embedding,
                resume_ats_score=resume_ats_score,
            )
            analyzed_candidates[str(analysis["canonical_role_key"])] = analysis

            required_skills = analysis["core_skills"] + analysis["advanced_skills"]
            if not required_skills:
                continue

            role_key = str(analysis["canonical_role_key"])
            existing = deduplicated.get(role_key)
            if existing is None:
                deduplicated[role_key] = analysis
                continue

            is_better = (
                int(analysis["score"]),
                int(analysis["core_skill_coverage"]),
                int(analysis["skill_score"]),
                int(analysis["semantic_score"]),
            ) > (
                int(existing["score"]),
                int(existing["core_skill_coverage"]),
                int(existing["skill_score"]),
                int(existing["semantic_score"]),
            )
            if is_better:
                deduplicated[role_key] = analysis

        ranked = list(deduplicated.values())
        if not ranked:
            cls.logger.warning("No ranked roles cleared the primary catalog. Returning fallback analyses.")
            ranked = list(analyzed_candidates.values())

        ranked.sort(
            key=lambda result: (
                -int(result.get("score", 0)),
                -int(result.get("core_skill_coverage", 0)),
                -DEMAND_PRIORITY.get(str(result.get("demand_level", "Medium")).lower(), 0),
                -int(result.get("skill_score", 0)),
                str(result.get("role_name", "")).lower(),
            )
        )

        required_match_count = max(cls.MINIMUM_RETURNED_MATCHES, limit)
        if len(ranked) < required_match_count:
            missing_role_keys = set(deduplicated.keys())
            for fallback_analysis in sorted(
                analyzed_candidates.values(),
                key=lambda result: (
                    -int(result.get("score", 0)),
                    -int(result.get("core_skill_coverage", 0)),
                    -int(result.get("skill_score", 0)),
                    str(result.get("role_name", "")).lower(),
                ),
            ):
                role_key = str(fallback_analysis.get("canonical_role_key", ""))
                if role_key in missing_role_keys:
                    continue
                ranked.append(fallback_analysis)
                missing_role_keys.add(role_key)
                if len(ranked) >= required_match_count:
                    break

        strong_matches = [
            match for match in ranked
            if int(match.get("score", 0)) >= cls.MINIMUM_MATCH_SCORE
        ]
        if strong_matches:
            ranked = strong_matches + [
                match for match in ranked
                if int(match.get("score", 0)) < cls.MINIMUM_MATCH_SCORE
            ]

        top_matches = ranked[:required_match_count]
        for index, match in enumerate(top_matches, start=1):
            match["rank"] = index

        return top_matches
