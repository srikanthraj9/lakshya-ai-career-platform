import os
import unittest
from unittest.mock import MagicMock, patch
from uuid import uuid4

from app.core.config import Settings, settings
from app.core.exceptions import ValidationException
from app.db import models
from app.services.resume.rewrite_engine import ResumeRewriteEngine
from app.services.resume.resume_service import ResumeService


class TestResumeOptimization(unittest.TestCase):
    def test_settings_exposes_expected_rewrite_configuration(self):
        """1. Verify Settings exposes all resume rewrite and latex attributes."""
        self.assertTrue(hasattr(settings, "resume_rewrite_chunk_chars"))
        self.assertTrue(hasattr(settings, "resume_rewrite_output_dir"))
        self.assertTrue(hasattr(settings, "latex_command"))
        self.assertTrue(hasattr(settings, "llm_aux_timeout_seconds"))
        self.assertIsInstance(settings.resume_rewrite_chunk_chars, int)
        self.assertGreater(settings.resume_rewrite_chunk_chars, 0)
        self.assertEqual(settings.latex_command, "pdflatex")

    def test_configuration_works_with_defaults_and_env_overrides(self):
        """2. Verify configuration initialization with defaults and custom environment overrides."""
        with patch.dict(
            os.environ,
            {
                "RESUME_REWRITE_CHUNK_CHARS": "16384",
                "RESUME_REWRITE_OUTPUT_DIR": "custom/storage",
                "LATEX_COMMAND": "xelatex",
                "LLM_AUX_TIMEOUT_SECONDS": "45",
            },
        ):
            custom_settings = Settings()
            self.assertEqual(custom_settings.resume_rewrite_chunk_chars, 16384)
            self.assertEqual(custom_settings.resume_rewrite_output_dir, "custom/storage")
            self.assertEqual(custom_settings.latex_command, "xelatex")
            self.assertEqual(custom_settings.llm_aux_timeout_seconds, 45)

    def test_resume_optimization_does_not_fail_with_missing_attribute(self):
        """3. Confirm _truncate_text and rewrite_resume execute without AttributeError."""
        text = "Arjun Kumar\nEntry Developer\narjun@example.com\n\nSKILLS\nPython, React"
        truncated = ResumeRewriteEngine._truncate_text(text)
        self.assertEqual(truncated, text)

        result = ResumeRewriteEngine.rewrite_resume(
            text,
            full_name="Arjun Kumar",
            contact_line="arjun@example.com | LinkedIn",
            job_description="Junior Web Developer",
        )
        self.assertIn("original", result)
        self.assertIn("structured", result)
        self.assertIn("rewritten", result)
        self.assertIn("latex", result)

    def test_valid_resume_text_and_target_role_reach_optimization_service(self):
        """4. Verify valid resume text and target role parameters reach optimization."""
        dummy_user = models.User(
            id=uuid4(),
            email="testuser@example.com",
            full_name="Arjun Kumar",
        )
        resume_text = "Arjun Kumar\nSoftware Developer\nEmail: testuser@example.com\n\nEXPERIENCE\nBuilt web applications in FastAPI and React."
        target_role = "Target Role: Senior Full Stack Engineer\nJob Description: Looking for a senior Python and React engineer"

        result = ResumeService.rewrite_resume(
            user=dummy_user,
            resume_text=resume_text,
            job_description=target_role,
        )
        self.assertEqual(result["original"], resume_text)
        self.assertEqual(result["structured"]["name"], "Arjun Kumar")
        self.assertTrue(len(result["rewritten"]) > 0)
        self.assertTrue(len(result["latex"]) > 0)

    def test_ai_provider_failure_falls_back_gracefully(self):
        """5. Confirm AI provider network/runtime failure produces clean fallback structure instead of crash."""
        with patch("app.services.resume.rewrite_engine.llm_client.chat_json", side_effect=Exception("API Provider Rate Limit / Network Down")):
            with patch.object(ResumeRewriteEngine.__module__ and __import__("app.services.resume.rewrite_engine", fromlist=["llm_client"]).llm_client, "api_key", "mock-api-key"):
                text = "Arjun Kumar\narjun@example.com\n\nSUMMARY\nExperienced full stack developer.\n\nSKILLS\nPython, React, SQL"
                result = ResumeRewriteEngine.structure_resume(
                    text,
                    fallback_name="Arjun Kumar",
                    fallback_email="arjun@example.com",
                    job_description="Full Stack Engineer",
                )
                self.assertIsInstance(result, dict)
                self.assertEqual(result["name"], "Arjun Kumar")
                self.assertIn("skills", result)
                self.assertIn("summary", result)

    def test_successful_optimization_returns_expected_structure(self):
        """6. Confirm optimization output matches frontend expectations."""
        text = "Arjun Kumar\nFull Stack Developer\narjun@example.com\n\nEDUCATION\nBS Computer Science, 2026\n\nEXPERIENCE\nDeveloper at TechCorp\n- Built REST APIs"
        result = ResumeRewriteEngine.rewrite_resume(
            text,
            full_name="Arjun Kumar",
            contact_line="arjun@example.com",
            job_description="Full Stack Developer",
        )

        # Frontend expects these keys in result:
        self.assertIn("original", result)
        self.assertIn("structured", result)
        self.assertIn("rewritten", result)
        self.assertIn("latex", result)

        structured = result["structured"]
        self.assertIn("name", structured)
        self.assertIn("education", structured)
        self.assertIn("experience", structured)
        self.assertIn("skills", structured)

    def test_large_resume_text_handled_by_configured_chunking(self):
        """7. Verify large resume text is chunked according to resume_rewrite_chunk_chars."""
        large_text = "A" * 15000
        truncated = ResumeRewriteEngine._truncate_text(large_text)
        self.assertEqual(len(truncated), settings.resume_rewrite_chunk_chars)
        self.assertEqual(len(truncated), 8192)

    def test_missing_resume_text_raises_validation_exception(self):
        dummy_user = models.User(id=uuid4(), email="test@example.com")
        with self.assertRaises(ValidationException):
            ResumeService.rewrite_resume(
                user=dummy_user,
                resume_text="   ",
                job_description="Developer",
            )


if __name__ == "__main__":
    unittest.main()
