import unittest
import uuid
from app.db.database import SessionLocal, create_tables
from app.db import models


class TestATSPersistenceModels(unittest.TestCase):
    def setUp(self):
        create_tables()
        self.db = SessionLocal()
        self.test_user = models.User(
            email=f"test_ats_pers_{uuid.uuid4().hex[:8]}@example.com",
            password_hash="hashed_pw_test",
            full_name="ATS Test User",
            is_active=True,
        )
        self.db.add(self.test_user)
        self.db.commit()
        self.db.refresh(self.test_user)

    def tearDown(self):
        self.db.rollback()
        # Clean up test user and cascade
        self.db.delete(self.test_user)
        self.db.commit()
        self.db.close()

    def test_resume_version_lineage_and_persistence(self):
        resume_v1 = models.Resume(
            user_id=self.test_user.id,
            original_filename="Software_Engineer_v1.pdf",
            file_name="Software_Engineer_v1.pdf",
            parsed_text="Experienced engineer skilled in Python and AWS.",
            extracted_text="Experienced engineer skilled in Python and AWS.",
            ats_score=75.0,
            base_quality_score=75.0,
            version_number=1,
            version_label="v1.0 (Original)",
        )
        self.db.add(resume_v1)
        self.db.commit()
        self.db.refresh(resume_v1)

        self.assertEqual(resume_v1.version_number, 1)
        self.assertIsNone(resume_v1.parent_resume_id)

        # Create v2 linked to v1
        resume_v2 = models.Resume(
            user_id=self.test_user.id,
            parent_resume_id=resume_v1.id,
            original_filename="Software_Engineer_v2.pdf",
            file_name="Software_Engineer_v2.pdf",
            parsed_text="Architected distributed microservices with Python and AWS.",
            extracted_text="Architected distributed microservices with Python and AWS.",
            ats_score=85.0,
            base_quality_score=85.0,
            version_number=2,
            version_label="v1.1 (Tailored for Cloud Architect)",
        )
        self.db.add(resume_v2)
        self.db.commit()
        self.db.refresh(resume_v2)

        self.assertEqual(resume_v2.parent_resume_id, resume_v1.id)
        self.assertEqual(resume_v2.version_number, 2)

    def test_assessment_history_retention_multiple_runs(self):
        resume = models.Resume(
            user_id=self.test_user.id,
            original_filename="Multi_Assessment.pdf",
            file_name="Multi_Assessment.pdf",
            parsed_text="Python FastAPI engineer with PostgreSQL experience.",
            ats_score=80.0,
        )
        self.db.add(resume)
        self.db.commit()
        self.db.refresh(resume)

        # Run 1: Base Quality
        analysis_1 = models.ResumeAnalysis(
            resume_id=resume.id,
            user_id=self.test_user.id,
            scoring_mode="base_quality",
            overall_score=78.0,
            match_verdict="Good Quality",
            algorithm_version="v2.0-ats-intelligence",
        )
        self.db.add(analysis_1)
        self.db.flush()

        dim_1 = models.ResumeAnalysisDimension(
            analysis_id=analysis_1.id,
            dimension_key="section_coverage",
            raw_score=85.0,
            weighted_score=29.75,
            weight_factor=0.35,
            evaluation_status="evaluated",
        )
        self.db.add(dim_1)

        # Run 2: Backend Role Match
        analysis_2 = models.ResumeAnalysis(
            resume_id=resume.id,
            user_id=self.test_user.id,
            scoring_mode="job_match",
            target_role_id="role-backend-eng",
            target_role_title="Senior Backend Engineer",
            target_job_description="Seeking Senior Backend Engineer proficient in Python and PostgreSQL.",
            overall_score=86.0,
            match_verdict="Strong Match",
            algorithm_version="v2.0-ats-intelligence",
        )
        self.db.add(analysis_2)
        self.db.commit()

        # Verify that both analyses are retained (no silent overwrite!)
        saved_analyses = (
            self.db.query(models.ResumeAnalysis)
            .filter(models.ResumeAnalysis.resume_id == resume.id)
            .order_by(models.ResumeAnalysis.created_at.desc())
            .all()
        )
        self.assertEqual(len(saved_analyses), 2)
        modes = {a.scoring_mode for a in saved_analyses}
        self.assertIn("base_quality", modes)
        self.assertIn("job_match", modes)

    def test_skill_evidence_excerpt_persistence(self):
        resume_text = "Spearheaded PostgreSQL query tuning reducing response latency by 40%."
        resume = models.Resume(
            user_id=self.test_user.id,
            original_filename="Evidence_Test.pdf",
            file_name="Evidence_Test.pdf",
            parsed_text=resume_text,
            ats_score=80.0,
        )
        self.db.add(resume)
        self.db.commit()
        self.db.refresh(resume)

        evidence = models.ResumeSkillEvidence(
            resume_id=resume.id,
            skill_name="postgresql",
            excerpt_text=resume_text,
            section_name="experience",
            start_char_offset=12,
            end_char_offset=22,
            extraction_source="direct",
            confidence=0.95,
            is_inferred=False,
        )
        self.db.add(evidence)
        self.db.commit()
        self.db.refresh(evidence)

        # Excerpt text must originate from extracted resume text
        self.assertIn(evidence.skill_name, evidence.excerpt_text.lower())
        self.assertEqual(evidence.is_inferred, False)
        self.assertEqual(evidence.section_name, "experience")


if __name__ == "__main__":
    unittest.main()
