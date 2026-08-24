import unittest
from fastapi.testclient import TestClient
from app.main import app


class TestHealthAndReadinessProbes(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_liveness_probe(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "ok")
        self.assertEqual(data.get("service"), "lakshyaai-backend")

    def test_readiness_probe(self):
        response = self.client.get("/api/health/ready")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("components", data)
        self.assertIn("database", data["components"])


if __name__ == "__main__":
    unittest.main()
