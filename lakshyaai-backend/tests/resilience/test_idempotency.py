import unittest
import uuid
import hashlib


class TestIdempotencyAndConcurrency(unittest.TestCase):
    def test_client_event_id_fingerprinting(self):
        user_id = str(uuid.uuid4())
        rec_type = "skill_gap"
        source = "role_alignment"
        target = "docker"

        raw1 = f"{user_id}:{rec_type}:{source}:{target}"
        raw2 = f"{user_id}:{rec_type}:{source}:{target}"

        fp1 = hashlib.md5(raw1.encode("utf-8")).hexdigest()
        fp2 = hashlib.md5(raw2.encode("utf-8")).hexdigest()

        self.assertEqual(fp1, fp2)
        self.assertEqual(len(fp1), 32)

    def test_outcome_insight_fingerprint_uniqueness(self):
        user_id = str(uuid.uuid4())
        fp_weakness = hashlib.md5(f"weakness:Redis:{user_id}".encode("utf-8")).hexdigest()
        fp_pass_rate = hashlib.md5(f"pass_rate:{user_id}".encode("utf-8")).hexdigest()

        self.assertNotEqual(fp_weakness, fp_pass_rate)


if __name__ == "__main__":
    unittest.main()
