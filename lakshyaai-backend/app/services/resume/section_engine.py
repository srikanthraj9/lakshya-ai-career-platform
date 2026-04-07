from __future__ import annotations

from app.services.resume.parser import ResumeParser


class SectionEngine:
    REQUIRED_SECTIONS = {"summary", "experience", "education", "skills"}
    OPTIONAL_SECTIONS = {"projects", "certifications", "objective"}

    @classmethod
    def score(cls, text: str) -> float:
        if not text.strip():
            return 0.0

        parsed_sections = ResumeParser.parse(text)["sections"]
        normalized_found = {section.lower() for section in parsed_sections}

        required_hits = len(cls.REQUIRED_SECTIONS.intersection(normalized_found))
        optional_hits = len(cls.OPTIONAL_SECTIONS.intersection(normalized_found))

        required_score = (required_hits / len(cls.REQUIRED_SECTIONS)) * 80
        optional_score = (optional_hits / max(len(cls.OPTIONAL_SECTIONS), 1)) * 20

        return round(required_score + optional_score, 2)
