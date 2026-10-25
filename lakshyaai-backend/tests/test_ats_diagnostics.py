import unittest
from uuid import uuid4
from unittest.mock import MagicMock
from app.core.exceptions import NotFoundException
from app.services.resume.parser import ResumeParser
from app.services.resume.section_engine import SectionEngine
from app.services.resume.format_engine import FormatEngine
from app.services.resume.action_verb_engine import ActionVerbEngine
from app.services.resume.ats_engine import ATSEngine
from app.services.resume.resume_service import ResumeService


class TestATSDiagnostics(unittest.TestCase):
    def test_resume_parser_detects_canonical_sections(self):
        resume_text = """
ARJUN KUMAR
Entry-Level Software Developer
Email: arjun@example.com | Phone: +1 555-0100 | Location: India

PROFESSIONAL SUMMARY
Motivated entry-level developer with strong foundational skills in Python and web development.

TECHNICAL SKILLS
Python, Django, FastAPI, React, SQL, HTML, CSS, Git

PROFESSIONAL EXPERIENCE
- Built full-stack web applications using FastAPI and React
- Developed automated test scripts increasing code reliability

EDUCATION
Bachelor of Technology in Computer Science, 2026

SELECTED PROJECTS
- Built an ATS Diagnostics platform with real-time scoring
"""
        parsed = ResumeParser.parse(resume_text)
        sections = parsed["sections"]

        # Verify canonical mappings
        self.assertTrue("summary" in sections or "professional summary" in sections)
        self.assertTrue("skills" in sections or "technical skills" in sections)
        self.assertTrue("experience" in sections or "professional experience" in sections)
        self.assertIn("education", sections)
        self.assertTrue("projects" in sections or "selected projects" in sections)

    def test_section_engine_scores_complete_sections(self):
        text = """
PROFESSIONAL SUMMARY
Solid software engineer.

TECHNICAL SKILLS
Python, JavaScript.

WORK EXPERIENCE
Software Developer at Acme Corp.

EDUCATION
BS in Computer Science.

PROJECTS
Open source developer.
"""
        score = SectionEngine.score(text)
        self.assertGreater(score, 0)
        self.assertGreaterEqual(score, 70)

    def test_format_engine_detects_clean_formatting(self):
        text = """
ARJUN KUMAR
Email: test@example.com
Phone: +1 555-0100

- Built a high throughput API serving 10,000 requests per minute
- Optimized database queries reducing latency by 45%
- Collaborated across engineering teams to deliver release on time
"""
        analysis = FormatEngine.analyze(text)
        self.assertGreaterEqual(analysis["score"], 70)
        self.assertIsInstance(analysis["issues"], list)

    def test_action_verb_engine(self):
        text = """
- Built and architected the backend API
- Developed responsive UI components
- Optimized database indexing
"""
        score = ActionVerbEngine.score(text)
        self.assertGreaterEqual(score, 50)

    def test_ats_engine_pro_scoring(self):
        text = """
ARJUN KUMAR
Email: arjun@example.com | Phone: +1 555-0100

SUMMARY
Developer building web applications.

SKILLS
Python, Django, FastAPI, SQL, React

EXPERIENCE
- Built REST APIs using FastAPI and PostgreSQL
- Automated deployment workflows with Docker

EDUCATION
BS in Software Engineering
"""
        skills = [
            {"skill": "python", "category": "backend", "confidence": 0.95},
            {"skill": "fastapi", "category": "backend", "confidence": 0.90},
            {"skill": "react", "category": "frontend", "confidence": 0.85},
        ]

        analysis = ATSEngine.calculate_pro_ats(
            text, skills, job_description="Looking for Python FastAPI React developer"
        )
        self.assertIn("score", analysis)
        self.assertIn("breakdown", analysis)
        self.assertGreater(analysis["score"], 0)
        breakdown = analysis["breakdown"]
        self.assertIn("keyword_match", breakdown)
        self.assertIn("skill_diversity", breakdown)
        self.assertIn("formatting", breakdown)
        self.assertIn("action_verbs", breakdown)
        self.assertIn("section_coverage", breakdown)

    def test_resume_ownership_enforcement(self):
        user_b_id = uuid4()
        fake_resume_id = uuid4()

        mock_db = MagicMock()
        mock_query = MagicMock()
        mock_db.query.return_value = mock_query
        mock_query.options.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = None

        with self.assertRaises(NotFoundException):
            ResumeService.get_resume_for_user(mock_db, fake_resume_id, user_b_id)

    def test_serialize_resume_list_item_includes_ats_score(self):
        class DummyResume:
            id = uuid4()
            file_name = "Resume_1.pdf"
            original_filename = "Resume_1.pdf"
            created_at = "2026-10-25"
            ats_score = 73.4

        serialized = ResumeService._serialize_resume_list_item(DummyResume())
        self.assertEqual(serialized["id"], DummyResume.id)
        self.assertEqual(serialized["file_name"], "Resume_1.pdf")
        self.assertEqual(serialized["ats_score"], 73)


if __name__ == "__main__":
    unittest.main()
