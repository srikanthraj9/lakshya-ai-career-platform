from __future__ import annotations


class ActionVerbEngine:
    ACTION_VERBS = {
        "achieved",
        "architected",
        "automated",
        "built",
        "created",
        "delivered",
        "designed",
        "developed",
        "drove",
        "enhanced",
        "executed",
        "implemented",
        "improved",
        "launched",
        "led",
        "managed",
        "optimized",
        "reduced",
        "scaled",
        "streamlined",
    }

    @classmethod
    def score(cls, text: str) -> float:
        lines = [line.strip().lower() for line in text.splitlines() if line.strip()]
        bullet_lines = [
            line.lstrip("-*• ").strip()
            for line in lines
            if line.startswith(("-", "*", "•"))
        ]

        if not bullet_lines:
            return 25.0

        verb_hits = 0
        for line in bullet_lines:
            first_word = line.split(" ", 1)[0]
            if first_word in cls.ACTION_VERBS:
                verb_hits += 1

        ratio = verb_hits / max(len(bullet_lines), 1)
        return round(min(30 + ratio * 70, 100), 2)
