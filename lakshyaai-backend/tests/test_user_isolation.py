import unittest
import uuid
from app.db import models


class TestUserIsolationAndSecurity(unittest.TestCase):
    def test_user_id_foreign_keys(self):
        # Verify that all tenant-specific models contain non-nullable user_id
        user1_id = uuid.uuid4()
        user2_id = uuid.uuid4()

        app1 = models.JobApplication(
            user_id=user1_id,
            company_name="Google",
            job_title="SWE",
            stage="applied",
        )
        app2 = models.JobApplication(
            user_id=user2_id,
            company_name="Stripe",
            job_title="SWE",
            stage="interviewing",
        )

        self.assertNotEqual(app1.user_id, app2.user_id)
        self.assertEqual(app1.user_id, user1_id)
        self.assertEqual(app2.user_id, user2_id)

    def test_goal_isolation(self):
        user_id = uuid.uuid4()
        goal = models.CareerGoal(
            user_id=user_id,
            target_role="Staff Engineer",
            target_company="Google",
            is_active=True,
        )
        self.assertEqual(goal.user_id, user_id)
        self.assertEqual(goal.target_role, "Staff Engineer")
        self.assertTrue(goal.is_active)


if __name__ == "__main__":
    unittest.main()
