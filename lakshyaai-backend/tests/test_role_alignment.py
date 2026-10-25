import unittest
import uuid
from app.constants.career_maps import DEFAULT_ROLE_LIBRARY
from app.core.config import settings
from app.db import models
from app.services.resume.embedding_engine import EmbeddingEngine
from app.services.role.career_intelligence_engine import CareerIntelligenceEngine


class TestRoleAlignmentIntegration(unittest.TestCase):
    def test_embedding_dimension_matches_pgvector(self):
        """Ensure settings and safe embedding generation output 1536 dimensions matching pgvector."""
        self.assertEqual(settings.embedding_dimension, 1536)
        vec = EmbeddingEngine.generate_safe("Python, FastAPI, React, TypeScript developer with cloud experience")
        self.assertEqual(len(vec), 1536)

    def test_rank_roles_with_seeded_catalog(self):
        """Verify role ranking against candidate skills produces ranked, structured matches."""
        resume_skills = [
            models.ResumeSkill(skill_name="React", skill_category="Frontend"),
            models.ResumeSkill(skill_name="TypeScript", skill_category="Languages"),
            models.ResumeSkill(skill_name="Python", skill_category="Backend"),
            models.ResumeSkill(skill_name="FastAPI", skill_category="Backend"),
        ]
        embedding = EmbeddingEngine.generate_safe("Full Stack Software Engineer")
        matches = CareerIntelligenceEngine.rank_roles(
            roles=[],
            resume_skills=resume_skills,
            resume_embedding=embedding,
            resume_ats_score=85,
            limit=5,
        )
        self.assertGreaterEqual(len(matches), 3)
        top = matches[0]
        self.assertIn("role_name", top)
        self.assertIn("score", top)
        self.assertIn("core_skill_coverage", top)
        self.assertIn("matched_skills", top)
        self.assertIn("missing_skills", top)
        self.assertIn("next_steps", top)
        # Ensure coverage is 0..100
        self.assertGreaterEqual(top["core_skill_coverage"], 0)
        self.assertLessEqual(top["core_skill_coverage"], 100)

    def test_build_career_decision_with_target_role(self):
        """Ensure career decision tailors to target role when requested."""
        resume_skills = [
            models.ResumeSkill(skill_name="React", skill_category="Frontend"),
            models.ResumeSkill(skill_name="Node.js", skill_category="Backend"),
        ]
        embedding = EmbeddingEngine.generate_safe("Software engineer")
        matches = CareerIntelligenceEngine.rank_roles(
            roles=[],
            resume_skills=resume_skills,
            resume_embedding=embedding,
            limit=5,
        )
        decision = CareerIntelligenceEngine.build_career_decision(
            matches=matches,
            resume_skills=resume_skills,
            target_role="Frontend Engineer",
        )
        self.assertEqual(decision["target_role"], "Frontend Engineer")
        self.assertIn("career_verdict", decision)
        self.assertIn("decision_guidance", decision)
        self.assertTrue(len(decision["decision_guidance"]) > 0)


if __name__ == "__main__":
    unittest.main()
