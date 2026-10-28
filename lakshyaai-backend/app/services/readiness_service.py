"""
Candidate Readiness Service
===========================
Phase 4, Milestone 4.3: Unified, Evidence-Based Candidate Readiness Index (R).

Provides a single, mathematically rigorous, and transparent scoring calculation
used consistently across all admin and candidate endpoints (list_users, get_user_detail,
workspace, and recommendations).

Scoring Dimensions:
1. Resume Health / ATS Score (Weight: 40%) - Measured ATS match capability.
2. Mock Interview Preparedness (Weight: 30%) - Measured technical/communication rating.
3. Career Profile & Direction (Weight: 15%) - Onboarding completion and goal clarity.
4. Active Execution / Job Search (Weight: 15%) - Bounded job application activity.

Evidence-Based Rules:
- If a candidate has NO assessment evidence (no resume, no interview, no applications),
  the score returns None (Insufficient Data / Provisional) rather than an invented number.
- When partial assessment data is present, weights are redistributed proportionally
  across verified dimensions.
- All scores are normalized to 0.0 - 100.0.
"""

from typing import Optional


class CandidateReadinessService:
    """Computes transparent, reproducible career readiness scores for candidates."""

    WEIGHT_RESUME = 0.40
    WEIGHT_INTERVIEW = 0.30
    WEIGHT_PROFILE = 0.15
    WEIGHT_EXECUTION = 0.15

    @classmethod
    def calculate_readiness(
        cls,
        ats_score: Optional[float] = None,
        latest_interview_score: Optional[float] = None,
        interviews_count: int = 0,
        onboarding_completed: bool = False,
        applications_count: int = 0,
        has_resume: bool = False,
    ) -> Optional[float]:
        """
        Calculate the unified Composite Candidate Readiness Index.

        Returns:
            Optional[float]: A float between 0.0 and 100.0 rounded to 1 decimal place,
                             or None if there is insufficient evidence to assess readiness.
        """
        # Determine dimension scores and availability
        available_dimensions: dict[str, tuple[float, float]] = {}

        # 1. Resume Dimension (ATS Score)
        # If resume exists with an ATS score, use ats_score (clamped 0-100).
        # If resume exists but ATS score has not been calculated yet, assign standard baseline 65.0.
        if ats_score is not None:
            available_dimensions["resume"] = (
                max(0.0, min(100.0, float(ats_score))),
                cls.WEIGHT_RESUME,
            )
        elif has_resume:
            available_dimensions["resume"] = (65.0, cls.WEIGHT_RESUME)

        # 2. Interview Dimension
        if latest_interview_score is not None:
            available_dimensions["interview"] = (
                max(0.0, min(100.0, float(latest_interview_score))),
                cls.WEIGHT_INTERVIEW,
            )
        elif interviews_count > 0:
            # Candidate has engaged in interview prep, baseline 70.0
            available_dimensions["interview"] = (70.0, cls.WEIGHT_INTERVIEW)

        # 3. Profile Dimension (Onboarding & Career Setup)
        if onboarding_completed:
            available_dimensions["profile"] = (100.0, cls.WEIGHT_PROFILE)

        # 4. Execution Dimension (Applications Bounded: 4+ apps = 100%)
        if applications_count > 0:
            exec_score = min(100.0, float(applications_count) * 25.0)
            available_dimensions["execution"] = (exec_score, cls.WEIGHT_EXECUTION)

        # Evidence Rule: If candidate has no assessment dimensions (no resume, no interview, no applications),
        # return None (Insufficient Data)
        assessment_dimensions = [k for k in available_dimensions if k in ("resume", "interview", "execution")]
        if not assessment_dimensions:
            return None

        # Proportional weight redistribution
        total_weight = sum(w for _, w in available_dimensions.values())
        if total_weight <= 0.0:
            return None

        composite_score = sum(score * (weight / total_weight) for score, weight in available_dimensions.values())
        return round(max(0.0, min(100.0, composite_score)), 1)
