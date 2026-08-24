import unittest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.db.database import SessionLocal
from app.db import models


class TestIDORRegressionMatrix(unittest.TestCase):
    """
    Automated IDOR & Cross-User Security Regression Suite.
    Ensures that User B can never read, update, delete, or append to User A's resources.
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.user_a_id = uuid.uuid4()
        cls.user_b_id = uuid.uuid4()

        cls.token_a = create_access_token({"sub": str(cls.user_a_id)})
        cls.token_b = create_access_token({"sub": str(cls.user_b_id)})

        cls.headers_a = {"Authorization": f"Bearer {cls.token_a}"}
        cls.headers_b = {"Authorization": f"Bearer {cls.token_b}"}

        # Seed test users into database
        db = SessionLocal()
        cls.user_a = models.User(
            id=cls.user_a_id,
            email=f"user_a_{cls.user_a_id.hex[:8]}@example.com",
            password_hash="hashed_pw",
            full_name="Alice Victim",
            role="user",
            is_active=True,
            is_email_verified=True,
        )
        cls.user_b = models.User(
            id=cls.user_b_id,
            email=f"user_b_{cls.user_b_id.hex[:8]}@example.com",
            password_hash="hashed_pw",
            full_name="Bob Attacker",
            role="user",
            is_active=True,
            is_email_verified=True,
        )
        db.add(cls.user_a)
        db.add(cls.user_b)
        db.commit()

        # Seed User A resources
        cls.app_a = models.JobApplication(
            user_id=cls.user_a_id,
            company_name="Stripe",
            job_title="Staff Frontend Engineer",
            stage="applied",
            status="active",
        )
        cls.notif_a = models.Notification(
            user_id=cls.user_a_id,
            type="job_match",
            title="Confidential User A Match",
            message="Top secret offer notification",
            is_read=False,
        )
        cls.conv_a = models.CopilotConversation(
            user_id=cls.user_a_id,
            title="Private Salary Negotiation",
        )
        cls.goal_a = models.CareerGoal(
            user_id=cls.user_a_id,
            target_role="Staff Frontend Engineer",
            target_company="Stripe",
            target_salary="$250,000",
            is_active=True,
        )
        cls.rule_a = models.CareerAutomationRule(
            user_id=cls.user_a_id,
            trigger_type="ats_score_drop",
            condition_config={"threshold": 75},
            action_type="notify_user",
            action_config={},
            is_enabled=True,
        )
        cls.resume_a = models.Resume(
            user_id=cls.user_a_id,
            original_filename="alice_resume.pdf",
            parsed_text="Alice's confidential resume content",
            ats_score=92,
        )
        db.add(cls.app_a)
        db.add(cls.notif_a)
        db.add(cls.conv_a)
        db.add(cls.goal_a)
        db.add(cls.rule_a)
        db.add(cls.resume_a)
        db.commit()

        cls.app_a_id = cls.app_a.id
        cls.notif_a_id = cls.notif_a.id
        cls.conv_a_id = cls.conv_a.id
        cls.goal_a_id = cls.goal_a.id
        cls.rule_a_id = cls.rule_a.id
        cls.resume_a_id = cls.resume_a.id
        db.close()

    # -------------------------------------------------------------------------
    # 1. Job Applications IDOR Protection
    # -------------------------------------------------------------------------
    def test_idor_get_application(self):
        res = self.client.get(f"/api/applications/{self.app_a_id}", headers=self.headers_b)
        self.assertEqual(res.status_code, 404)

    def test_idor_patch_application(self):
        res = self.client.patch(
            f"/api/applications/{self.app_a_id}",
            json={"company_name": "Tampered Inc."},
            headers=self.headers_b,
        )
        self.assertEqual(res.status_code, 404)

    def test_idor_transition_application(self):
        res = self.client.post(
            f"/api/applications/{self.app_a_id}/transition",
            json={"stage": "offer"},
            headers=self.headers_b,
        )
        self.assertEqual(res.status_code, 404)

    def test_idor_debrief_create_on_foreign_application(self):
        res = self.client.post(
            f"/api/applications/{self.app_a_id}/debrief",
            json={"company_name": "Stripe", "round_type": "technical", "difficulty_rating": 4},
            headers=self.headers_b,
        )
        self.assertEqual(res.status_code, 404)

    def test_idor_get_debriefs_on_foreign_application(self):
        res = self.client.get(f"/api/applications/{self.app_a_id}/debriefs", headers=self.headers_b)
        self.assertEqual(res.status_code, 404)

    def test_idor_delete_application(self):
        res = self.client.delete(f"/api/applications/{self.app_a_id}", headers=self.headers_b)
        self.assertEqual(res.status_code, 404)

    # -------------------------------------------------------------------------
    # 2. Notifications IDOR Protection
    # -------------------------------------------------------------------------
    def test_idor_patch_notification_read(self):
        res = self.client.patch(f"/api/notifications/{self.notif_a_id}/read", headers=self.headers_b)
        self.assertEqual(res.status_code, 404)

    def test_idor_delete_notification(self):
        res = self.client.delete(f"/api/notifications/{self.notif_a_id}", headers=self.headers_b)
        self.assertIn(res.status_code, [200, 404])
        # Verify User A still has the notification
        res_a = self.client.get("/api/notifications", headers=self.headers_a)
        self.assertTrue(any(n["id"] == str(self.notif_a_id) for n in res_a.json()))

    # -------------------------------------------------------------------------
    # 3. Copilot Conversations IDOR Protection
    # -------------------------------------------------------------------------
    def test_idor_get_copilot_conversation(self):
        res = self.client.get(f"/api/copilot/conversations/{self.conv_a_id}", headers=self.headers_b)
        self.assertEqual(res.status_code, 404)

    def test_idor_post_copilot_chat_foreign_conversation_id(self):
        res = self.client.post(
            "/api/copilot/chat",
            json={"conversation_id": str(self.conv_a_id), "messages": [{"role": "user", "content": "Tamper"}]},
            headers=self.headers_b,
        )
        self.assertEqual(res.status_code, 404)

    def test_idor_delete_copilot_conversation(self):
        res = self.client.delete(f"/api/copilot/conversations/{self.conv_a_id}", headers=self.headers_b)
        self.assertEqual(res.status_code, 404)

    # -------------------------------------------------------------------------
    # 4. Career Goals & Automation Rules IDOR Protection
    # -------------------------------------------------------------------------
    def test_idor_patch_career_goal(self):
        res = self.client.patch(
            f"/api/intelligence/goals/{self.goal_a_id}",
            json={"target_salary": "$0"},
            headers=self.headers_b,
        )
        self.assertEqual(res.status_code, 404)

    def test_idor_patch_automation_rule(self):
        res = self.client.patch(
            f"/api/intelligence/automation-rules/{self.rule_a_id}",
            json={"is_enabled": False},
            headers=self.headers_b,
        )
        self.assertEqual(res.status_code, 404)

    def test_idor_delete_automation_rule(self):
        res = self.client.delete(
            f"/api/intelligence/automation-rules/{self.rule_a_id}",
            headers=self.headers_b,
        )
        self.assertEqual(res.status_code, 404)

    # -------------------------------------------------------------------------
    # 5. Resumes IDOR Protection
    # -------------------------------------------------------------------------
    def test_idor_get_resume_detail(self):
        res = self.client.get(f"/api/resumes/{self.resume_a_id}", headers=self.headers_b)
        self.assertEqual(res.status_code, 404)

    def test_idor_get_resume_feedback(self):
        res = self.client.get(f"/api/resumes/{self.resume_a_id}/feedback", headers=self.headers_b)
        self.assertEqual(res.status_code, 404)

    def test_idor_get_resume_similar(self):
        res = self.client.get(f"/api/resumes/{self.resume_a_id}/similar", headers=self.headers_b)
        self.assertEqual(res.status_code, 404)

    def test_idor_get_resume_file(self):
        res = self.client.get(f"/api/resumes/{self.resume_a_id}/file", headers=self.headers_b)
        self.assertEqual(res.status_code, 404)

    def test_idor_delete_resume(self):
        res = self.client.delete(f"/api/resumes/{self.resume_a_id}", headers=self.headers_b)
        self.assertEqual(res.status_code, 404)


if __name__ == "__main__":
    unittest.main()
