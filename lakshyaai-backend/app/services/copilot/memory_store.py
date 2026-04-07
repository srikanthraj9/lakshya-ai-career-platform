from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from threading import Lock
from typing import Any


@dataclass
class CopilotConversationState:
    turns: deque[dict[str, str]] = field(default_factory=lambda: deque(maxlen=10))
    suggested_topics: deque[str] = field(default_factory=lambda: deque(maxlen=12))


class CopilotMemoryStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._conversations: dict[str, CopilotConversationState] = {}

    def _get_state(self, key: str) -> CopilotConversationState:
        state = self._conversations.get(key)
        if state is None:
            state = CopilotConversationState()
            self._conversations[key] = state
        return state

    def history(self, key: str, *, limit: int = 6) -> list[dict[str, str]]:
        with self._lock:
            state = self._get_state(key)
            return list(state.turns)[-limit:]

    def remember_turn(self, key: str, *, role: str, content: str) -> None:
        normalized = " ".join((content or "").split()).strip()
        if not normalized:
            return
        with self._lock:
            state = self._get_state(key)
            state.turns.append({"role": role, "content": normalized})

    def remember_suggestions(self, key: str, suggestions: list[str]) -> None:
        with self._lock:
            state = self._get_state(key)
            for suggestion in suggestions:
                normalized = " ".join((suggestion or "").split()).strip().lower()
                if normalized:
                    state.suggested_topics.append(normalized)

    def suggested_topics(self, key: str, *, limit: int = 8) -> list[str]:
        with self._lock:
            state = self._get_state(key)
            return list(state.suggested_topics)[-limit:]


copilot_memory = CopilotMemoryStore()
