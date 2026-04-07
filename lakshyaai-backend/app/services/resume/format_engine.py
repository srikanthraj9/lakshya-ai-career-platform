from __future__ import annotations

import re


class FormatEngine:
    @staticmethod
    def analyze(text: str) -> dict[str, list[str] | float]:
        lines = [line.rstrip() for line in text.splitlines() if line.strip()]
        issues: list[str] = []

        if not lines:
            return {"score": 0.0, "issues": ["Resume text is empty."]}

        bullet_lines = [line for line in lines if line.lstrip().startswith(("-", "*", "•"))]
        long_lines = [line for line in lines if len(line) > 140]
        email_present = bool(re.search(r"[\w.\-+]+@[\w.\-]+\.\w+", text))
        phone_present = bool(re.search(r"\+?\d[\d\s().-]{7,}\d", text))

        if len(bullet_lines) < 3:
            issues.append("Add concise bullet points for experience and projects.")
        if long_lines:
            issues.append("Break long lines into shorter bullet points for ATS readability.")
        if not email_present:
            issues.append("Include a professional email address in the header.")
        if not phone_present:
            issues.append("Include a phone number in the header.")
        if any("\t" in line for line in lines):
            issues.append("Avoid tab-based alignment; use simple text layout.")
        if sum(1 for line in lines if line.isupper()) > 6:
            issues.append("Reduce excessive all-caps text.")

        score = 100.0
        score -= min(len(issues) * 12, 60)
        score += min(len(bullet_lines) * 1.5, 12)

        return {"score": round(max(min(score, 100.0), 0.0), 2), "issues": issues}

    @classmethod
    def score(cls, text: str) -> float:
        return float(cls.analyze(text)["score"])
