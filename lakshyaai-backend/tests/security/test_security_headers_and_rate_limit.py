import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security_middleware import InMemoryRateLimiter


class TestSecurityHeadersAndRateLimiting(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_security_headers_attached_to_responses(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(response.headers.get("X-Frame-Options"), "DENY")
        self.assertEqual(response.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin")
        self.assertIn("X-Request-ID", response.headers)

    def test_in_memory_rate_limiter_sliding_window(self):
        limiter = InMemoryRateLimiter()
        key = "test-user-ip-123"

        # Allowed up to 5 requests
        for _ in range(5):
            limited, _ = limiter.is_rate_limited(key, max_requests=5, window_seconds=10)
            self.assertFalse(limited)

        # 6th request is rate-limited
        limited, retry_after = limiter.is_rate_limited(key, max_requests=5, window_seconds=10)
        self.assertTrue(limited)
        self.assertGreater(retry_after, 0)


if __name__ == "__main__":
    unittest.main()
