# app/services/resume/parser.py

import re
from typing import Dict


class ResumeParser:
    """
    Basic resume parser used for ATS analysis.

    Extracts:
    - cleaned text
    - resume sections
    """

    CANONICAL_MAP = {
        "education": "education",
        "academic background": "education",
        "experience": "experience",
        "work experience": "experience",
        "professional experience": "experience",
        "internship / practical experience": "experience",
        "projects": "projects",
        "selected projects": "projects",
        "personal projects": "projects",
        "skills": "skills",
        "technical skills": "skills",
        "core competencies": "skills",
        "core strengths": "skills",
        "certifications": "certifications",
        "certification": "certifications",
        "certifications & learning": "certifications",
        "summary": "summary",
        "professional summary": "summary",
        "objective": "objective",
        "career objective": "objective",
    }

    SECTION_HEADERS = list(CANONICAL_MAP.keys())

    @staticmethod
    def clean_text(text: str) -> str:
        """
        Normalize resume text.
        """
        if not text:
            return ""

        text = text.replace("\r", "\n")
        text = re.sub(r"\n+", "\n", text)
        text = re.sub(r"[ \t]+", " ", text)

        return text.strip()

    @staticmethod
    def detect_sections(text: str) -> Dict[str, str]:
        """
        Detect common resume sections with canonical aliases.
        """
        sections: Dict[str, str] = {}
        if not text:
            return sections

        text_lower = text.lower()
        all_headers = ResumeParser.SECTION_HEADERS

        for header, canonical in ResumeParser.CANONICAL_MAP.items():
            pattern = r"(?:^|\n)\s*" + re.escape(header) + r"\s*(?:\n|:)"
            matches = list(re.finditer(pattern, text_lower))
            if matches:
                start = matches[0].end()
                next_sections = [
                    m.start()
                    for h in all_headers
                    for m in re.finditer(r"(?:^|\n)\s*" + re.escape(h) + r"\s*(?:\n|:)", text_lower)
                    if m.start() > start
                ]
                end = min(next_sections) if next_sections else len(text)
                content = text[start:end].strip()
                sections[header] = content
                if canonical not in sections:
                    sections[canonical] = content

        return sections


    @staticmethod
    def parse(text: str) -> Dict:
        """
        Main parser entry point.
        """

        cleaned_text = ResumeParser.clean_text(text)

        sections = ResumeParser.detect_sections(cleaned_text)

        return {
            "clean_text": cleaned_text,
            "sections": sections
        }