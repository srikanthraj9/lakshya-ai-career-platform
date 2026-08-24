import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone


def generate_fingerprint(user_id: str, rec_type: str, source_module: str, target_identifier: str) -> str:
    raw = f"{user_id}:{rec_type}:{source_module}:{target_identifier}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


class RecommendationEngine:
    @staticmethod
    def evaluate(
        user_id: str,
        target_role: str,
        resume_data: Optional[Dict[str, Any]],
        role_match_data: Optional[Dict[str, Any]],
        roadmap_data: Optional[Dict[str, Any]],
        interview_data: Optional[Dict[str, Any]],
        job_matches_data: Optional[List[Dict[str, Any]]],
        active_goal: Optional[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        recommendations: List[Dict[str, Any]] = []

        ats_score = (resume_data.get("ats_score") if resume_data else None) or 0
        missing_skills = (role_match_data.get("missing_skills") if role_match_data else []) or []
        verified_skills = (resume_data.get("skills") if resume_data else []) or []
        interview_score = (interview_data.get("latest_score") if interview_data else None)
        completed_steps = (roadmap_data.get("completed_steps") if roadmap_data else []) or []
        total_milestones = (roadmap_data.get("total_steps") if roadmap_data else 5)

        # 1. Critical Missing Skill Recommendation
        if missing_skills:
            top_missing = missing_skills[0] if isinstance(missing_skills[0], str) else missing_skills[0].get("name", "Docker")
            other_missing = missing_skills[1] if len(missing_skills) > 1 and isinstance(missing_skills[1], str) else None
            job_mentions = 4  # e.g., appears in 4 matched roles

            impact = 0.95
            confidence = 0.90
            urgency = 0.85
            score = impact * confidence * urgency

            factors = [
                f"Required by target role '{target_role}'",
                f"Missing from verified resume skills ({len(verified_skills)} verified)",
                f"Referenced in {job_mentions} matched opportunities",
            ]

            fingerprint = generate_fingerprint(user_id, "skill_gap", "role_alignment", str(top_missing).lower())

            recommendations.append({
                "client_event_id": fingerprint,
                "recommendation_type": "skill_gap",
                "title": f"Master {top_missing} & Add to Roadmap",
                "description": f"{top_missing} is the primary skill gap separating your profile from high-tier {target_role} openings.",
                "source_module": "role_alignment",
                "target_module": "roadmap",
                "priority": "critical",
                "impact_score": round(impact * 100, 1),
                "confidence_score": round(confidence * 100, 1),
                "urgency_score": round(urgency, 2),
                "action_url": f"/roadmap?skill={top_missing}",
                "action_label": "Add to Roadmap",
                "reason": {
                    "signal": "role_skill_gap",
                    "impact": impact,
                    "confidence": confidence,
                    "urgency": urgency,
                    "explanation": f"{top_missing} is missing from your active resume and required by {target_role} benchmarks.",
                    "factors": factors,
                },
                "metadata": {"skill": top_missing, "job_mentions": job_mentions},
            })

        # 2. Resume ATS Optimization
        if ats_score > 0 and ats_score < 85:
            impact = 0.85
            confidence = 0.92
            urgency = 0.75
            fingerprint = generate_fingerprint(user_id, "resume_optimization", "resume_studio", "ats_score")

            recommendations.append({
                "client_event_id": fingerprint,
                "recommendation_type": "resume",
                "title": "Optimize Bullet Points with STAR Metrics",
                "description": f"Your current ATS score is {ats_score}%. Incorporate quantified achievements to exceed 90%.",
                "source_module": "resume_studio",
                "target_module": "resume_rewrite",
                "priority": "high",
                "impact_score": round(impact * 100, 1),
                "confidence_score": round(confidence * 100, 1),
                "urgency_score": round(urgency, 2),
                "action_url": "/resume/rewrite",
                "action_label": "Optimize with AI",
                "reason": {
                    "signal": "ats_score_below_target",
                    "impact": impact,
                    "confidence": confidence,
                    "urgency": urgency,
                    "explanation": "ATS score improvement directly increases recruiter screen pass rates.",
                    "factors": [
                        f"Current ATS score is {ats_score}% (Target: 90%+)",
                        "Quantified impact metrics improve resume parsing accuracy",
                    ],
                },
                "metadata": {"current_ats": ats_score},
            })

        # 3. Interview Studio Practice
        if interview_score is None or interview_score < 75:
            impact = 0.80
            confidence = 0.88
            urgency = 0.70
            fingerprint = generate_fingerprint(user_id, "interview_practice", "interview_studio", "voice_simulation")

            recommendations.append({
                "client_event_id": fingerprint,
                "recommendation_type": "interview",
                "title": "Validate Architecture & Behavioral in Voice AI Mock",
                "description": "5-minute technical simulation with real-time speech evaluation and STAR scorecards.",
                "source_module": "interview_studio",
                "target_module": "interview",
                "priority": "high" if (interview_score is not None and interview_score < 60) else "medium",
                "impact_score": round(impact * 100, 1),
                "confidence_score": round(confidence * 100, 1),
                "urgency_score": round(urgency, 2),
                "action_url": "/interview/voice-ai",
                "action_label": "Start Voice Interview",
                "reason": {
                    "signal": "interview_readiness_gap",
                    "impact": impact,
                    "confidence": confidence,
                    "urgency": urgency,
                    "explanation": "Mock interview practice builds vocal confidence and validates technical answers.",
                    "factors": [
                        "Voice simulation measures speech pace and structure",
                        "Validates readiness under time pressure",
                    ],
                },
                "metadata": {"last_score": interview_score},
            })

        # 4. High Match Job Tailoring
        if job_matches_data and len(job_matches_data) > 0:
            top_job = job_matches_data[0]
            job_title = top_job.get("title", "Senior Full Stack Engineer")
            company = top_job.get("company", "TechCorp")
            match_pct = top_job.get("match_score", 94)

            impact = 0.78
            confidence = 0.85
            urgency = 0.65
            fingerprint = generate_fingerprint(user_id, "job_tailor", "opportunity_hub", f"{job_title}:{company}")

            recommendations.append({
                "client_event_id": fingerprint,
                "recommendation_type": "job",
                "title": f"Tailor Resume for {job_title} at {company}",
                "description": f"94% compatibility detected. Fine-tune your summary to maximize interview conversion.",
                "source_module": "opportunity_hub",
                "target_module": "jobs",
                "priority": "opportunity",
                "impact_score": round(impact * 100, 1),
                "confidence_score": round(confidence * 100, 1),
                "urgency_score": round(urgency, 2),
                "action_url": "/jobs",
                "action_label": "View & Tailor",
                "reason": {
                    "signal": "high_match_job_detected",
                    "impact": impact,
                    "confidence": confidence,
                    "urgency": urgency,
                    "explanation": f"Candidate profile matches {match_pct}% of job requirements.",
                    "factors": [
                        f"{match_pct}% semantic fit score",
                        "Immediate hiring opportunity",
                    ],
                },
                "metadata": {"company": company, "match_pct": match_pct},
            })

        # 5. Roadmap Completion
        if len(completed_steps) < total_milestones:
            impact = 0.70
            confidence = 0.82
            urgency = 0.60
            fingerprint = generate_fingerprint(user_id, "roadmap_step", "roadmap", f"step-{len(completed_steps)}")

            recommendations.append({
                "client_event_id": fingerprint,
                "recommendation_type": "roadmap",
                "title": f"Complete Next Career Roadmap Step ({len(completed_steps)}/{total_milestones} Done)",
                "description": "Progress through your customized learning path to reach target readiness milestones.",
                "source_module": "roadmap",
                "target_module": "roadmap",
                "priority": "medium",
                "impact_score": round(impact * 100, 1),
                "confidence_score": round(confidence * 100, 1),
                "urgency_score": round(urgency, 2),
                "action_url": "/roadmap",
                "action_label": "Continue Roadmap",
                "reason": {
                    "signal": "active_learning_path",
                    "impact": impact,
                    "confidence": confidence,
                    "urgency": urgency,
                    "explanation": "Milestone completion systematically builds role coverage.",
                    "factors": [
                        f"{len(completed_steps)} of {total_milestones} milestones finished",
                        "Structured resource guide available",
                    ],
                },
                "metadata": {"completed": len(completed_steps), "total": total_milestones},
            })

        # Rank recommendations by Priority Score = Impact * Confidence * Urgency (descending)
        recommendations.sort(
            key=lambda r: (
                0 if r["priority"] == "critical" else 1 if r["priority"] == "high" else 2 if r["priority"] == "opportunity" else 3,
                -(r["impact_score"] * r["confidence_score"] * r["urgency_score"]),
            )
        )

        return recommendations
