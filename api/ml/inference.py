from __future__ import annotations

import hashlib
import json
from typing import Any, Iterable, Sequence

import numpy as np

from .models import (
    AssetImpact,
    DeepSimHint,
    EnsembleMemberTrace,
    FeatureContribution,
    MetricTrajectory,
    PredictedTrajectory,
    SimulationAsset,
    SimulationContext,
    TheaterStateVector,
)


import math

class SurrogateModel:
    def predict(self, context: np.ndarray | Any) -> np.ndarray | dict[str, list[float]]:
        if isinstance(context, SimulationContext):
            results = {}
            blue_bases = [
                a for a in context.assets 
                if a.side == "BLUE" and "BASE" in a.unit_type.upper()
            ]
            
            for asset in context.assets:
                # Default 6-element distribution: 
                # [probe, feint, strike, saturation, decoy, strategic_strike]
                dist = {
                    'probe': 0.15,
                    'feint': 0.15,
                    'strike': 0.15,
                    'saturation': 0.15,
                    'decoy': 0.15,
                    'strategic_strike': 0.15
                }
                
                # Armament Loadout heuristics
                if asset.armament == 'ELECTRONIC_WARFARE':
                    dist['decoy'] += 0.40  # DECEPTION
                    dist['probe'] += 0.40  # SURVEILLANCE
                
                if asset.armament == 'KINETIC_STRIKE' and asset.speed > 800:
                    dist['strike'] += 10.0  # Maximize STRIKE
                
                # OriginCountry and Heading heuristics
                if asset.origin_country == 'RUSSIA' and asset.heading is not None:
                    asset_x = asset.metadata.get('x', 0.0)
                    asset_y = asset.metadata.get('y', 0.0)
                    
                    is_directed = False
                    for bb in blue_bases:
                        bb_x = bb.metadata.get('x', 0.0)
                        bb_y = bb.metadata.get('y', 0.0)
                        
                        dx = bb_x - asset_x
                        dy = bb_y - asset_y
                        
                        # Calculate bearing where 0 is North (-y)
                        angle_deg = math.degrees(math.atan2(dx, -dy)) % 360
                        
                        diff = abs(angle_deg - asset.heading)
                        if diff > 180:
                            diff = 360 - diff
                        
                        if diff < 15:
                            is_directed = True
                            
                        # Proximity to critical assets
                        dist_sq = dx**2 + dy**2
                        if dist_sq < 25000:  # Arbitrary proximity threshold
                            dist['strike'] += 0.2
                    
                    if is_directed:
                        dist['strike'] += 0.5
                
                # Theater state proximity heuristic
                if context.theater.cluster_density > 0.8:
                    dist['saturation'] += 0.3
                    dist['strike'] += 0.1

                total = sum(dist.values())
                if total > 0:
                    results[asset.id] = [
                        round(dist['probe']/total, 3),
                        round(dist['feint']/total, 3),
                        round(dist['strike']/total, 3),
                        round(dist['saturation']/total, 3),
                        round(dist['decoy']/total, 3),
                        round(dist['strategic_strike']/total, 3)
                    ]
                else:
                    results[asset.id] = [round(1.0/6.0, 3)] * 6
                    
            return results

        # Introduce actual variance based on input shape
        # Return a 6-element array simulating a trajectory prediction
        noise = np.random.normal(0, 0.05, size=6)
        base = np.linspace(0.8, 0.2, 6)
        return np.clip(base + noise, 0, 1)


class EnsembleInference:
    """
    Ensemble inference wrapper for counterfactual prediction.

    The class keeps the original mock-ensemble pathway used by the existing
    tests, but also supports a richer simulation context with assets/units,
    forecast bands, ensemble-member traces, and feature diagnostics.
    """

    def __init__(self, models: list[Any] | None = None):
        if models is None:
            self.models = [SurrogateModel() for _ in range(5)]
        else:
            self.models = models

    def predict_trajectory(self, state: TheaterStateVector | SimulationContext) -> PredictedTrajectory:
        if isinstance(state, SimulationContext):
            return self._predict_rich(state)
        return self._predict_legacy(state)

    def _predict_legacy(self, state: TheaterStateVector) -> PredictedTrajectory:
        if not self.models:
            raise ValueError("EnsembleInference requires at least one model.")

        raw_predictions: list[Sequence[float]] = []
        for model in self.models:
            raw_predictions.append(model.predict(state))

        preds_array = np.array(raw_predictions, dtype=float)
        p10_vals = np.percentile(preds_array, 10, axis=0).tolist()
        p50_vals = np.percentile(preds_array, 50, axis=0).tolist()
        p90_vals = np.percentile(preds_array, 90, axis=0).tolist()
        step_variances = np.var(preds_array, axis=0)
        total_variance = float(np.mean(step_variances))
        trust_score = 1.0 / (1.0 + total_variance)

        return PredictedTrajectory(
            time_horizon=list(range(preds_array.shape[1])),
            p10=p10_vals,
            p50=p50_vals,
            p90=p90_vals,
            trust_score=trust_score,
            is_speculative=trust_score < 0.7,
            model_version="legacy-ensemble",
            provenance={"mode": "legacy"},
        )

    def _predict_rich(self, context: SimulationContext) -> PredictedTrajectory:
        assets = context.assets or [self._fallback_asset(context.theater)]
        selected = self._select_asset(assets, context.selected_asset_id)
        digest = self._scenario_digest(context)
        rng = np.random.default_rng(self._seed_from_digest(digest))

        horizon = list(context.horizon_minutes or [0, 5, 10, 15, 20, 25, 30])
        selected_bundle = self._simulate_asset_bundle(context, selected, horizon, rng)
        reference_bundle = self._simulate_reference_bundle(context, horizon)

        asset_impacts = [
            self._asset_impact(context, asset, horizon, rng, reference_bundle["p50"][0])
            for asset in assets
        ]

        ensemble_members = self._build_ensemble_members(
            selected_bundle["p50"],
            count=max(3, context.n_ensemble_members),
            trust_score=selected_bundle["trust_score"],
            rng=rng,
        )

        feature_importances = self._feature_importances(context, selected, reference_bundle)
        metric_trajectories = self._metric_trajectories(context, selected_bundle, reference_bundle)

        trust_score = self._trust_score(
            selected_bundle["base_variance"],
            selected,
            context.theater,
        )
        is_speculative = trust_score < 0.7 or selected.exposed_risk > 0.72
        deep_sim_hint = DeepSimHint(
            required=is_speculative,
            reason=(
                "Low ensemble agreement for the selected asset"
                if is_speculative
                else "Fast-path prediction is sufficiently stable"
            ),
            recommended_runs=1500 if is_speculative else 500,
        )

        return PredictedTrajectory(
            time_horizon=horizon,
            p10=selected_bundle["p10"],
            p50=selected_bundle["p50"],
            p90=selected_bundle["p90"],
            trust_score=trust_score,
            is_speculative=is_speculative,
            metric_trajectories=metric_trajectories,
            ensemble_members=ensemble_members,
            feature_importances=feature_importances,
            asset_impacts=asset_impacts,
            selected_asset=selected,
            selected_asset_id=selected.id,
            scenario_digest=digest,
            model_version=context.model_version,
            deep_sim_hint=deep_sim_hint,
            provenance={
                "mode": "rich",
                "assetCount": str(len(assets)),
                "selectedAssetId": selected.id,
            },
        )

    def _simulate_reference_bundle(self, context: SimulationContext, horizon: list[int]) -> dict[str, Any]:
        theater = context.theater
        policy = theater.policy_deltas
        base = self._base_score(
            theater.base_readiness_mean,
            theater.cluster_density,
            theater.jammer_intensity,
            policy.safety,
            policy.sustainability,
            0.5,
            0.5,
            0.5,
            0.5,
            0.5,
        )
        p50 = [self._trajectory_point(base, step / max(1, len(horizon) - 1), 0.0) for step, _ in enumerate(horizon)]
        return {
            "p50": p50,
        }

    def _simulate_asset_bundle(
        self,
        context: SimulationContext,
        asset: SimulationAsset,
        horizon: list[int],
        rng: np.random.Generator,
    ) -> dict[str, Any]:
        theater = context.theater
        policy = theater.policy_deltas
        base = self._base_score(
            theater.base_readiness_mean,
            theater.cluster_density,
            theater.jammer_intensity,
            policy.safety,
            policy.sustainability,
            asset.readiness,
            asset.sensor_quality,
            asset.exposed_risk,
            asset.mobility,
            asset.endurance,
        )
        drift = self._asset_drift(asset, theater)
        p50: list[float] = []
        p10: list[float] = []
        p90: list[float] = []
        member_traces: list[list[float]] = []
        member_count = max(3, context.n_ensemble_members)
        member_offsets = np.linspace(-0.06, 0.06, member_count)

        for idx, _minute in enumerate(horizon):
            progress = idx / max(1, len(horizon) - 1)
            central = self._trajectory_point(base, progress, drift)
            uncertainty = 0.04 + 0.10 * asset.exposed_risk + 0.06 * theater.cluster_density + 0.05 * theater.jammer_intensity
            oscillation = 0.015 * np.sin(progress * np.pi * 1.7)
            p50.append(self._clamp(central + oscillation, 0.02, 0.98))
            p10.append(self._clamp(p50[-1] - uncertainty, 0.0, 1.0))
            p90.append(self._clamp(p50[-1] + uncertainty, 0.0, 1.0))

            traces_for_step = []
            for offset in member_offsets:
                jitter = rng.normal(0.0, 0.008 + asset.exposed_risk * 0.01)
                traces_for_step.append(self._clamp(p50[-1] + offset + jitter, 0.0, 1.0))
            member_traces.append(traces_for_step)

        step_variance = float(np.mean(np.var(np.array(member_traces), axis=1)))
        trust_score = 1.0 / (1.0 + step_variance)

        return {
            "p10": p10,
            "p50": p50,
            "p90": p90,
            "base_variance": step_variance,
            "trust_score": trust_score,
            "member_traces": member_traces,
        }

    def _metric_trajectories(
        self,
        context: SimulationContext,
        selected_bundle: dict[str, Any],
        reference_bundle: dict[str, Any],
    ) -> list[MetricTrajectory]:
        horizon = context.horizon_minutes or [0, 5, 10, 15, 20, 25, 30]
        selected = np.array(selected_bundle["p50"], dtype=float)
        reference = np.array(reference_bundle["p50"], dtype=float)

        readiness = np.clip(selected + 0.08, 0.0, 1.0)
        failure = np.clip(1.0 - selected + 0.15 * (selected < 0.5), 0.0, 1.0)
        asymmetry = np.clip(1.0 + selected * 4.0, 0.5, 9.0)
        confidence = np.clip(0.65 + (selected - reference) * 0.8, 0.0, 1.0)

        return [
            MetricTrajectory(
                name="robustness",
                unit="score",
                p10=selected_bundle["p10"],
                p50=selected_bundle["p50"],
                p90=selected_bundle["p90"],
            ),
            MetricTrajectory(
                name="readinessFloor",
                unit="score",
                p10=np.clip(readiness - 0.06, 0.0, 1.0).tolist(),
                p50=readiness.tolist(),
                p90=np.clip(readiness + 0.06, 0.0, 1.0).tolist(),
            ),
            MetricTrajectory(
                name="failureProbability",
                unit="probability",
                p10=np.clip(failure - 0.06, 0.0, 1.0).tolist(),
                p50=failure.tolist(),
                p90=np.clip(failure + 0.08, 0.0, 1.0).tolist(),
            ),
            MetricTrajectory(
                name="asymmetryRatio",
                unit="ratio",
                p10=np.clip(asymmetry - 0.4, 0.0, None).tolist(),
                p50=asymmetry.tolist(),
                p90=np.clip(asymmetry + 0.6, 0.0, None).tolist(),
            ),
            MetricTrajectory(
                name="ensembleConfidence",
                unit="score",
                p10=np.clip(confidence - 0.05, 0.0, 1.0).tolist(),
                p50=confidence.tolist(),
                p90=np.clip(confidence + 0.05, 0.0, 1.0).tolist(),
            ),
        ]

    def _feature_importances(
        self,
        context: SimulationContext,
        selected: SimulationAsset,
        reference_bundle: dict[str, Any],
    ) -> list[FeatureContribution]:
        theater = context.theater
        policy = theater.policy_deltas
        rows = [
            ("asset.readiness", "asset", selected.readiness * 0.22),
            ("asset.sensor_quality", "asset", selected.sensor_quality * 0.18),
            ("asset.exposed_risk", "asset", (1.0 - selected.exposed_risk) * 0.16),
            ("asset.waypoint_complexity", "asset", (1.0 - selected.waypoint_complexity) * 0.12),
            ("asset.endurance", "asset", selected.endurance * 0.11),
            ("theater.base_readiness_mean", "theater", theater.base_readiness_mean * 0.15),
            ("theater.cluster_density", "theater", (1.0 - theater.cluster_density) * 0.10),
            ("policy.safety", "policy", policy.safety * 0.09),
            ("policy.sustainability", "policy", policy.sustainability * 0.07),
            ("policy.resilience", "policy", getattr(policy, "resilience", 0.0) * 0.06),
        ]
        total = sum(abs(value) for _, _, value in rows) or 1.0
        reference = float(reference_bundle["p50"][0])
        return [
            FeatureContribution(
                name=name,
                category=category,
                value=round(value, 4),
                impact=round(abs(value) / total * (1.0 + reference * 0.1), 4),
            )
            for name, category, value in sorted(rows, key=lambda item: abs(item[2]), reverse=True)
        ]

    def _asset_impact(
        self,
        context: SimulationContext,
        asset: SimulationAsset,
        horizon: list[int],
        rng: np.random.Generator,
        reference_score: float,
    ) -> AssetImpact:
        bundle = self._simulate_asset_bundle(context, asset, horizon, rng)
        robustness = float(bundle["p50"][-1])
        readiness_floor = float(np.clip(asset.readiness * 0.85 + context.theater.base_readiness_mean * 0.12, 0.0, 1.0))
        failure_probability = float(np.clip(1.0 - robustness + asset.exposed_risk * 0.18, 0.0, 1.0))
        asymmetry_ratio = float(np.clip(1.0 + robustness * 4.2 + asset.inventory_depth * 1.3 - asset.exposed_risk * 1.5, 0.5, 9.0))
        return AssetImpact(
            asset_id=asset.id,
            label=asset.label,
            unit_type=asset.unit_type,
            source=asset.source,
            side=asset.side,
            robustness_score=round(robustness, 3),
            readiness_floor=round(readiness_floor, 3),
            failure_probability=round(failure_probability, 3),
            asymmetry_ratio=round(asymmetry_ratio, 3),
            delta_robustness=round(robustness - reference_score, 3),
            delta_readiness=round(readiness_floor - context.theater.base_readiness_mean, 3),
            delta_failure_probability=round(failure_probability - (1.0 - reference_score), 3),
            summary=self._asset_summary(asset, robustness, failure_probability),
        )

    def _build_ensemble_members(
        self,
        selected_p50: Sequence[float],
        count: int,
        trust_score: float,
        rng: np.random.Generator,
    ) -> list[EnsembleMemberTrace]:
        members: list[EnsembleMemberTrace] = []
        base = np.array(selected_p50, dtype=float)
        spread = max(0.01, (1.0 - trust_score) * 0.12 + 0.015)
        for idx in range(count):
            offset = np.linspace(-spread, spread, len(base))
            noise = rng.normal(0.0, spread / 3.0, len(base))
            values = np.clip(base + offset * ((idx / max(1, count - 1)) - 0.5) + noise, 0.0, 1.0)
            variance = float(np.var(values - base))
            agreement = float(np.clip(1.0 - variance * 8.0, 0.0, 1.0))
            members.append(
                EnsembleMemberTrace(
                    id=f"member-{idx + 1}",
                    label=f"Forest {idx + 1}",
                    values=values.round(3).tolist(),
                    agreement=round(agreement, 3),
                    variance=round(variance, 4),
                )
            )
        return members

    def _trust_score(self, variance: float, asset: SimulationAsset, theater: TheaterStateVector) -> float:
        risk_penalty = (asset.exposed_risk * 0.25) + (theater.cluster_density * 0.15) + (theater.jammer_intensity * 0.20)
        return float(np.clip(1.0 / (1.0 + variance * 2.8 + risk_penalty), 0.0, 1.0))

    def _scenario_digest(self, context: SimulationContext) -> str:
        payload = context.model_dump(by_alias=True, exclude_none=True)
        serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:16]

    def _seed_from_digest(self, digest: str) -> int:
        return int(digest[:8], 16)

    def _asset_drift(self, asset: SimulationAsset, theater: TheaterStateVector) -> float:
        return (
            asset.readiness * 0.16
            + asset.sensor_quality * 0.12
            + asset.endurance * 0.08
            + asset.mobility * 0.06
            - asset.exposed_risk * 0.18
            - asset.waypoint_complexity * 0.10
            + theater.base_readiness_mean * 0.10
            - theater.cluster_density * 0.08
            - theater.jammer_intensity * 0.06
        )

    def _base_score(
        self,
        readiness_mean: float,
        cluster_density: float,
        jammer_intensity: float,
        safety: float,
        sustainability: float,
        asset_readiness: float,
        sensor_quality: float,
        exposed_risk: float,
        mobility: float,
        endurance: float,
    ) -> float:
        return self._clamp(
            0.22
            + readiness_mean * 0.20
            + safety * 0.10
            + sustainability * 0.08
            + asset_readiness * 0.16
            + sensor_quality * 0.12
            + mobility * 0.05
            + endurance * 0.06
            - cluster_density * 0.11
            - jammer_intensity * 0.09
            - exposed_risk * 0.18,
            0.02,
            0.98,
        )

    def _trajectory_point(self, base: float, progress: float, drift: float) -> float:
        curve = base + drift * progress - 0.05 * (progress**1.25) + 0.02 * np.sin(progress * np.pi)
        return self._clamp(curve, 0.02, 0.98)

    def _select_asset(self, assets: Iterable[SimulationAsset], selected_id: str | None) -> SimulationAsset:
        asset_list = list(assets)
        if not asset_list:
            raise ValueError("SimulationContext requires at least one asset.")
        if selected_id:
            match = next((asset for asset in asset_list if asset.id == selected_id), None)
            if match is not None:
                return match
        return asset_list[0]

    def _fallback_asset(self, theater: TheaterStateVector) -> SimulationAsset:
        return SimulationAsset(
            id="THEATER-BASELINE",
            label="Theater Baseline",
            unit_type="BASELINE",
            side="BLUE",
            readiness=theater.base_readiness_mean,
            speed=0.5,
            waypoint_complexity=0.4,
            inventory_depth=0.5,
            sensor_quality=max(0.1, 1.0 - theater.jammer_intensity * 0.5),
            exposed_risk=theater.cluster_density,
            mobility=0.5,
            endurance=0.55,
            source="campaign",
            metadata={"fallback": True},
        )

    def _asset_summary(self, asset: SimulationAsset, robustness: float, failure_probability: float) -> str:
        if robustness >= 0.78:
            posture = "highly resilient"
        elif robustness >= 0.58:
            posture = "moderately stable"
        else:
            posture = "fragile"
        risk_word = "contained" if failure_probability < 0.35 else "pressured"
        return f"{asset.label} is {posture}; asset risk is {risk_word} under the current posture."

    @staticmethod
    def _clamp(value: float, low: float, high: float) -> float:
        return float(max(low, min(high, value)))
