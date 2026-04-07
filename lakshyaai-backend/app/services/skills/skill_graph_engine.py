from __future__ import annotations

from app.constants.skill_graph import SKILL_GRAPH
from app.constants.skills import canonicalize_skill


class SkillGraphEngine:
    @staticmethod
    def expand_skills(skills: list[str]) -> list[str]:
        expanded: set[str] = set()

        for skill in skills:
            canonical = canonicalize_skill(skill)
            expanded.add(canonical)
            expanded.update(SKILL_GRAPH.get(canonical, []))

        return sorted(expanded)
