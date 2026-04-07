from __future__ import annotations

from app.services.resume.latex_compiler import compile_latex_to_pdf
from app.services.resume.latex_template import LATEX_TEMPLATE


def escape_latex(value: str) -> str:
    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    escaped = value
    for old, new in replacements.items():
        escaped = escaped.replace(old, new)
    return escaped


def _render_list(items: list[str]) -> str:
    cleaned = [escape_latex(item.strip()) for item in items if isinstance(item, str) and item.strip()]
    if not cleaned:
        return ""
    body = "\n".join(rf"\item {item}" for item in cleaned)
    return r"\begin{itemize}" "\n" f"{body}\n" r"\end{itemize}" "\n"


def _render_summary(summary: str) -> str:
    if not summary.strip():
        return ""
    return rf"\textbf{{Summary}}" "\n" f"{escape_latex(summary.strip())}\n"


def _render_education(entries: list[dict]) -> str:
    if not entries:
        return ""

    lines = [r"\textbf{Education}"]
    for entry in entries:
        header = " | ".join(
            part
            for part in [
                escape_latex(entry.get("college", "")),
                escape_latex(entry.get("year", "")),
            ]
            if part
        )
        detail = " | ".join(
            part
            for part in [
                escape_latex(entry.get("degree", "")),
                escape_latex(f"CGPA: {entry.get('cgpa', '')}") if entry.get("cgpa") else "",
            ]
            if part
        )
        if header:
            lines.append(rf"\textbf{{{header}}}\\")
        if detail:
            lines.append(detail + r"\\")
        lines.append("")
    return "\n".join(lines).strip() + "\n"


def _render_experience(entries: list[dict]) -> str:
    if not entries:
        return ""

    lines = [r"\textbf{Experience}"]
    for entry in entries:
        header = " | ".join(
            part
            for part in [
                escape_latex(entry.get("role", "")),
                escape_latex(entry.get("company", "")),
                escape_latex(entry.get("duration", "")),
            ]
            if part
        )
        if header:
            lines.append(rf"\textbf{{{header}}}")
        highlights = _render_list(entry.get("points", []))
        if highlights:
            lines.append(highlights)
    return "\n".join(lines).strip() + "\n"


def _render_projects(entries: list[dict]) -> str:
    if not entries:
        return ""

    lines = [r"\textbf{Projects}"]
    for entry in entries:
        header = " | ".join(
            part
            for part in [
                escape_latex(entry.get("title", "")),
                escape_latex(entry.get("duration", "")),
            ]
            if part
        )
        if header:
            lines.append(rf"\textbf{{{header}}}")
        highlights = _render_list(entry.get("points", []))
        if highlights:
            lines.append(highlights)
    return "\n".join(lines).strip() + "\n"


def _render_skills(skill_groups: dict) -> str:
    if not skill_groups:
        return ""

    label_map = {
        "programming": "Programming",
        "web": "Web",
        "cs": "CS Fundamentals",
        "databases": "Databases",
        "tools": "Tools",
        "professional": "Professional",
    }

    lines = [r"\textbf{Skills}"]
    for key, label in label_map.items():
        values = skill_groups.get(key, [])
        cleaned = [escape_latex(value.strip()) for value in values if isinstance(value, str) and value.strip()]
        if cleaned:
            lines.append(rf"\textbf{{{escape_latex(label)}:}} {', '.join(cleaned)}\\")

    return "\n".join(lines).strip() + "\n" if len(lines) > 1 else ""


def _render_certifications(certifications: list[str]) -> str:
    section = _render_list(certifications)
    if not section:
        return ""
    return r"\textbf{Certifications}" "\n" + section


def _render_contact_line(structured_resume: dict, fallback_contact_line: str) -> str:
    parts = [
        structured_resume.get("phone", ""),
        structured_resume.get("email", ""),
        structured_resume.get("linkedin", ""),
        structured_resume.get("github", ""),
        structured_resume.get("portfolio", ""),
    ]
    cleaned = [escape_latex(part.strip()) for part in parts if isinstance(part, str) and part.strip()]
    if cleaned:
        return r" \textbar{} ".join(cleaned)
    return escape_latex(fallback_contact_line)


def render_resume_latex(structured_resume: dict, *, full_name: str, contact_line: str) -> str:
    sections = [
        _render_summary(structured_resume.get("summary", "")),
        _render_education(structured_resume.get("education", [])),
        _render_experience(structured_resume.get("experience", [])),
        _render_projects(structured_resume.get("projects", [])),
        _render_skills(structured_resume.get("skills", {})),
        _render_certifications(structured_resume.get("certifications", [])),
    ]

    return LATEX_TEMPLATE.format(
        name=escape_latex(structured_resume.get("name") or full_name or "Candidate"),
        contact=_render_contact_line(structured_resume, contact_line),
        content="\n".join(section for section in sections if section),
    )


def generate_pdf(structured_resume: dict, *, full_name: str, contact_line: str) -> bytes:
    latex_source = render_resume_latex(
        structured_resume,
        full_name=full_name,
        contact_line=contact_line,
    )
    return compile_latex_to_pdf(latex_source)
