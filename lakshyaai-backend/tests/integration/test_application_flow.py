import unittest
import uuid
from app.db import models, schemas


class TestApplicationFlowIntegration(unittest.TestCase):
    def test_application_lifecycle_and_events(self):
        user_id = uuid.uuid4()
        app_id = uuid.uuid4()

        app = models.JobApplication(
            id=app_id,
            user_id=user_id,
            company_name="Stripe",
            job_title="Staff Infrastructure Engineer",
            stage="applied",
            status="active",
            match_score_at_application=96.0,
        )

        event = models.ApplicationEvent(
            application_id=app_id,
            user_id=user_id,
            event_type="stage_changed",
            previous_stage="wishlist",
            new_stage="applied",
            title="Applied via referral",
        )

        self.assertEqual(app.id, event.application_id)
        self.assertEqual(event.new_stage, "applied")

    def test_interview_debrief_and_learning(self):
        user_id = uuid.uuid4()
        app_id = uuid.uuid4()

        debrief = models.InterviewDebrief(
            user_id=user_id,
            application_id=app_id,
            company_name="Google",
            round_type="System Design",
            difficulty_rating=5,
            technical_score=9.0,
            communication_score=8.5,
            system_design_score=9.0,
            questions_asked=["Design global distributed rate limiter"],
            identified_weaknesses=["Redis cluster failover guarantees"],
            outcome="passed",
        )

        self.assertEqual(debrief.outcome, "passed")
        self.assertEqual(debrief.difficulty_rating, 5)
        self.assertIn("Redis cluster failover guarantees", debrief.identified_weaknesses)


if __name__ == "__main__":
    unittest.main()
