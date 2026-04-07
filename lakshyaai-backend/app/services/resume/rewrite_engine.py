from __future__ import annotations

import re
from typing import Any

from app.core.config import settings
from app.services.llm.client import llm_client
from app.services.llm.prompts import RESUME_REWRITE_PROMPT
from app.services.resume.parser import ResumeParser
from app.services.resume.pdf_engine import render_resume_latex
from app.services.resume.skill_extractor import SkillExtractor


class ResumeRewriteEngine:
    CONTACT_PATTERNS = {
        "email": re.compile(r"([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})", re.IGNORECASE),
        "phone": re.compile(r"(\+?\d[\d\s().-]{8,}\d)"),
        "linkedin": re.compile(r"(https?://(?:www\.)?linkedin\.com/[^\s]+|linkedin\.com/[^\s]+)", re.IGNORECASE),
        "github": re.compile(r"(https?://(?:www\.)?github\.com/[^\s]+|github\.com/[^\s]+)", re.IGNORECASE),
        "portfolio": re.compile(r"(https?://[^\s]+)", re.IGNORECASE),
    }

    @staticmethod
    def _truncate_text(text: str) -> str:
        return text[: settings.resume_rewrite_chunk_chars]

    @staticmethod
    def _extract_contact(text: str, *, fallback_name: str = "", fallback_email: str = "") -> dict[str, str]:
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        first_line = lines[0] if lines else ""
        name = first_line if first_line and "@" not in first_line and len(first_line.split()) <= 6 else fallback_name
        fallback_email_match = ResumeRewriteEngine.CONTACT_PATTERNS["email"].search(fallback_email)
        normalized_fallback_email = fallback_email_match.group(1).strip() if fallback_email_match else fallback_email.strip()

        extracted = {
            "name": name or fallback_name,
            "phone": "",
            "email": normalized_fallback_email,
            "linkedin": "",
            "github": "",
            "portfolio": "",
        }

        for key, pattern in ResumeRewriteEngine.CONTACT_PATTERNS.items():
            match = pattern.search(text)
            if match:
                extracted[key] = match.group(1).strip()

        if extracted["portfolio"] in {extracted["linkedin"], extracted["github"]}:
            extracted["portfolio"] = ""

        return extracted

    @staticmethod
    def _section_lines(sections: dict[str, str], *names: str) -> list[str]:
        combined: list[str] = []
        for name in names:
            content = sections.get(name, "")
            for line in content.splitlines():
                cleaned = line.strip().lstrip("-*•").strip()
                if cleaned:
                    combined.append(cleaned)
        return combined

    @staticmethod
    def _parse_education(lines: list[str]) -> list[dict[str, str]]:
        entries: list[dict[str, str]] = []
        for line in lines[:4]:
            year_match = re.search(r"(20\d{2}|19\d{2}(?:\s*[-–]\s*(?:20\d{2}|Present))?)", line)
            cgpa_match = re.search(r"(?:cgpa|gpa)[:\s-]*([0-9.]+)", line, re.IGNORECASE)
            parts = [part.strip() for part in re.split(r"[|,]", line) if part.strip()]
            entries.append(
                {
                    "college": parts[0] if parts else line,
                    "degree": parts[1] if len(parts) > 1 else "",
                    "year": year_match.group(1) if year_match else "",
                    "cgpa": cgpa_match.group(1) if cgpa_match else "",
                }
            )
        return entries

    @staticmethod
    def _parse_experience(lines: list[str]) -> list[dict[str, Any]]:
        if not lines:
            return []

        entries: list[dict[str, Any]] = []
        current: dict[str, Any] | None = None

        for line in lines:
            if any(token in line.lower() for token in ["intern", "engineer", "developer", "analyst", "consultant", "lead"]):
                if current:
                    entries.append(current)
                parts = [part.strip() for part in re.split(r"[|@,]", line) if part.strip()]
                current = {
                    "role": parts[0] if parts else line,
                    "company": parts[1] if len(parts) > 1 else "",
                    "duration": parts[2] if len(parts) > 2 else "",
                    "points": [],
                }
            elif current:
                current["points"].append(line)

        if current:
            entries.append(current)

        if entries:
            return entries[:4]

        return [{"role": lines[0], "company": "", "duration": "", "points": lines[1:5]}]

    @staticmethod
    def _parse_projects(lines: list[str]) -> list[dict[str, Any]]:
        projects: list[dict[str, Any]] = []
        for line in lines[:6]:
            parts = [part.strip() for part in re.split(r"[|:-]", line) if part.strip()]
            title = parts[0] if parts else line
            duration_match = re.search(r"(?:20\d{2}|19\d{2}).{0,20}(?:20\d{2}|Present|Current)", line, re.IGNORECASE)
            projects.append(
                {
                    "title": title,
                    "duration": duration_match.group(0) if duration_match else "",
                    "points": [line],
                }
            )
        return projects

    @staticmethod
    def _categorize_skills(skills: list[str]) -> dict[str, list[str]]:
        grouped = {
            "programming": [],
            "web": [],
            "cs": [],
            "databases": [],
            "tools": [],
            "professional": [],
        }
        cs_keywords = {"data structures", "algorithms", "oop", "operating systems", "computer networks", "dbms", "system design"}
        professional_keywords = {"communication", "leadership", "teamwork", "problem solving", "stakeholder management"}

        for skill in skills:
            normalized = skill.lower().strip()
            target = "tools"
            if normalized in {"python", "java", "javascript", "typescript", "c++", "c#", "go", "rust"}:
                target = "programming"
            elif normalized in {"react", "next.js", "html", "css", "tailwind css", "fastapi", "django", "flask", "node.js", "express", "graphql", "rest api", "microservices"}:
                target = "web"
            elif normalized in {"sql", "postgresql", "mysql", "mongodb", "redis", "sqlite", "elasticsearch"}:
                target = "databases"
            elif normalized in cs_keywords:
                target = "cs"
            elif normalized in professional_keywords:
                target = "professional"
            grouped[target].append(skill)

        for key in grouped:
            seen: set[str] = set()
            deduped: list[str] = []
            for skill in grouped[key]:
                lowered = skill.lower()
                if lowered not in seen:
                    seen.add(lowered)
                    deduped.append(skill)
            grouped[key] = deduped

        return grouped

    @staticmethod
    def _fallback_structure(text: str, *, fallback_name: str = "", fallback_email: str = "") -> dict[str, Any]:
        parsed = ResumeParser.parse(text)
        sections = {key.lower(): value for key, value in parsed["sections"].items()}
        contact = ResumeRewriteEngine._extract_contact(text, fallback_name=fallback_name, fallback_email=fallback_email)
        extracted_skills = [skill.skill for skill in SkillExtractor.extract_hybrid(text)]
        summary_lines = ResumeRewriteEngine._section_lines(sections, "summary", "objective")

        return {
            **contact,
            "summary": " ".join(summary_lines[:3]).strip(),
            "education": ResumeRewriteEngine._parse_education(ResumeRewriteEngine._section_lines(sections, "education")),
            "experience": ResumeRewriteEngine._parse_experience(ResumeRewriteEngine._section_lines(sections, "experience", "work experience")),
            "projects": ResumeRewriteEngine._parse_projects(ResumeRewriteEngine._section_lines(sections, "projects")),
            "skills": ResumeRewriteEngine._categorize_skills(extracted_skills[:24]),
            "certifications": ResumeRewriteEngine._section_lines(sections, "certifications")[:6],
        }

    @staticmethod
    def _normalize_entries(entries: list[Any], keys: list[str], *, points_key: str | None = None) -> list[dict[str, Any]]:
        normalized: list[dict[str, Any]] = []
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            record = {key: str(entry.get(key, "")).strip() for key in keys}
            if points_key:
                points = entry.get(points_key, [])
                record[points_key] = [str(item).strip() for item in points if str(item).strip()] if isinstance(points, list) else []
            normalized.append(record)
        return normalized

    @staticmethod
    def _normalize_structured(payload: dict[str, Any], fallback: dict[str, Any]) -> dict[str, Any]:
        structured = {
            **fallback,
            "skills": {key: list(values) for key, values in fallback.get("skills", {}).items()},
        }

        for key in ("name", "phone", "email", "linkedin", "github", "portfolio", "summary"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                structured[key] = value.strip()

        education = payload.get("education")
        if isinstance(education, list):
            normalized = ResumeRewriteEngine._normalize_entries(education, ["college", "degree", "year", "cgpa"])
            if normalized:
                structured["education"] = normalized

        experience = payload.get("experience")
        if isinstance(experience, list):
            normalized = ResumeRewriteEngine._normalize_entries(experience, ["role", "company", "duration"], points_key="points")
            if normalized:
                structured["experience"] = normalized

        projects = payload.get("projects")
        if isinstance(projects, list):
            normalized = ResumeRewriteEngine._normalize_entries(projects, ["title", "duration"], points_key="points")
            if normalized:
                structured["projects"] = normalized

        certifications = payload.get("certifications")
        if isinstance(certifications, list):
            structured["certifications"] = [str(item).strip() for item in certifications if str(item).strip()]

        skills = payload.get("skills")
        if isinstance(skills, dict):
            for group in structured["skills"]:
                incoming = skills.get(group)
                if isinstance(incoming, list):
                    structured["skills"][group] = [str(item).strip() for item in incoming if str(item).strip()]

        return structured

    @staticmethod
    def structure_resume(text: str, *, fallback_name: str = "", fallback_email: str = "", job_description: str = "") -> dict[str, Any]:
        truncated = ResumeRewriteEngine._truncate_text(text)
        fallback = ResumeRewriteEngine._fallback_structure(truncated, fallback_name=fallback_name, fallback_email=fallback_email)
        if not llm_client.is_configured:
            return fallback

        prompt = RESUME_REWRITE_PROMPT.format(
            resume_text=truncated,
            job_description=job_description or "N/A",
        )

        try:
            payload = llm_client.chat_json(
                prompt,
                temperature=0.1,
                max_tokens=1800,
                timeout_seconds=settings.llm_aux_timeout_seconds,
            )
        except Exception:
            payload = fallback

        if not isinstance(payload, dict):
            return fallback

        return ResumeRewriteEngine._normalize_structured(payload, fallback)

    @staticmethod
    def render_plain_text(structured_resume: dict[str, Any]) -> str:
        sections: list[str] = []

        if structured_resume.get("summary"):
            sections.append(f"Summary\n{structured_resume['summary']}")

        if structured_resume.get("education"):
            lines = []
            for entry in structured_resume["education"]:
                parts = [
                    entry.get("college", ""),
                    entry.get("degree", ""),
                    entry.get("year", ""),
                    f"CGPA: {entry.get('cgpa', '')}" if entry.get("cgpa") else "",
                ]
                cleaned = [part for part in parts if part]
                if cleaned:
                    lines.append(f"- {' | '.join(cleaned)}")
            if lines:
                sections.append("Education\n" + "\n".join(lines))

        if structured_resume.get("experience"):
            lines = []
            for entry in structured_resume["experience"]:
                header = " | ".join(part for part in [entry.get("role", ""), entry.get("company", ""), entry.get("duration", "")] if part)
                if header:
                    lines.append(f"- {header}")
                for point in entry.get("points", []):
                    lines.append(f"  • {point}")
            if lines:
                sections.append("Experience\n" + "\n".join(lines))

        if structured_resume.get("projects"):
            lines = []
            for entry in structured_resume["projects"]:
                header = " | ".join(part for part in [entry.get("title", ""), entry.get("duration", "")] if part)
                if header:
                    lines.append(f"- {header}")
                for point in entry.get("points", []):
                    lines.append(f"  • {point}")
            if lines:
                sections.append("Projects\n" + "\n".join(lines))

        if structured_resume.get("skills"):
            lines = []
            for group, values in structured_resume["skills"].items():
                if values:
                    lines.append(f"- {group.title()}: {', '.join(values)}")
            if lines:
                sections.append("Skills\n" + "\n".join(lines))

        if structured_resume.get("certifications"):
            lines = [f"- {item}" for item in structured_resume["certifications"] if item]
            if lines:
                sections.append("Certifications\n" + "\n".join(lines))

        return "\n\n".join(sections).strip()

    @classmethod
    def rewrite_resume(
        cls,
        resume_text: str,
        *,
        full_name: str,
        contact_line: str,
        job_description: str = "",
    ) -> dict[str, Any]:
        structured = cls.structure_resume(
            resume_text,
            fallback_name=full_name,
            fallback_email=contact_line,
            job_description=job_description,
        )
        latex = render_resume_latex(structured, full_name=full_name, contact_line=contact_line)
        preview = cls.render_plain_text(structured)

        return {
            "original": resume_text,
            "structured": structured,
            "rewritten": preview,
            "latex": latex,
        }
