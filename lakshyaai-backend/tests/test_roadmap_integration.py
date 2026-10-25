import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.db.database import SessionLocal
from app.db import models


class TestRoadmapIntegration(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()
        # Find or create a test user
        user = self.db.query(models.User).filter(models.User.email == "test_roadmap_user@example.com").first()
        if not user:
            user = models.User(
                email="test_roadmap_user@example.com",
                password_hash="hashed_test_password",
                full_name="Roadmap Test User",
                role="user",
                is_active=True,
            )
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
        self.user = user
        self.token = create_access_token(data={"sub": str(user.id), "role": "candidate"})
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def tearDown(self):
        self.db.close()

    def test_roadmap_generate_endpoint_success(self):
        payload = {
            "target_role": "Backend Engineer",
            "experience_level": "Intermediate",
            "current_skills": ["Python", "SQL"],
        }
        response = self.client.post("/api/roadmap/generate", json=payload, headers=self.headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("roadmap", data)
        self.assertIn("track", data)
        self.assertTrue(len(data["roadmap"]) > 0)
        first_step = data["roadmap"][0]
        self.assertIn("step", first_step)
        self.assertIn("resources", first_step)

    def test_roles_career_path_alias_endpoint_success(self):
        payload = {
            "target_role": "Frontend Developer",
            "experience_level": "Beginner",
            "current_skills": ["HTML", "CSS"],
        }
        response = self.client.post("/api/roles/career-path", json=payload, headers=self.headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("roadmap", data)
        self.assertTrue(len(data["roadmap"]) > 0)

    def test_roadmap_progress_save_and_retrieve(self):
        progress_payload = {
            "role": "Backend Engineer",
            "experience_level": "Intermediate",
            "completed_steps": [0, 1, 2],
        }
        save_resp = self.client.post("/api/roadmap/progress", json=progress_payload, headers=self.headers)
        self.assertEqual(save_resp.status_code, 200)

        get_resp = self.client.get("/api/roadmap/progress", headers=self.headers)
        self.assertEqual(get_resp.status_code, 200)
        items = get_resp.json()
        self.assertIsInstance(items, list)
        matching = [item for item in items if item.get("role") == "Backend Engineer"]
        self.assertTrue(len(matching) > 0)
        self.assertEqual(matching[0]["completed_steps"], [0, 1, 2])


if __name__ == "__main__":
    unittest.main()
