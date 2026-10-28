import unittest
import uuid
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import SessionLocal, create_tables
from app.db import models
from app.core.security import create_access_token
from app.services.resume.rewrite_storage import ResumeRewriteStorage


class TestATSAssessmentAndVersioningAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        create_tables()
        cls.client = TestClient(app)

    def setUp(self):
        self.db = SessionLocal()
        # User A
        self.user_a = models.User(
            email=f"usera_{uuid.uuid4().hex[:8]}@example.com",
            password_hash="pw_hash_test",
            full_name="User Alpha",
            is_active=True,
        )
        # User B
        self.user_b = models.User(
            email=f"userb_{uuid.uuid4().hex[:8]}@example.com",
            password_hash="pw_hash_test",
            full_name="User Beta",
            is_active=True,
        )
        self.db.add(self.user_a)
        self.db.add(self.user_b)
        self.db.commit()
        self.db.refresh(self.user_a)
        self.db.refresh(self.user_b)

        self.token_a = create_access_token({"sub": str(self.user_a.id)})
        self.headers_a = {"Authorization": f"Bearer {self.token_a}"}

        self.token_b = create_access_token({"sub": str(self.user_b.id)})
        self.headers_b = {"Authorization": f"Bearer {self.token_b}"}

        # Create resume for User A
        self.resume_text_a = """
ALICE SMITH
Email: alice@example.com | Phone: +1 555-0100

SUMMARY
Backend Software Engineer specializing in Python and distributed systems.

TECHNICAL SKILLS
Python, FastAPI, PostgreSQL, Docker, Redis

EXPERIENCE
- Architected REST APIs with FastAPI and PostgreSQL handling 5M requests daily
- Automated CI/CD pipelines with Docker reducing build times by 40%
- Optimized Redis caching layer improving query latency by 50%

EDUCATION
BS in Computer Science
"""
        self.resume_a = models.Resume(
            user_id=self.user_a.id,
            original_filename="Alice_Resume.pdf",
            file_name="Alice_Resume.pdf",
            parsed_text=self.resume_text_a,
            extracted_text=self.resume_text_a,
            ats_score=78.0,
            base_quality_score=78.0,
            version_number=1,
            version_label="v1.0 (Original)",
        )
        self.db.add(self.resume_a)
        self.db.commit()
        self.db.refresh(self.resume_a)

    def tearDown(self):
        self.db.rollback()
        self.db.close()

    def test_assess_base_quality_mode(self):
        # Assess without job description -> Mode A (base_quality)
        res = self.client.post(
            f"/api/resumes/{self.resume_a.id}/assess",
            json={},
            headers=self.headers_a,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["scoring_mode"], "base_quality")
        self.assertGreater(data["overall_score"], 0)
        self.assertLessEqual(data["overall_score"], 100)

        # Check dimensions
        dimension_keys = {dim["dimension_key"] for dim in data["dimensions"]}
        self.assertIn("section_coverage", dimension_keys)
        self.assertIn("formatting", dimension_keys)
        self.assertIn("action_verbs", dimension_keys)
        self.assertIn("skill_breadth", dimension_keys)
        self.assertIn("keyword_match", dimension_keys)

        # Check skill evidence is returned with excerpts
        self.assertTrue(len(data["skill_evidence"]) > 0)
        for ev in data["skill_evidence"]:
            self.assertIn("excerpt_text", ev)
            self.assertFalse(ev["is_inferred"])

    def test_assess_job_specific_mode(self):
        # Assess with target role and job description -> Mode B (job_match)
        res = self.client.post(
            f"/api/resumes/{self.resume_a.id}/assess",
            json={
                "target_role_title": "Senior Backend Engineer",
                "job_description": "Looking for Senior Backend Engineer with Python, PostgreSQL, and Kubernetes.",
            },
            headers=self.headers_a,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["scoring_mode"], "job_match")
        self.assertEqual(data["target_role_title"], "Senior Backend Engineer")

        dimension_keys = {dim["dimension_key"] for dim in data["dimensions"]}
        self.assertIn("required_skills", dimension_keys)
        self.assertIn("preferred_skills", dimension_keys)
        self.assertIn("keyword_relevance", dimension_keys)

        # Kubernetes should be detected as missing skill
        missing_names = {s["skill"] for s in data["missing_skills"]}
        self.assertIn("kubernetes", missing_names)

    def test_resume_ownership_enforcement_on_assess(self):
        # User B cannot assess User A's resume
        res = self.client.post(
            f"/api/resumes/{self.resume_a.id}/assess",
            json={},
            headers=self.headers_b,
        )
        self.assertIn(res.status_code, [403, 404])

    def test_assessment_history_listing_and_detail(self):
        # Run two assessments for User A
        self.client.post(f"/api/resumes/{self.resume_a.id}/assess", json={}, headers=self.headers_a)
        self.client.post(
            f"/api/resumes/{self.resume_a.id}/assess",
            json={"target_role_title": "Cloud Engineer", "job_description": "AWS Python"},
            headers=self.headers_a,
        )

        # List assessments
        list_res = self.client.get(f"/api/resumes/{self.resume_a.id}/assessments", headers=self.headers_a)
        self.assertEqual(list_res.status_code, 200)
        items = list_res.json()
        self.assertGreaterEqual(len(items), 2)

        # Get detail of latest assessment
        latest_id = items[0]["id"]
        detail_res = self.client.get(
            f"/api/resumes/{self.resume_a.id}/assessments/{latest_id}",
            headers=self.headers_a,
        )
        self.assertEqual(detail_res.status_code, 200)
        detail_data = detail_res.json()
        self.assertEqual(detail_data["id"], latest_id)
        self.assertIn("dimensions", detail_data)

        # User B cannot access User A's assessment list or detail
        b_list = self.client.get(f"/api/resumes/{self.resume_a.id}/assessments", headers=self.headers_b)
        self.assertIn(b_list.status_code, [403, 404])

    def test_save_rewrite_as_new_version_with_lineage(self):
        # Setup stored rewrite document
        rewritten_text = """
ALICE SMITH
Email: alice@example.com | Phone: +1 555-0100

PROFESSIONAL SUMMARY
Senior Backend Engineer with proven track record architecting high-scale Python cloud systems.

TECHNICAL SKILLS
Python, FastAPI, PostgreSQL, Docker, Redis, Kubernetes

EXPERIENCE
- Architected and delivered event-driven REST APIs with FastAPI and PostgreSQL handling 15M requests daily
- Spearheaded container migration with Docker and Kubernetes reducing infrastructure costs by 35%
- Optimized Redis caching layer improving p99 query latency by 50%

EDUCATION
BS in Computer Science
"""
        doc_id = ResumeRewriteStorage.store(
            user_id=self.user_a.id,
            latex="% latex source",
            pdf_bytes=b"%PDF dummy",
            structured={"experience": [{"company": "Acme Corp"}]},
            preview=rewritten_text,
        )

        rewrite_rec = models.ResumeRewrite(
            id=uuid.UUID(doc_id),
            user_id=self.user_a.id,
            title="Optimized Backend Resume",
            latex_content="% latex source",
            preview_text=rewritten_text,
            structured_data={"experience": [{"company": "Acme Corp"}]},
        )
        self.db.add(rewrite_rec)
        self.db.commit()

        # Save rewrite as version
        save_res = self.client.post(
            f"/api/resume/rewrite/{doc_id}/save-version",
            json={"version_label": "v2.0 (Targeted Backend)"},
            headers=self.headers_a,
        )
        self.assertEqual(save_res.status_code, 200)
        save_data = save_res.json()

        self.assertEqual(save_data["version_number"], 2)
        self.assertEqual(save_data["parent_resume_id"], str(self.resume_a.id))
        self.assertIn("new_resume_id", save_data)
        self.assertGreater(save_data["base_quality_score"], 0)

        # Fact checking safeguard warning for Acme Corp (not in original text)
        self.assertTrue(any("Acme Corp" in w for w in save_data["validation_warnings"]))

        # Verify new resume exists and appears in user's resume list
        resumes_res = self.client.get("/api/resumes", headers=self.headers_a)
        self.assertEqual(resumes_res.status_code, 200)
        resumes_list = resumes_res.json()
        new_ids = {r["id"] for r in resumes_list}
        self.assertIn(save_data["new_resume_id"], new_ids)

        # Verify User B cannot save User A's rewrite document
        unauth_save = self.client.post(
            f"/api/resume/rewrite/{doc_id}/save-version",
            json={"version_label": "Hacked"},
            headers=self.headers_b,
        )
        self.assertIn(unauth_save.status_code, [400, 403, 404])


if __name__ == "__main__":
    unittest.main()
