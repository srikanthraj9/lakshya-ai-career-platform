import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import verify_password, hash_password, create_access_token


class TestAuthAndTokenSecurity(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_password_hashing_and_verification(self):
        pwd = "SecurePassword@2026!"
        hashed = hash_password(pwd)
        self.assertNotEqual(pwd, hashed)
        self.assertTrue(verify_password(pwd, hashed))
        self.assertFalse(verify_password("WrongPassword!", hashed))

    def test_access_token_generation(self):
        token = create_access_token({"sub": "user-uuid-12345"})
        self.assertIsInstance(token, str)
        self.assertGreater(len(token), 20)

    def test_tampered_token_rejection(self):
        tampered = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature"
        response = self.client.get("/api/users/me", headers={"Authorization": f"Bearer {tampered}"})
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
