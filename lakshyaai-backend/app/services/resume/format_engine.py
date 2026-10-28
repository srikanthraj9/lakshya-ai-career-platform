from __future__ import annotations

import re


class FormatEngine:
    @staticmethod
    def analyze(text: str) -> dict[str, list[str] | float]:
        lines = [line.rstrip() for line in text.splitlines() if line.strip()]
        issues: list[str] = []

        if not lines:
            return {"score": 0.0, "issues": ["Resume text is empty."]}

        bullet_lines = [
            line for line in lines 
            if line.lstrip().startswith(("-", "*", "•", "–", "—", ">"))
            or (len(line.lstrip()) > 2 and line.lstrip()[0].isdigit() and line.lstrip()[1] in (".", ")"))
        ]
        # Calibrated threshold: senior achievement bullets are often 150-200 chars. Only penalize lines > 220 chars.
        excessive_lines = [line for line in lines if len(line) > 220]
        email_present = bool(re.search(r"[\w.\-+]+@[\w.\-]+\.\w+", text))
        phone_present = bool(re.search(r"\+?\d[\d\s().-]{7,}\d", text))

        score = 100.0

        if len(bullet_lines) < 3:
            issues.append("Add concise bullet points for experience and projects.")
            score -= 15.0
        if len(excessive_lines) > 2:
            issues.append(f"Found {len(excessive_lines)} excessively long lines (>220 chars); consider splitting dense paragraphs into concise bullets.")
            score -= 10.0
        if not email_present:
            issues.append("Include a professional email address in the header.")
            score -= 15.0
        if not phone_present:
            issues.append("Include a phone number in the header.")
            score -= 10.0
        if any("\t" in line for line in lines):
            issues.append("Avoid tab-based alignment; use standard spaces or clean layout.")
            score -= 5.0
        if sum(1 for line in lines if line.isupper() and len(line) > 10) > 4:
            issues.append("Reduce excessive all-caps text in content bodies.")
            score -= 10.0

        # Small reward for structured bullet points
        if len(bullet_lines) >= 5:
            score += 5.0

        return {"score": round(max(min(score, 100.0), 0.0), 2), "issues": issues}

    @classmethod
    def score(cls, text: str) -> float:
        return float(cls.analyze(text)["score"])
