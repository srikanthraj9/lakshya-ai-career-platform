import unittest
from app.services.resume.action_verb_engine import ActionVerbEngine
from app.services.resume.ats_engine import ATSEngine
from app.services.resume.contracts import ExtractedSkill
from app.services.resume.format_engine import FormatEngine
from app.services.resume.keyword_engine import KeywordEngine


class TestATSScoringCorrectness(unittest.TestCase):
    def test_empty_job_description_keyword_score_is_zero(self):
        resume_text = "Experienced Python developer building cloud applications with FastAPI."
        # Absence of JD should yield 0.0 keyword score, NOT a 100% free match
        score = KeywordEngine.score(resume_text, "")
        self.assertEqual(score, 0.0)

        analysis = KeywordEngine.analyze(resume_text, "")
        self.assertFalse(analysis["has_target_job"])
        self.assertEqual(analysis["match_ratio"], 0.0)

    def test_base_quality_mode_labeling_and_breakdown(self):
        resume_text = """
JOHN DOE
Email: john@example.com | Phone: +1 555-0100

SUMMARY
Senior Software Engineer with 8 years of experience building distributed systems.

TECHNICAL SKILLS
Python, Go, PostgreSQL, Redis, Docker, Kubernetes

EXPERIENCE
- Architected and deployed microservices handling 20M daily events with 99.99% uptime
- Spearheaded database migration reducing latency by 35% and saving $50k monthly
- Mentored junior engineers and led sprint planning

EDUCATION
BS in Computer Science
"""
        skills = [
            ExtractedSkill("python", "backend", 0.9),
            ExtractedSkill("go", "backend", 0.85),
            ExtractedSkill("postgresql", "database", 0.88),
            ExtractedSkill("docker", "devops", 0.82),
        ]
        result = ATSEngine.calculate_base_quality(resume_text, skills)
        self.assertEqual(result["scoring_mode"], "base_quality")
        self.assertIn("dimensions", result)
        self.assertEqual(result["dimensions"]["keyword_match"]["status"], "not_applicable")
        self.assertEqual(result["dimensions"]["keyword_match"]["weighted_score"], 0.0)
        self.assertGreater(result["score"], 0)
        self.assertLessEqual(result["score"], 100)

    def test_weights_sum_to_100_percent(self):
        # Mode A weights sum
        base_weights = ATSEngine.BASE_QUALITY_WEIGHTS
        self.assertAlmostEqual(sum(base_weights.values()), 1.0, places=4)

        # Mode B weights sum
        job_weights = ATSEngine.JOB_MATCH_WEIGHTS
        self.assertAlmostEqual(sum(job_weights.values()), 1.0, places=4)

    def test_graph_expanded_skills_do_not_inflate_proven_skill_counts(self):
        # A single proven skill
        proven_skills = [
            ExtractedSkill("python", "backend", 0.95, is_inferred=False),
        ]
        # Inferred skills added by graph
        expanded_skills = [
            ExtractedSkill("python", "backend", 0.95, is_inferred=False),
            ExtractedSkill("django", "related_skill", 0.70, is_inferred=True),
            ExtractedSkill("flask", "related_skill", 0.70, is_inferred=True),
            ExtractedSkill("fastapi", "related_skill", 0.70, is_inferred=True),
            ExtractedSkill("pandas", "related_skill", 0.70, is_inferred=True),
            ExtractedSkill("numpy", "related_skill", 0.70, is_inferred=True),
        ]
        score_proven = ATSEngine.calculate(proven_skills)
        score_expanded = ATSEngine.calculate(expanded_skills)

        # The presence of inferred skills MUST NOT inflate proven skill score
        self.assertEqual(score_proven, score_expanded)

    def test_action_verb_engine_no_artificial_floor_on_empty(self):
        # Empty text must receive 0.0
        self.assertEqual(ActionVerbEngine.score(""), 0.0)
        self.assertEqual(ActionVerbEngine.score("   \n\n  "), 0.0)

        # Text with no action verbs should not get 25.0 or 30.0
        passive_text = """
- Responsible for duties as assigned
- Doing tasks every day
- Meeting attendance
"""
        score = ActionVerbEngine.score(passive_text)
        self.assertLess(score, 15.0)

        # Strong action verbs with measurable metrics should score high
        strong_text = """
- Architected cloud data pipeline accelerating throughput by 80%
- Automated testing workflows reducing release defects by 45%
- Led cross-functional team of 12 engineers delivering $2M project on schedule
"""
        strong_score = ActionVerbEngine.score(strong_text)
        self.assertGreaterEqual(strong_score, 75.0)

    def test_format_engine_does_not_penalize_rich_senior_bullets(self):
        # Bullet length of 170 chars should NOT be penalized as a long line issue
        senior_bullet_text = """
JOHN DOE
Email: john@example.com
Phone: +1 555-0100

- Architected and delivered resilient event-driven microservices architecture on AWS ECS handling over 50M requests daily, reducing p99 latency from 450ms to 65ms across 12 countries.
- Spearheaded company-wide zero-trust security initiative incorporating OAuth2 and mTLS across 40 internal services without interrupting 24/7 financial transaction processing.
- Mentored 15 junior and mid-level software engineers through weekly code reviews and systems design workshops, improving team pull request velocity by 35%.
"""
        analysis = FormatEngine.analyze(senior_bullet_text)
        # Should have clean format and no long line penalty
        self.assertNotIn("excessively long lines", " ".join(analysis["issues"]))
        self.assertGreaterEqual(analysis["score"], 80.0)

    def test_different_resumes_receive_differentiated_scores(self):
        junior_resume = """
ALICE
Email: alice@example.com
Phone: +1 555-0100

SKILLS
HTML, CSS

EXPERIENCE
- Made website pages
"""
        senior_resume = """
BOB
Email: bob@example.com
Phone: +1 555-0200

SUMMARY
Senior Cloud Architect with 10 years experience.

SKILLS
Python, Go, AWS, Kubernetes, Terraform, PostgreSQL, Redis, Kafka, Docker

EXPERIENCE
- Architected enterprise cloud infrastructure on AWS reducing monthly spend by $120k
- Spearheaded migration to Kubernetes orchestrating 150+ microservices with 99.99% uptime
- Mentored 20+ engineers across 3 distributed engineering squads

EDUCATION
Master of Science in Computer Science

PROJECTS
- Creator of open-source cloud monitoring utility with 3,000 GitHub stars
"""
        junior_skills = [ExtractedSkill("html", "frontend", 0.7), ExtractedSkill("css", "frontend", 0.7)]
        senior_skills = [
            ExtractedSkill("python", "backend", 0.95),
            ExtractedSkill("go", "backend", 0.92),
            ExtractedSkill("aws", "cloud", 0.95),
            ExtractedSkill("kubernetes", "devops", 0.90),
            ExtractedSkill("terraform", "devops", 0.88),
            ExtractedSkill("postgresql", "database", 0.90),
        ]

        junior_result = ATSEngine.calculate_base_quality(junior_resume, junior_skills)
        senior_result = ATSEngine.calculate_base_quality(senior_resume, senior_skills)

        # Resumes must have a meaningful score differentiation, NOT clustered in 82-87%
        self.assertGreater(senior_result["score"], junior_result["score"] + 20)


if __name__ == "__main__":
    unittest.main()
