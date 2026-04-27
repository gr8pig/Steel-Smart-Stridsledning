"""
Scenario Simulation Engine — runs EnsembleInference across all assets in a
scenario with parameter sweeps and produces aggregate metrics.

Three modes:
  1. Single-scenario sweep — vary policy weights / jammer and collect per-asset
     robustness across the parameter grid.
  2. Multi-scenario comparison — run two scenarios with the same parameters
     and compute delta metrics.
  3. Deep-sim mode — submit a scenario sweep to RunPod for GPU-accelerated
     inference (falls back to local when RunPod is unavailable).
"""
from __future__ import annotations

import time
from itertools import product
from typing import Any, Optional

import numpy as np
from scipy.spatial import ConvexHull, QhullError

from api.ml.inference import EnsembleInference
from api.ml.models import SimulationAsset, SimulationContext, TheaterStateVector
from api.ml.types import PolicyDeltas
from api.force_catalog import get_platform
from api.twin_engine import CampaignTwin


POLICY_SWEEP_DEFAULTS: dict[str, list[float]] = {
    "safety": [0.3, 0.5, 0.7],
    "sustainability": [0.3, 0.5, 0.7],
}

JAMMER_SWEEP_DEFAULTS: list[float] = [0.0, 0.5, 0.9]


def _calculate_spatial_density(threats: list) -> float:
    if len(threats) < 3:
        return float(len(threats)) / 10.0
    points = np.array([[t.x, t.y] for t in threats])
    try:
        hull = ConvexHull(points)
        area = hull.volume if hull.volume > 0 else 1.0
        return len(threats) / area
    except QhullError:
        return float(len(threats)) / 10.0


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def _build_theater_vector(
    twin: CampaignTwin,
    policy_deltas: PolicyDeltas,
    jammer_intensity: float | None = None,
) -> TheaterStateVector:
    active_threats = twin.get_active_threats()
    avg_velocity = (
        sum(t.velocity for t in active_threats) / max(1, len(active_threats))
    )
    avg_readiness = sum(b.readiness_score for b in twin.bases) / max(1, len(twin.bases))

    if jammer_intensity is not None:
        ji = jammer_intensity
    elif hasattr(twin, "jammer_severity"):
        ji = twin.jammer_severity
    else:
        ji = 0.0

    density = _calculate_spatial_density(active_threats)

    return TheaterStateVector(
        timestamp="",
        track_count=len(active_threats),
        avg_velocity=avg_velocity,
        cluster_density=density,
        base_readiness_mean=avg_readiness,
        jammer_intensity=ji,
        policy_deltas=policy_deltas,
        scenario_name=getattr(twin, "scenario_name", "") or "Boreal Sentinel I",
        phase=getattr(twin, "phase", ""),
    )


def _base_to_asset(b: Any) -> SimulationAsset:
    return SimulationAsset(
        id=b.id,
        label=b.name,
        unit_type="BASE",
        side="BLUE",
        armaments=["SAM_SHORT_RANGE", "SAM_LONG_RANGE"],
        armament="AIR_SUPERIORITY",
        origin_country="SWEDEN",
        readiness=b.readiness_score,
        speed=0.3,
        waypoint_complexity=0.15,
        inventory_depth=_clamp(
            (b.interceptor_short + b.interceptor_mid + b.interceptor_long)
            / max(1, b.max_interceptor_short + b.max_interceptor_mid + b.max_interceptor_long)
        ),
        sensor_quality=_clamp(1.0 - (b.threat_exposure * 0.4)),
        exposed_risk=b.threat_exposure,
        mobility=0.25,
        endurance=_clamp(b.fuel * 0.6 + (1.0 - b.fatigue) * 0.4),
        source="campaign",
        metadata={"role": getattr(b, "role", "BASE")},
    )


def _threat_to_asset(t: Any) -> SimulationAsset:
    strike_prior = 0.3
    if hasattr(t, "intent_distribution") and t.intent_distribution:
        strike_prior = t.intent_distribution.get("strike", 0.3)

    platform_id = getattr(t, "platform", None)
    profile = get_platform(platform_id)
    armaments = list(
        getattr(t, "armaments", None)
        or (profile.get("armaments") if profile else [])
        or []
    )
    profile_speed = float(profile.get("max_speed_kmh") if profile else t.velocity)
    profile_radar = float(profile.get("radar_range_km") if profile else 0.0)
    profile_radius = float(profile.get("combat_radius_km") if profile else max(250.0, t.velocity))
    speed_norm = _clamp(t.velocity / max(profile_speed, 1.0))
    sensor_quality = _clamp(max(getattr(t, "sensor_quality", 0.0), profile_radar / 250.0, 0.15))
    inventory_depth = _clamp(0.22 + len(armaments) * 0.14 + (0.08 if strike_prior >= 0.5 else 0.0))
    readiness = _clamp(0.42 + speed_norm * 0.20 + inventory_depth * 0.14)
    exposed_risk = _clamp(
        0.26
        + strike_prior * 0.42
        + (0.08 if getattr(t, "threat_class", "UNKNOWN") == "MISSILE" else 0.0)
        + getattr(t, "jamming_probability", 0.0) * 0.10
    )

    return SimulationAsset(
        id=t.id,
        label=str((profile or {}).get("display_name") or getattr(t, "id", t.id)),
        unit_type=str((profile or {}).get("type") or t.threat_class),
        side="RED",
        platform=platform_id,
        armaments=armaments,
        armament=getattr(t, "armament", None) or (profile.get("armament") if profile else None),
        heading=getattr(t, "heading", None),
        origin_country=getattr(t, "origin_country", None) or (profile.get("origin_country") if profile else None),
        readiness=readiness,
        speed=speed_norm,
        waypoint_complexity=0.5,
        inventory_depth=inventory_depth,
        sensor_quality=sensor_quality,
        exposed_risk=exposed_risk,
        mobility=_clamp(profile_speed / 3000.0),
        endurance=_clamp(profile_radius / 2500.0),
        source="campaign",
        metadata={
            "strike_prior": strike_prior,
            "catalogPlatformId": platform_id,
            "catalogPlatformLabel": (profile or {}).get("display_name"),
            "velocityKmh": t.velocity,
        },
    )


def _compute_sweep_grid(
    policy_sweep: dict[str, list[float]] | None,
    jammer_sweep: list[float] | None,
) -> list[dict[str, Any]]:
    safety_vals = (policy_sweep or {}).get("safety", [0.5])
    sustain_vals = (policy_sweep or {}).get("sustainability", [0.5])
    resilience_vals = (policy_sweep or {}).get("resilience", [0.5])
    jammer_vals = jammer_sweep or [0.0]

    grid = []
    for s, su, r, j in product(safety_vals, sustain_vals, resilience_vals, jammer_vals):
        grid.append({
            "safety": s,
            "sustainability": su,
            "resilience": r,
            "jammer_intensity": j,
        })
    return grid


def run_scenario_sweep(
    twin: CampaignTwin,
    inference: EnsembleInference,
    policy_sweep: dict[str, list[float]] | None = None,
    jammer_sweep: list[float] | None = None,
    n_runs: int = 1000,
) -> dict[str, Any]:
    """Run inference across all assets for every point in the parameter grid.

    Returns a dict with:
      - scenario_name: str
      - sweep_points: list of per-point results
      - aggregate: overall aggregate metrics
    """
    t0 = time.perf_counter()
    grid = _compute_sweep_grid(policy_sweep, jammer_sweep)
    bases = twin.bases
    threats = twin.get_active_threats()
    all_assets = [_base_to_asset(b) for b in bases] + [_threat_to_asset(t) for t in threats]

    sweep_points: list[dict[str, Any]] = []

    for point in grid:
        policy_deltas = PolicyDeltas(
            safety=point["safety"],
            sustainability=point["sustainability"],
            resilience=point.get("resilience", 0.5),
        )
        theater = _build_theater_vector(twin, policy_deltas, point["jammer_intensity"])

        context = SimulationContext(
            theater=theater,
            assets=all_assets,
            selected_asset_id=all_assets[0].id if all_assets else None,
            horizon_minutes=[0, 5, 10, 15, 20, 25, 30],
            n_ensemble_members=7,
            n_runs=n_runs,
        )

        prediction = inference.predict_trajectory(context)

        asset_results = []
        for impact in prediction.asset_impacts:
            asset_results.append({
                "asset_id": impact.asset_id,
                "label": impact.label,
                "unit_type": impact.unit_type,
                "side": impact.side,
                "robustness_score": impact.robustness_score,
                "readiness_floor": impact.readiness_floor,
                "failure_probability": impact.failure_probability,
                "asymmetry_ratio": impact.asymmetry_ratio,
                "delta_robustness": impact.delta_robustness,
            })

        blue_assets = [a for a in prediction.asset_impacts if a.side == "BLUE"]
        red_assets = [a for a in prediction.asset_impacts if a.side == "RED"]

        avg_blue_robustness = (
            np.mean([a.robustness_score for a in blue_assets]) if blue_assets else 0.0
        )
        avg_red_risk = (
            np.mean([a.failure_probability for a in red_assets]) if red_assets else 0.0
        )
        avg_failure = (
            np.mean([a.failure_probability for a in blue_assets]) if blue_assets else 0.0
        )

        sweep_points.append({
            "policy": {
                "safety": point["safety"],
                "sustainability": point["sustainability"],
                "resilience": point.get("resilience", 0.5),
            },
            "jammer_intensity": point["jammer_intensity"],
            "trust_score": prediction.trust_score,
            "avg_blue_robustness": round(float(avg_blue_robustness), 4),
            "avg_failure_probability": round(float(avg_failure), 4),
            "avg_red_risk": round(float(avg_red_risk), 4),
            "asset_results": asset_results,
        })

    all_blue_rob = [sp["avg_blue_robustness"] for sp in sweep_points]
    all_fail = [sp["avg_failure_probability"] for sp in sweep_points]
    all_trust = [sp["trust_score"] for sp in sweep_points]

    best_idx = int(np.argmax(all_blue_rob))
    worst_idx = int(np.argmin(all_blue_rob))

    elapsed_ms = (time.perf_counter() - t0) * 1000

    return {
        "scenario_name": getattr(twin, "scenario_name", "") or "Boreal Sentinel I",
        "phase": getattr(twin, "phase", ""),
        "base_count": len(bases),
        "threat_count": len(threats),
        "sweep_count": len(sweep_points),
        "elapsed_ms": round(elapsed_ms, 1),
        "sweep_points": sweep_points,
        "aggregate": {
            "overall_robustness": round(float(np.mean(all_blue_rob)), 4),
            "overall_failure_probability": round(float(np.mean(all_fail)), 4),
            "overall_trust": round(float(np.mean(all_trust)), 4),
            "robustness_range": {
                "min": round(float(min(all_blue_rob)), 4),
                "max": round(float(max(all_blue_rob)), 4),
                "std": round(float(np.std(all_blue_rob)), 4),
            },
            "best_policy": sweep_points[best_idx]["policy"],
            "worst_policy": sweep_points[worst_idx]["policy"],
        },
    }


def run_scenario_comparison(
    twin_a: CampaignTwin,
    twin_b: CampaignTwin,
    inference: EnsembleInference,
    policy_sweep: dict[str, list[float]] | None = None,
    jammer_sweep: list[float] | None = None,
    n_runs: int = 1000,
) -> dict[str, Any]:
    """Run both scenarios and compute delta metrics between them."""
    result_a = run_scenario_sweep(twin_a, inference, policy_sweep, jammer_sweep, n_runs)
    result_b = run_scenario_sweep(twin_b, inference, policy_sweep, jammer_sweep, n_runs)

    agg_a = result_a["aggregate"]
    agg_b = result_b["aggregate"]

    delta_robustness = round(agg_b["overall_robustness"] - agg_a["overall_robustness"], 4)
    delta_failure = round(agg_b["overall_failure_probability"] - agg_a["overall_failure_probability"], 4)
    delta_trust = round(agg_b["overall_trust"] - agg_a["overall_trust"], 4)

    paired_deltas: list[dict[str, Any]] = []
    for sp_a, sp_b in zip(result_a["sweep_points"], result_b["sweep_points"]):
        blue_a = [a for a in sp_a["asset_results"] if a["side"] == "BLUE"]
        blue_b = [a for a in sp_b["asset_results"] if a["side"] == "BLUE"]
        avg_rob_a = np.mean([a["robustness_score"] for a in blue_a]) if blue_a else 0.0
        avg_rob_b = np.mean([a["robustness_score"] for a in blue_b]) if blue_b else 0.0
        paired_deltas.append({
            "policy": sp_a["policy"],
            "jammer_intensity": sp_a["jammer_intensity"],
            "robustness_a": round(float(avg_rob_a), 4),
            "robustness_b": round(float(avg_rob_b), 4),
            "delta_robustness": round(float(avg_rob_b - avg_rob_a), 4),
        })

    return {
        "scenario_a": {
            "name": result_a["scenario_name"],
            "threat_count": result_a["threat_count"],
            "base_count": result_a["base_count"],
            "overall_robustness": agg_a["overall_robustness"],
            "overall_failure_probability": agg_a["overall_failure_probability"],
        },
        "scenario_b": {
            "name": result_b["scenario_name"],
            "threat_count": result_b["threat_count"],
            "base_count": result_b["base_count"],
            "overall_robustness": agg_b["overall_robustness"],
            "overall_failure_probability": agg_b["overall_failure_probability"],
        },
        "deltas": {
            "robustness": delta_robustness,
            "failure_probability": delta_failure,
            "trust": delta_trust,
            "verdict": (
                "B is more resilient" if delta_robustness > 0.02
                else "A is more resilient" if delta_robustness < -0.02
                else "Comparable"
            ),
        },
        "paired_sweep": paired_deltas,
        "best_policy_a": agg_a["best_policy"],
        "best_policy_b": agg_b["best_policy"],
    }
