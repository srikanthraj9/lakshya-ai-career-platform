import unittest
import uuid
from app.db import schemas
from app.services.company_intelligence_service import KNOWN_COMPANIES


class TestApplicationsAndCompanyIntelligence(unittest.TestCase):
    def test_known_companies_directory(self):
        self.assertIn("google", KNOWN_COMPANIES)
        self.assertIn("stripe", KNOWN_COMPANIES)
        self.assertIn("amazon", KNOWN_COMPANIES)

        google = KNOWN_COMPANIES["google"]
        self.assertEqual(google["name"], "Google")
        self.assertIsInstance(google["tech_stack"], list)
        self.assertGreater(len(google["tech_stack"]), 0)
        self.assertIsInstance(google["interview_stages"], list)
        self.assertIsInstance(google["salary_benchmarks"], dict)

    def test_application_stage_schema_validation(self):
        # Validates that JobApplicationCreate parses successfully
        payload = schemas.JobApplicationCreate(
            company_name="Netflix",
            job_title="Senior UI Engineer",
            location="Remote",
            stage="applied",
            match_score_at_application=92.5,
        )
        self.assertEqual(payload.company_name, "Netflix")
        self.assertEqual(payload.stage, "applied")
        self.assertEqual(payload.match_score_at_application, 92.5)

    def test_interview_debrief_schema_scoring(self):
        debrief = schemas.InterviewDebriefCreate(
            company_name="Stripe",
            round_type="System Design",
            difficulty_rating=4,
            technical_score=8,
            communication_score=9,
            system_design_score=7,
            questions_asked=["Rate Limiter Architecture", "Idempotent Webhooks"],
            identified_weaknesses=["Distributed consensus"],
            outcome="passed",
        )
        self.assertEqual(debrief.outcome, "passed")
        self.assertEqual(debrief.technical_score, 8)
        self.assertEqual(len(debrief.questions_asked), 2)


if __name__ == "__main__":
    unittest.main()
