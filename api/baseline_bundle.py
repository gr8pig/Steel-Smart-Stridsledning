"""Helpers for generating bundled baseline inference artifacts."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable

from api.ml.inference import EnsembleInference
from api.ml.models import SimulationAsset, SimulationContext
from api.ml.types import PolicyDeltas
from api.scenario_seed import seed, seed_scenario_a, seed_scenario_b
from api.scenario_sim import _base_to_asset, _build_theater_vector, _threat_to_asset
from api.twin_engine import campaign_twin


DEFAULT_HORIZON_MINUTES = [0, 5, 10, 15, 20, 25, 30]

SCENARIOS: dict[str, dict[str, Callable[[], None] | str]] = {
    "seed": {"name": "Boreal Sentinel I", "seeder": seed},
    "a": {"name": "Boreal Strike", "seeder": seed_scenario_a},
    "b": {"name": "Ghost Feint", "seeder": seed_scenario_b},
}


def resolve_scenario_keys(raw_keys: list[str] | None) -> list[str]:
    scenario_keys = raw_keys or list(SCENARIOS.keys())
    invalid = [key for key in scenario_keys if key not in SCENARIOS]
    if invalid:
        raise ValueError(f"Unknown scenarios: {', '.join(invalid)}")
    return scenario_keys


def _policy_deltas() -> PolicyDeltas:
    return PolicyDeltas(
        safety=campaign_twin.policy.safety_weight,
        sustainability=campaign_twin.policy.sustainability_weight,
        resilience=campaign_twin.policy.resilience_weight,
    )


def seed_scenario(scenario_key: str) -> str:
    scenario = SCENARIOS[scenario_key]
    seeder = scenario["seeder"]
    if not callable(seeder):
        raise TypeError(f"Scenario seeder for {scenario_key} is not callable")

    seeder()
    scenario_name = str(scenario["name"])
    campaign_twin.scenario_name = scenario_name
    return scenario_name


def _build_assets() -> list[SimulationAsset]:
    base_assets = [_base_to_asset(base) for base in campaign_twin.bases]
    threat_assets = [_threat_to_asset(threat) for threat in campaign_twin.get_active_threats()]
    return base_assets + threat_assets


def build_simulation_context() -> SimulationContext:
    assets = _build_assets()
    theater = _build_theater_vector(
        campaign_twin,
        _policy_deltas(),
        campaign_twin.jammer_severity,
    )
    theater.timestamp = datetime.now(timezone.utc).isoformat()

    return SimulationContext(
        theater=theater,
        assets=assets,
        selected_asset_id=assets[0].id if assets else None,
        horizon_minutes=list(DEFAULT_HORIZON_MINUTES),
        n_ensemble_members=7,
        n_runs=1500,
        model_version="baseline-1.0",
    )


def generate_scenario_baseline(
    inference: EnsembleInference,
    scenario_key: str,
    *,
    provider_label: str,
) -> dict[str, Any]:
    scenario_name = seed_scenario(scenario_key)
    context = build_simulation_context()
    predictions: dict[str, Any] = {}

    for asset in context.assets:
        context.selected_asset_id = asset.id
        prediction = inference.predict_trajectory(context)
        predictions[asset.id] = {
            "asset": asset.model_dump(by_alias=True, exclude_none=True),
            "prediction": prediction.model_dump(by_alias=True, exclude_none=True),
            "provider": provider_label,
        }

    return {
        "scenario_key": scenario_key,
        "scenario_name": scenario_name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "theater_state": {
            "scenario_name": campaign_twin.scenario_name,
            "phase": campaign_twin.phase,
            "threat_count": len(campaign_twin.threats),
            "base_count": len(campaign_twin.bases),
            "jammer_intensity": campaign_twin.jammer_severity,
        },
        "predictions": predictions,
    }


def generate_bundle(
    inference: EnsembleInference,
    scenario_keys: list[str] | None,
    *,
    provider_label: str,
) -> dict[str, Any]:
    resolved_keys = resolve_scenario_keys(scenario_keys)
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "provider": provider_label,
        "scenarios": {
            key: generate_scenario_baseline(
                inference,
                key,
                provider_label=provider_label,
            )
            for key in resolved_keys
        },
    }
