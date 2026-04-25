from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ReplayRegistry:
    _entries: dict[tuple[str, str], dict] = field(default_factory=dict)

    def reset(self) -> None:
        self._entries.clear()

    def get(self, action_kind: str, client_action_id: str | None) -> dict | None:
        if not client_action_id:
            return None
        entry = self._entries.get((action_kind, client_action_id))
        if entry is None:
            return None
        replayed = dict(entry)
        replayed["replayed"] = True
        replayed["accepted"] = True
        return replayed

    def record(self, action_kind: str, client_action_id: str | None, payload: dict) -> dict:
        if client_action_id:
            self._entries[(action_kind, client_action_id)] = dict(payload)
        return payload


replay_registry = ReplayRegistry()
