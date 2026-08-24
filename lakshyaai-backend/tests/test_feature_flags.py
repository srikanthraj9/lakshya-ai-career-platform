import unittest
import uuid
from app.db import models


class TestFeatureFlagsModel(unittest.TestCase):
    def test_feature_flag_instantiation_and_role_matching(self):
        flag = models.FeatureFlag(
            id=uuid.uuid4(),
            key="voice_interview",
            name="Voice Mock Interview Studio",
            description="Real-time voice interview",
            is_enabled=True,
            target_roles=["user", "admin", "super_admin"],
        )

        self.assertEqual(flag.key, "voice_interview")
        self.assertTrue(flag.is_enabled)
        self.assertIn("user", flag.target_roles)
        self.assertIn("super_admin", flag.target_roles)


if __name__ == "__main__":
    unittest.main()
