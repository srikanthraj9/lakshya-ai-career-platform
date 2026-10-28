from __future__ import annotations

import re
from collections.abc import Sequence

from app.constants.skills import canonicalize_skill
from app.services.resume.action_verb_engine import ActionVerbEngine
from app.services.resume.contracts import ATSBreakdown, ExtractedSkill
from app.services.resume.format_engine import FormatEngine
from app.services.resume.keyword_engine import KeywordEngine
from app.services.resume.missing_skill_engine import MissingSkillEngine
from app.services.resume.section_engine import SectionEngine
from app.services.resume.skill_extractor import SkillExtractor


class ATSEngine:
    MODE_BASE_QUALITY = "base_quality"
    MODE_JOB_MATCH = "job_match"

    # Mode A weights: Section 35%, Format 30%, Verbs 20%, Proven skills 15% = 100%
    BASE_QUALITY_WEIGHTS = {
        "section_coverage": 0.35,
        "formatting": 0.30,
        "action_verbs": 0.20,
        "skill_breadth": 0.15,
    }

    # Mode B weights: Required 40%, Preferred 20%, Keywords 20%, Experience 10%, Format 10% = 100%
    JOB_MATCH_WEIGHTS = {
        "required_skills": 0.40,
        "preferred_skills": 0.20,
        "keyword_relevance": 0.20,
        "experience_alignment": 0.10,
        "formatting": 0.10,
    }

    @staticmethod
    def _normalize_skills(extracted_skills: Sequence[ExtractedSkill | dict]) -> list[ExtractedSkill]:
        normalized: list[ExtractedSkill] = []
        for skill in extracted_skills:
            if isinstance(skill, ExtractedSkill):
                normalized.append(skill)
                continue

            normalized.append(
                ExtractedSkill(
                    skill=skill.get("skill") or skill.get("skill_name", ""),
                    category=skill.get("category") or skill.get("skill_category", "general"),
                    confidence=float(skill.get("confidence") or skill.get("confidence_score", 0.0)),
                    source=skill.get("source", "keyword"),
                    frequency=int(skill.get("frequency", 1)),
                    is_inferred=bool(skill.get("is_inferred", False)),
                    evidence_excerpt=skill.get("evidence_excerpt", ""),
                )
            )
        return [skill for skill in normalized if skill.skill]

    @staticmethod
    def _get_verdict(score: float, mode: str) -> str:
        if mode == ATSEngine.MODE_JOB_MATCH:
            if score >= 85:
                return "Strong Match"
            if score >= 70:
                return "Good Match"
            if score >= 50:
                return "Moderate Match"
            return "Low Match"
        else:
            if score >= 85:
                return "Excellent"
            if score >= 70:
                return "Good Quality"
            if score >= 50:
                return "Average Quality"
            return "Needs Improvement"

    @classmethod
    def calculate(cls, extracted_skills: Sequence[ExtractedSkill | dict]) -> float:
        """
        Calculate demonstrated skill breadth from PROVEN skills only.
        Inferred or graph-expanded skills are excluded from volume scoring.
        """
        skills = cls._normalize_skills(extracted_skills)
        # Filter strictly to explicitly evidenced / non-inferred skills
        proven_skills = [
            skill for skill in skills
            if not skill.is_inferred and skill.category != "related_skill"
        ]
        if not proven_skills:
            return 0.0

        unique_skills = {canonicalize_skill(skill.skill) for skill in proven_skills}
        categories = {skill.category for skill in proven_skills}
        avg_confidence = sum(skill.confidence for skill in proven_skills) / len(proven_skills)

        # Max volume achieved at 12 proven skills (60 pts)
        volume_score = min((len(unique_skills) / 12) * 60, 60.0)
        # Max diversity achieved across 5 categories (30 pts)
        diversity_score = min((len(categories) / 5) * 30, 30.0)
        # Confidence score (up to 10 pts)
        confidence_score = avg_confidence * 10.0

        return round(min(volume_score + diversity_score + confidence_score, 100.0), 2)

    @classmethod
    def calculate_base_quality(
        cls,
        resume_text: str,
        extracted_skills: Sequence[ExtractedSkill | dict],
    ) -> dict:
        """
        Mode A: Base Quality Assessment (no job description supplied).
        Weights: Section (35%), Formatting (30%), Action Verbs (20%), Proven Skills (15%).
        Keyword match is explicitly set to 0.0 / Not Applicable.
        """
        section_coverage = SectionEngine.score(resume_text)
        formatting = FormatEngine.score(resume_text)
        action_verbs = ActionVerbEngine.score(resume_text)
        skill_breadth = cls.calculate(extracted_skills)

        base_score = round(
            min(
                section_coverage * cls.BASE_QUALITY_WEIGHTS["section_coverage"]
                + formatting * cls.BASE_QUALITY_WEIGHTS["formatting"]
                + action_verbs * cls.BASE_QUALITY_WEIGHTS["action_verbs"]
                + skill_breadth * cls.BASE_QUALITY_WEIGHTS["skill_breadth"],
                100.0,
            ),
            2,
        )

        breakdown = ATSBreakdown(
            keyword_match=0.0,
            skill_diversity=skill_breadth,
            formatting=formatting,
            action_verbs=action_verbs,
            section_coverage=section_coverage,
            scoring_mode=cls.MODE_BASE_QUALITY,
            base_quality_score=base_score,
            job_match_score=None,
        )

        dimensions = {
            "section_coverage": {
                "raw_score": section_coverage,
                "weight": cls.BASE_QUALITY_WEIGHTS["section_coverage"],
                "weighted_score": round(section_coverage * cls.BASE_QUALITY_WEIGHTS["section_coverage"], 2),
                "status": "evaluated",
                "notes": "Completeness of canonical resume sections (Summary, Skills, Experience, Education, Projects).",
            },
            "formatting": {
                "raw_score": formatting,
                "weight": cls.BASE_QUALITY_WEIGHTS["formatting"],
                "weighted_score": round(formatting * cls.BASE_QUALITY_WEIGHTS["formatting"], 2),
                "status": "evaluated",
                "notes": "Layout hygiene, contact headers, bullet structures, and text parseability.",
            },
            "action_verbs": {
                "raw_score": action_verbs,
                "weight": cls.BASE_QUALITY_WEIGHTS["action_verbs"],
                "weighted_score": round(action_verbs * cls.BASE_QUALITY_WEIGHTS["action_verbs"], 2),
                "status": "evaluated",
                "notes": "Strength of action verbs and quantified impact metrics in accomplishment bullets.",
            },
            "skill_breadth": {
                "raw_score": skill_breadth,
                "weight": cls.BASE_QUALITY_WEIGHTS["skill_breadth"],
                "weighted_score": round(skill_breadth * cls.BASE_QUALITY_WEIGHTS["skill_breadth"], 2),
                "status": "evaluated",
                "notes": "Breadth and diversity of explicitly evidenced technical skills.",
            },
            "keyword_match": {
                "raw_score": 0.0,
                "weight": 0.0,
                "weighted_score": 0.0,
                "status": "not_applicable",
                "notes": "Job-specific keyword matching requires a target role or job description.",
            },
        }

        return {
            "score": int(round(base_score)),
            "ats_score": int(round(base_score)),
            "scoring_mode": cls.MODE_BASE_QUALITY,
            "verdict": cls._get_verdict(base_score, cls.MODE_BASE_QUALITY),
            "breakdown": breakdown.to_dict(),
            "dimensions": dimensions,
        }

    @staticmethod
    def _evaluate_experience_alignment(resume_text: str, job_description: str) -> float:
        """
        Evaluate experience alignment between resume text and job description.
        Checks for experience section, bullet count, and years of experience parity.
        """
        if not resume_text.strip():
            return 0.0

        score = 60.0  # Baseline for having parsable content
        resume_lower = resume_text.lower()
        jd_lower = job_description.lower()

        # Check for experience section
        if any(h in resume_lower for h in ("experience", "work history", "employment")):
            score += 20.0

        # Check for years requirement
        jd_years_match = re.search(r"(\d+)\+?\s*years?(?:\s+of)?\s+(?:experience|work)", jd_lower)
        resume_years_match = re.search(r"(\d+)\+?\s*years?(?:\s+of)?\s+(?:experience|work)", resume_lower)

        if jd_years_match and resume_years_match:
            jd_years = int(jd_years_match.group(1))
            res_years = int(resume_years_match.group(1))
            if res_years >= jd_years:
                score += 20.0
            else:
                score += max(0.0, (res_years / max(jd_years, 1)) * 20.0)
        elif jd_years_match and not resume_years_match:
            # JD requested specific years, not explicitly found in summary
            score += 5.0
        else:
            # General experience alignment
            score += 15.0

        return round(min(max(score, 0.0), 100.0), 2)

    @classmethod
    def calculate_job_match(
        cls,
        resume_text: str,
        extracted_skills: Sequence[ExtractedSkill | dict],
        job_description: str,
        target_role_skills: dict | None = None,
    ) -> dict:
        """
        Mode B: Job-Specific ATS Match.
        Weights: Required skills (40%), Preferred skills (20%), Keywords (20%),
                 Experience alignment (10%), Formatting (10%).
        Sum = 100%. Missing dimensions do not receive unearned points.
        """
        if not job_description or not job_description.strip():
            return cls.calculate_base_quality(resume_text, extracted_skills)

        skills = cls._normalize_skills(extracted_skills)
        proven_skills = {
            canonicalize_skill(s.skill)
            for s in skills
            if not s.is_inferred and s.category != "related_skill"
        }

        # Determine required and preferred skills
        if target_role_skills and (target_role_skills.get("required") or target_role_skills.get("preferred")):
            required_skills = {canonicalize_skill(s) for s in target_role_skills.get("required", [])}
            preferred_skills = {canonicalize_skill(s) for s in target_role_skills.get("preferred", [])}
        else:
            # Extract from job description
            jd_extracted = SkillExtractor.extract_hybrid(job_description)
            jd_skill_names = [canonicalize_skill(s.skill) for s in jd_extracted]
            # Deduplicate preserving order
            seen = set()
            ordered_unique = [s for s in jd_skill_names if not (s in seen or seen.add(s))]
            
            # Top 60% are treated as core required, remaining as preferred
            split_idx = max(1, int(len(ordered_unique) * 0.6))
            required_skills = set(ordered_unique[:split_idx])
            preferred_skills = set(ordered_unique[split_idx:])

        # Required skills coverage (40% weight)
        if required_skills:
            req_matched = required_skills & proven_skills
            req_score = round((len(req_matched) / len(required_skills)) * 100.0, 2)
        else:
            # Fallback to general keyword match if no structured skills identified in JD
            req_score = KeywordEngine.score(resume_text, job_description)

        # Preferred skills coverage (20% weight)
        if preferred_skills:
            pref_matched = preferred_skills & proven_skills
            pref_score = round((len(pref_matched) / len(preferred_skills)) * 100.0, 2)
        else:
            pref_score = req_score

        # Contextual keyword relevance (20% weight)
        keyword_score = KeywordEngine.score(resume_text, job_description)

        # Experience alignment (10% weight)
        experience_score = cls._evaluate_experience_alignment(resume_text, job_description)

        # Formatting (10% weight)
        format_score = FormatEngine.score(resume_text)

        job_match_score = round(
            min(
                req_score * cls.JOB_MATCH_WEIGHTS["required_skills"]
                + pref_score * cls.JOB_MATCH_WEIGHTS["preferred_skills"]
                + keyword_score * cls.JOB_MATCH_WEIGHTS["keyword_relevance"]
                + experience_score * cls.JOB_MATCH_WEIGHTS["experience_alignment"]
                + format_score * cls.JOB_MATCH_WEIGHTS["formatting"],
                100.0,
            ),
            2,
        )

        action_verbs = ActionVerbEngine.score(resume_text)
        section_coverage = SectionEngine.score(resume_text)
        skill_diversity = cls.calculate(extracted_skills)

        breakdown = ATSBreakdown(
            keyword_match=keyword_score,
            skill_diversity=skill_diversity,
            formatting=format_score,
            action_verbs=action_verbs,
            section_coverage=section_coverage,
            scoring_mode=cls.MODE_JOB_MATCH,
            base_quality_score=None,
            job_match_score=job_match_score,
            required_skills_score=req_score,
            preferred_skills_score=pref_score,
            experience_alignment_score=experience_score,
        )

        dimensions = {
            "required_skills": {
                "raw_score": req_score,
                "weight": cls.JOB_MATCH_WEIGHTS["required_skills"],
                "weighted_score": round(req_score * cls.JOB_MATCH_WEIGHTS["required_skills"], 2),
                "status": "evaluated",
                "notes": f"Match on essential role skills ({len(required_skills & proven_skills)} of {len(required_skills)} required).",
            },
            "preferred_skills": {
                "raw_score": pref_score,
                "weight": cls.JOB_MATCH_WEIGHTS["preferred_skills"],
                "weighted_score": round(pref_score * cls.JOB_MATCH_WEIGHTS["preferred_skills"], 2),
                "status": "evaluated",
                "notes": f"Match on secondary/preferred skills ({len(preferred_skills & proven_skills)} of {len(preferred_skills)} preferred).",
            },
            "keyword_relevance": {
                "raw_score": keyword_score,
                "weight": cls.JOB_MATCH_WEIGHTS["keyword_relevance"],
                "weighted_score": round(keyword_score * cls.JOB_MATCH_WEIGHTS["keyword_relevance"], 2),
                "status": "evaluated",
                "notes": "Exact and contextual phrase alignment with target job description.",
            },
            "experience_alignment": {
                "raw_score": experience_score,
                "weight": cls.JOB_MATCH_WEIGHTS["experience_alignment"],
                "weighted_score": round(experience_score * cls.JOB_MATCH_WEIGHTS["experience_alignment"], 2),
                "status": "evaluated",
                "notes": "Seniority and experience history alignment with job requirements.",
            },
            "formatting": {
                "raw_score": format_score,
                "weight": cls.JOB_MATCH_WEIGHTS["formatting"],
                "weighted_score": round(format_score * cls.JOB_MATCH_WEIGHTS["formatting"], 2),
                "status": "evaluated",
                "notes": "ATS layout hygiene, contact information, and bullet parsing.",
            },
        }

        return {
            "score": int(round(job_match_score)),
            "ats_score": int(round(job_match_score)),
            "scoring_mode": cls.MODE_JOB_MATCH,
            "verdict": cls._get_verdict(job_match_score, cls.MODE_JOB_MATCH),
            "breakdown": breakdown.to_dict(),
            "dimensions": dimensions,
        }

    @classmethod
    def calculate_pro_ats(
        cls,
        resume_text: str,
        extracted_skills: Sequence[ExtractedSkill | dict],
        job_description: str = "",
    ) -> dict:
        """
        Backwards-compatible gateway. Routes to Mode B if JD is provided, else Mode A.
        """
        if job_description and job_description.strip():
            analysis = cls.calculate_job_match(resume_text, extracted_skills, job_description)
        else:
            analysis = cls.calculate_base_quality(resume_text, extracted_skills)

        return {
            "score": analysis["score"],
            "ats_score": analysis["ats_score"],
            "scoring_mode": analysis["scoring_mode"],
            "breakdown": analysis["breakdown"],
        }

    @classmethod
    def full_analysis(
        cls,
        resume_text: str,
        extracted_skills: Sequence[ExtractedSkill | dict],
        job_description: str = "",
    ) -> dict:
        if job_description and job_description.strip():
            analysis = cls.calculate_job_match(resume_text, extracted_skills, job_description)
        else:
            analysis = cls.calculate_base_quality(resume_text, extracted_skills)

        missing_skills = MissingSkillEngine.detect_missing_skills(resume_text, job_description)

        return {
            "score": analysis["score"],
            "ats_score": analysis["ats_score"],
            "scoring_mode": analysis["scoring_mode"],
            "verdict": analysis.get("verdict", "Good Quality"),
            "breakdown": analysis["breakdown"],
            "dimensions": analysis.get("dimensions", {}),
            "missing_skills": [skill.to_dict() for skill in missing_skills],
        }
