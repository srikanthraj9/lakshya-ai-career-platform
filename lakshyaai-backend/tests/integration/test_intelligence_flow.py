import unittest
import uuid
from app.db import models, schemas
from app.services.recommendation_engine import RecommendationEngine


class TestIntelligenceFlowIntegration(unittest.TestCase):
    def test_multi_signal_orchestration_priority(self):
        user_id = str(uuid.uuid4())
        recs = RecommendationEngine.evaluate(
            user_id=user_id,
            target_role="Full Stack Engineer",
            resume_data={"ats_score": 82, "skills": ["React", "TypeScript"]},
            role_match_data={"missing_skills": ["Kubernetes", "AWS"]},
            roadmap_data={"completed_steps": [1, 2], "total_steps": 5},
            interview_data={"latest_score": 70},
            job_matches_data=[{"title": "Full Stack Dev", "company": "Airbnb", "match_score": 91}],
            active_goal=None,
        )

        self.assertGreaterEqual(len(recs), 3)
        # Top recommendation should be critical missing skill
        top = recs[0]
        self.assertEqual(top["priority"], "critical")
        self.assertIn("Kubernetes", top["title"])
        self.assertIn("reason", top)
        self.assertGreater(top["impact_score"], 0)

    def test_automation_rule_schema(self):
        user_id = uuid.uuid4()
        rule = models.CareerAutomationRule(
            user_id=user_id,
            trigger_type="high_match_job",
            condition_config={"min_match": 90},
            action_type="create_recommendation",
            action_config={"message": "High-match opening found"},
            is_enabled=True,
        )
        self.assertEqual(rule.user_id, user_id)
        self.assertTrue(rule.is_enabled)


if __name__ == "__main__":
    unittest.main()
