import unittest
from fastapi.testclient import TestClient
from app.main import app


class TestBackendRoutesAndHealth(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_check_endpoint(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "ok")
        self.assertEqual(data.get("service"), "lakshyaai-backend")

    def test_unauthenticated_route_protection(self):
        # Protected route must return 401 when unauthenticated
        response = self.client.get("/api/users/me")
        self.assertIn(response.status_code, [401, 403])


if __name__ == "__main__":
    unittest.main()
