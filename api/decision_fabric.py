from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import time
from typing import Literal

from api.twin_engine import CampaignTwin

DecisionFabricStatus = Literal["HEALTHY", "STRESSED", "DEGRADED", "COLLAPSED"]

_COLLAPSE_THRESHOLD = 0.2
_RESILIENCE_WEIGHTS = {
    "trust": 0.25,
    "tempo": 0.25,
    "cognitive": 0.30,
    "audit": 0.20,
}


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def calculate_resilience(metrics: dict[str, float]) -> float:
    weighted_inverse_sum = (
        _RESILIENCE_WEIGHTS["trust"] / max(0.01, metrics["trust"])
        + _RESILIENCE_WEIGHTS["tempo"] / max(0.01, metrics["tempo"])
        + _RESILIENCE_WEIGHTS["cognitive"] / max(0.01, metrics["cognitive"])
        + _RESILIENCE_WEIGHTS["audit"] / max(0.01, metrics["audit"])
    )
    return _clamp01(1.0 / weighted_inverse_sum)


def project_collapse(
    current_score: float,
    previous_score: float,
    dt_seconds: float,
    failure_probability: float,
) -> float | None:
    velocity = (current_score - previous_score) / (dt_seconds or 1.0)
    if velocity >= 0:
        return None

    distance_to_collapse = current_score - _COLLAPSE_THRESHOLD
    if distance_to_collapse <= 0:
        return 0.0

    projected_time = distance_to_collapse / (abs(velocity) * (1.0 + failure_probability))
    return max(0.0, projected_time)


def _compute_supply_health(campaign: CampaignTwin) -> float:
    active_bases = [base for base in campaign.bases if base.runway_status != "DISABLED"]
    if not active_bases:
        return 0.0

    sustainment_scores = [
        ((base.fuel + base.missile_depth) / 2.0) for base in active_bases
    ]
    return sum(sustainment_scores) / len(sustainment_scores)


def _status_for_score(score: float) -> DecisionFabricStatus:
    if score < 0.3:
        return "COLLAPSED"
    if score < 0.6:
        return "STRESSED"
    return "HEALTHY"


@dataclass
class DecisionFabricRuntimeState:
    previous_score: float = 1.0
    previous_timestamp: float = time.time()
    latest_failure_probability: float = 0.0

    def reset(self) -> None:
        self.previous_score = 1.0
        self.previous_timestamp = time.time()
        self.latest_failure_probability = 0.0

    def set_latest_failure_probability(self, failure_probability: float | None) -> None:
        self.latest_failure_probability = _clamp01(float(failure_probability or 0.0))

    def build_twin(self, campaign: CampaignTwin) -> dict:
        track_count = len(campaign.get_active_threats())
        authority = campaign.policy.engagement_authority
        supply_health = _compute_supply_health(campaign)
        failure_probability = self.latest_failure_probability

        cognitive = max(0.0, 1.0 - (track_count * 0.05))
        if authority == "MANUAL":
            tempo = max(0.0, 1.0 - (track_count * 0.08))
        elif authority == "SEMI":
            tempo = max(0.0, 1.0 - (track_count * 0.02))
        else:
            tempo = 1.0

        trust = max(0.1, supply_health)
        audit = _clamp01(1.0 - failure_probability)
        score = calculate_resilience(
            {
                "trust": trust,
                "tempo": tempo,
                "cognitive": cognitive,
                "audit": audit,
            }
        )

        now = time.time()
        dt_seconds = now - self.previous_timestamp
        collapse_sec = project_collapse(
            score,
            self.previous_score,
            dt_seconds,
            failure_probability,
        )

        self.previous_score = score
        self.previous_timestamp = now

        return {
            "id": "C2-TWIN-01",
            "simTime": campaign.sim_time,
            "c2ResilienceScore": round(score, 4),
            "trustEntropy": round(_clamp01(1.0 - trust), 4),
            "authorityFriction": round(_clamp01(1.0 - tempo), 4),
            "operatorLoad": round(_clamp01(1.0 - cognitive), 4),
            "auditCompleteness": round(audit, 4),
            "failureProbability": round(failure_probability, 4),
            "projectedCollapseSec": None if collapse_sec is None else round(collapse_sec, 3),
            "status": _status_for_score(score),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


decision_fabric_state = DecisionFabricRuntimeState()
