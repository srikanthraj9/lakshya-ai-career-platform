from __future__ import annotations


class ActionVerbEngine:
    ACTION_VERBS = {
        "accelerated",
        "achieved",
        "administered",
        "advanced",
        "amplified",
        "analyzed",
        "architected",
        "automated",
        "boosted",
        "built",
        "championed",
        "consolidated",
        "constructed",
        "coordinated",
        "created",
        "delivered",
        "deployed",
        "designed",
        "developed",
        "devised",
        "directed",
        "drove",
        "engineered",
        "enhanced",
        "established",
        "executed",
        "expanded",
        "expedited",
        "formulated",
        "generated",
        "guided",
        "headed",
        "implemented",
        "improved",
        "increased",
        "initiated",
        "innovated",
        "instituted",
        "integrated",
        "introduced",
        "launched",
        "led",
        "managed",
        "maximized",
        "mentored",
        "modernized",
        "negotiated",
        "optimized",
        "orchestrated",
        "overhauled",
        "pioneered",
        "produced",
        "programmed",
        "reduced",
        "refactored",
        "resolved",
        "restructured",
        "revamped",
        "scaled",
        "spearheaded",
        "standardized",
        "streamlined",
        "strengthened",
        "surpassed",
        "transformed",
        "unified",
        "upgraded",
    }

    @classmethod
    def score(cls, text: str) -> float:
        if not text or not text.strip():
            return 0.0

        lines = [line.strip() for line in text.splitlines() if line.strip()]
        bullet_lines = [
            line.lstrip("-*•–—>0123456789.) ").strip()
            for line in lines
            if line.startswith(("-", "*", "•", "–", "—", ">"))
            or (len(line) > 2 and line[0].isdigit() and line[1] in (".", ")"))
        ]

        # If no explicit bullet characters, consider non-empty lines as potential accomplishment statements
        target_lines = bullet_lines if bullet_lines else lines

        if not target_lines:
            return 0.0

        verb_hits = 0
        metric_hits = 0

        for line in target_lines:
            words = line.split()
            if not words:
                continue
            first_word = words[0].lower().strip(".,;:()")
            if first_word in cls.ACTION_VERBS:
                verb_hits += 1
            # Check for measurable metrics (%, $, numbers representing impact)
            if any(char in line for char in ("%", "$", "+")) or any(w.replace(",", "").replace(".", "").isdigit() for w in words):
                metric_hits += 1

        total = len(target_lines)
        verb_ratio = verb_hits / total
        metric_ratio = metric_hits / total

        # 70% weight on action verbs, 30% weight on measurable metrics / impact
        raw_score = (verb_ratio * 70.0) + (metric_ratio * 30.0)
        return round(min(max(raw_score, 0.0), 100.0), 2)

