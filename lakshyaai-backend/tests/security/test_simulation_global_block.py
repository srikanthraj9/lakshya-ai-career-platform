import unittest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.db.database import get_db, SessionLocal
from app.db import models
from app.core.security import create_access_token, get_password_hash
from app.services.simulation_service import SimulationService


class TestSimulationGlobalMutationBlock(unittest.TestCase):
    """
    Verifies that when X-Simulation-Token is attached to ANY mutating request
    (POST, PUT, PATCH, DELETE) across all candidate and administrative endpoints,
    the server strictly rejects it with 403 Forbidden.
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db: Session = SessionLocal()

        # Create Super Admin
        cls.super_admin = models.User(
            email=f"superadmin_{uuid.uuid4().hex[:8]}@lakshya.ai",
            password_hash=get_password_hash("SuperSecurePass123!"),
            full_name="Super Admin Security Tester",
            role="super_admin",
            is_email_verified=True,
            is_suspended=False,
        )
        cls.db.add(cls.super_admin)

        # Create Target Candidate
        cls.candidate = models.User(
            email=f"candidate_{uuid.uuid4().hex[:8]}@test.com",
            password_hash=get_password_hash("CandidatePass123!"),
            full_name="Target Candidate",
            role="user",
            is_email_verified=True,
            is_suspended=False,
        )
        cls.db.add(cls.candidate)
        cls.db.commit()
        cls.db.refresh(cls.super_admin)
        cls.db.refresh(cls.candidate)

        cls.super_admin_jwt = create_access_token({"sub": str(cls.super_admin.id), "role": "super_admin"})

        # Start a simulation session
        session_obj, raw_token = SimulationService.start_simulation(
            db=cls.db,
            admin_user=cls.super_admin,
            target_user_id=str(cls.candidate.id),
            reason="Diagnostic mutation blocking verification",
            duration_minutes=30,
        )
        cls.sim_token = raw_token

    @classmethod
    def tearDownClass(cls):
        cls.db.query(models.AdminSimulationSession).filter(models.AdminSimulationSession.admin_user_id == cls.super_admin.id).delete()
        cls.db.query(models.User).filter(models.User.id.in_([cls.super_admin.id, cls.candidate.id])).delete()
        cls.db.commit()
        cls.db.close()

    def test_post_application_blocked_in_simulation(self):
        headers = {
            "Authorization": f"Bearer {self.super_admin_jwt}",
            "X-Simulation-Token": self.sim_token,
        }
        res = self.client.post(
            "/api/applications/",
            json={"company_name": "Google", "job_title": "Software Engineer", "stage": "applied"},
            headers=headers,
        )
        self.assertEqual(res.status_code, 403)
        data = res.json()
        self.assertEqual(data.get("error", {}).get("code"), "simulation_mutation_blocked")

    def test_patch_application_blocked_in_simulation(self):
        headers = {
            "Authorization": f"Bearer {self.super_admin_jwt}",
            "X-Simulation-Token": self.sim_token,
        }
        random_id = str(uuid.uuid4())
        res = self.client.patch(
            f"/api/applications/{random_id}",
            json={"stage": "interviewing"},
            headers=headers,
        )
        self.assertEqual(res.status_code, 403)

    def test_delete_application_blocked_in_simulation(self):
        headers = {
            "Authorization": f"Bearer {self.super_admin_jwt}",
            "X-Simulation-Token": self.sim_token,
        }
        random_id = str(uuid.uuid4())
        res = self.client.delete(
            f"/api/applications/{random_id}",
            headers=headers,
        )
        self.assertEqual(res.status_code, 403)

    def test_post_copilot_blocked_in_simulation(self):
        headers = {
            "Authorization": f"Bearer {self.super_admin_jwt}",
            "X-Simulation-Token": self.sim_token,
        }
        res = self.client.post(
            "/api/copilot/chat",
            json={"message": "Help me prepare for an interview"},
            headers=headers,
        )
        self.assertEqual(res.status_code, 403)

    def test_post_resume_upload_blocked_in_simulation(self):
        headers = {
            "Authorization": f"Bearer {self.super_admin_jwt}",
            "X-Simulation-Token": self.sim_token,
        }
        res = self.client.post(
            "/api/resumes/upload",
            files={"file": ("test.txt", b"sample resume text", "text/plain")},
            headers=headers,
        )
        self.assertEqual(res.status_code, 403)

    def test_simulation_end_is_allowed(self):
        headers = {
            "Authorization": f"Bearer {self.super_admin_jwt}",
            "X-Simulation-Token": self.sim_token,
        }
        res = self.client.post(
            "/api/admin/simulation/end",
            json={"token": self.sim_token, "reason": "Ended test successfully"},
            headers=headers,
        )
        self.assertEqual(res.status_code, 200)


if __name__ == "__main__":
    unittest.main()
