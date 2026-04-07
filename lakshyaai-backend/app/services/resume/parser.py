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

    SECTION_HEADERS = [
        "education",
        "experience",
        "work experience",
        "projects",
        "skills",
        "certifications",
        "summary",
        "objective"
    ]

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
        Detect common resume sections.
        """

        sections = {}

        if not text:
            return sections

        text_lower = text.lower()

        for section in ResumeParser.SECTION_HEADERS:

            pattern = r"\n\s*" + re.escape(section) + r"\s*\n"

            matches = list(re.finditer(pattern, text_lower))

            if matches:
                start = matches[0].end()

                next_sections = [
                    m.start()
                    for s in ResumeParser.SECTION_HEADERS
                    for m in re.finditer(r"\n\s*" + re.escape(s) + r"\s*\n", text_lower)
                    if m.start() > start
                ]

                end = min(next_sections) if next_sections else len(text)

                sections[section] = text[start:end].strip()

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