import unittest
import uuid
from app.db import models, schemas


class TestResumeJourneyIntegration(unittest.TestCase):
    def test_resume_model_instantiation_and_scoring(self):
        user_id = uuid.uuid4()
        resume = models.Resume(
            user_id=user_id,
            original_filename="srikanth_resume.pdf",
            file_path="uploads/srikanth_resume.pdf",
            parsed_text="Experienced Full Stack Developer with React, TypeScript, FastAPI",
            ats_score=94.0,
        )

        self.assertEqual(resume.user_id, user_id)
        self.assertEqual(resume.ats_score, 94.0)
        self.assertEqual(resume.original_filename, "srikanth_resume.pdf")

    def test_resume_rewrite_schema(self):
        payload = schemas.ResumeRewriteRequest(
            text="Senior developer with strong architecture experience.",
            job_description="Looking for an engineer proficient in Python, SQL, and microservices.",
        )
        self.assertEqual(payload.text, "Senior developer with strong architecture experience.")
        self.assertIn("microservices", payload.job_description)


if __name__ == "__main__":
    unittest.main()
