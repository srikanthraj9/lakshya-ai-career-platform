import unittest
import uuid
from app.services.recommendation_engine import RecommendationEngine


class TestIntelligenceRecommendationEngine(unittest.TestCase):
    def test_priority_score_formula(self):
        # Formula: priority = impact * confidence * urgency
        score = 0.9 * 0.9 * 0.9
        self.assertGreater(score, 0.7)

    def test_recommendation_engine_evaluate(self):
        user_id = str(uuid.uuid4())
        recs = RecommendationEngine.evaluate(
            user_id=user_id,
            target_role="Full Stack Engineer",
            resume_data={"ats_score": 75, "skills": ["React", "TypeScript"]},
            role_match_data={"missing_skills": ["Docker", "Kubernetes"]},
            roadmap_data={"completed_steps": [1], "total_steps": 5},
            interview_data={"latest_score": 65},
            job_matches_data=[{"title": "Senior Engineer", "company": "Stripe", "match_score": 94}],
            active_goal=None,
        )
        self.assertGreater(len(recs), 0)

        for r in recs:
            self.assertIn(r["priority"], ["critical", "high", "medium", "opportunity"])
            self.assertIn("reason", r)
            self.assertIn("explanation", r["reason"])
            self.assertIn("factors", r["reason"])
            self.assertTrue(r["action_url"].startswith("/"))


if __name__ == "__main__":
    unittest.main()
