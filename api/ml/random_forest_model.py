"""
Scenario-dependent Random Forest models for Steel inference.

Trains on synthetic data generated from both Scenario A (Boreal Strike) and
Scenario B (Ghost Feint) configurations, covering the operational parameter
space with realistic variation. Three models predict:

  1. robustness_score  — overall mission outcome quality
  2. failure_probability — likelihood of mission failure
  3. intent_strike     — posterior probability of STRIKE intent

Feature vector (10 dims, matching _base_score inputs):
  [readiness_mean, cluster_density, jammer_intensity,
   safety, sustainability,
   asset_readiness, sensor_quality, exposed_risk,
   mobility, endurance]

Plus scenario-aware derived features added at training time:
  [scenario_onehot_A, scenario_onehot_B, threat_count, avg_velocity,
   strike_prior, velocity_x_density]

The models are persisted via joblib and loaded at startup.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Optional

import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import cross_val_score
import joblib

FEATURE_NAMES = [
    "readiness_mean", "cluster_density", "jammer_intensity",
    "safety", "sustainability",
    "asset_readiness", "sensor_quality", "exposed_risk",
    "mobility", "endurance",
    "scenario_boreal_strike", "scenario_ghost_feint",
    "threat_count", "avg_velocity",
    "strike_prior", "velocity_x_density",
]

FEATURE_COUNT = len(FEATURE_NAMES)

MODEL_DIR = Path(__file__).parent / ".models"
_ROBUSTNESS_MODEL_PATH = MODEL_DIR / "rf_robustness.joblib"
_FAILURE_MODEL_PATH = MODEL_DIR / "rf_failure.joblib"
_INTENT_MODEL_PATH = MODEL_DIR / "rf_intent_strike.joblib"


class ScenarioRFInference:
    """Holds the three trained RF models and provides unified prediction."""

    def __init__(
        self,
        robustness_rf: RandomForestRegressor,
        failure_rf: RandomForestRegressor,
        intent_rf: RandomForestRegressor,
    ):
        self.robustness_rf = robustness_rf
        self.failure_rf = failure_rf
        self.intent_rf = intent_rf

    def predict_robustness(self, features: np.ndarray) -> np.ndarray:
        return self.robustness_rf.predict(features)

    def predict_failure(self, features: np.ndarray) -> np.ndarray:
        return self.failure_rf.predict(features)

    def predict_intent_strike(self, features: np.ndarray) -> np.ndarray:
        return self.intent_rf.predict(features)

    def feature_importances(self) -> dict[str, float]:
        importance = self.robustness_rf.feature_importances_
        total = importance.sum() or 1.0
        return {
            name: round(float(imp / total), 4)
            for name, imp in zip(FEATURE_NAMES, importance)
        }

    def per_tree_predictions(self, features: np.ndarray, model: str = "robustness") -> np.ndarray:
        rf = {
            "robustness": self.robustness_rf,
            "failure": self.failure_rf,
            "intent": self.intent_rf,
        }[model]
        predictions = np.array([
            tree.predict(features) for tree in rf.estimators_
        ])
        return predictions

    def export_forest_structure(self) -> dict:
        result: dict[str, list] = {}
        models = {
            "robustness": self.robustness_rf,
            "failure": self.failure_rf,
            "intent": self.intent_rf,
        }
        colors = {"robustness": "#3b82f6", "failure": "#ef4444", "intent": "#f59e0b"}
        for model_name, rf in models.items():
            trees: list[dict] = []
            for idx, estimator in enumerate(rf.estimators_):
                t = estimator.tree_
                nodes: list[dict] = []
                for nid in range(t.node_count):
                    is_leaf = t.children_left[nid] == -1
                    nodes.append({
                        "id": nid,
                        "isLeaf": is_leaf,
                        "feature": FEATURE_NAMES[t.feature[nid]] if not is_leaf else None,
                        "featureIndex": int(t.feature[nid]) if not is_leaf else -1,
                        "threshold": float(t.threshold[nid]) if not is_leaf else None,
                        "value": float(t.value[nid][0][0]),
                        "nSamples": int(t.n_node_samples[nid]),
                        "left": int(t.children_left[nid]) if not is_leaf else None,
                        "right": int(t.children_right[nid]) if not is_leaf else None,
                        "depth": int(t.depth) if hasattr(t, 'depth') else 0,
                    })
                trees.append({
                    "treeIndex": idx,
                    "nodeCount": int(t.node_count),
                    "maxDepth": int(t.max_depth),
                    "nLeaves": int(t.n_leaves),
                    "nodes": nodes,
                })
            result[model_name] = {
                "color": colors[model_name],
                "nEstimators": len(rf.estimators_),
                "trees": trees,
            }
        return result

    def export_training_samples_tsne(self, n_samples: int = 5000, perplexity: float = 30.0, random_state: int = 42) -> dict:
        from sklearn.manifold import TSNE
        rng = np.random.default_rng(random_state)
        X_a, y_rob_a, _, _ = _generate_scenario_samples("boreal_strike", n_samples // 2, rng)
        X_b, y_rob_b, _, _ = _generate_scenario_samples("ghost_feint", n_samples // 2, rng)
        X = np.vstack([X_a, X_b])
        y_rob = np.concatenate([y_rob_a, y_rob_b])
        scenario_labels = np.array([0] * (n_samples // 2) + [1] * (n_samples // 2))
        tsne = TSNE(n_components=3, perplexity=perplexity, random_state=random_state, n_iter=1000)
        coords = tsne.fit_transform(X)
        result_features = [
            "readinessMean", "clusterDensity", "jammerIntensity",
            "safety", "sustainability",
            "assetReadiness", "sensorQuality", "exposedRisk",
            "mobility", "endurance",
            "scenarioBorealStrike", "scenarioGhostFeint",
            "threatCount", "avgVelocity",
            "strikePrior", "velocityXDensity",
        ]
        samples = []
        for i in range(len(X)):
            samples.append({
                "x": float(coords[i][0]),
                "y": float(coords[i][1]),
                "z": float(coords[i][2]),
                "robustness": float(y_rob[i]),
                "scenario": "boreal_strike" if scenario_labels[i] == 0 else "ghost_feint",
                "features": {name: float(X[i][j]) for j, name in enumerate(result_features)},
            })
        return {"samples": samples, "featureNames": result_features}


def _generate_scenario_samples(
    scenario: str,
    n_samples: int,
    rng: np.random.Generator,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Generate synthetic training samples for a given scenario.

    Returns (X, y_robustness, y_failure, y_intent_strike).
    """
    X_list: list[np.ndarray] = []
    y_rob: list[float] = []
    y_fail: list[float] = []
    y_strike: list[float] = []

    is_boreal_strike = scenario == "boreal_strike"

    for _ in range(n_samples):
        if is_boreal_strike:
            readiness_mean = rng.uniform(0.55, 0.92)
            cluster_density = rng.uniform(0.3, 0.9)
            jammer_intensity = rng.uniform(0.0, 0.4)
            safety = rng.uniform(0.6, 1.0)
            sustainability = rng.uniform(0.2, 0.5)
            asset_readiness = rng.uniform(0.6, 0.95)
            sensor_quality = rng.uniform(0.7, 1.0)
            exposed_risk = rng.uniform(0.4, 0.9)
            mobility = rng.uniform(0.4, 0.7)
            endurance = rng.uniform(0.5, 0.8)
            threat_count = rng.integers(3, 12)
            avg_velocity = rng.uniform(350, 500)
            strike_prior = rng.uniform(0.45, 0.80)
        else:  # ghost_feint
            readiness_mean = rng.uniform(0.60, 0.95)
            cluster_density = rng.uniform(0.15, 0.6)
            jammer_intensity = rng.uniform(0.3, 1.0)
            safety = rng.uniform(0.3, 0.7)
            sustainability = rng.uniform(0.4, 0.9)
            asset_readiness = rng.uniform(0.45, 0.85)
            sensor_quality = rng.uniform(0.3, 0.85)
            exposed_risk = rng.uniform(0.15, 0.55)
            mobility = rng.uniform(0.5, 0.9)
            endurance = rng.uniform(0.55, 0.90)
            threat_count = rng.integers(8, 20)
            avg_velocity = rng.uniform(180, 320)
            strike_prior = rng.uniform(0.05, 0.30)

        # After redirect (velocity spike) — some samples represent post-redirect
        if rng.random() < 0.3 and not is_boreal_strike:
            avg_velocity = rng.uniform(400, 500)
            strike_prior = rng.uniform(0.60, 0.90)
            exposed_risk = rng.uniform(0.5, 0.95)
            sensor_quality = rng.uniform(0.25, 0.7)

        velocity_x_density = avg_velocity / 500.0 * cluster_density

        features = np.array([
            readiness_mean, cluster_density, jammer_intensity,
            safety, sustainability,
            asset_readiness, sensor_quality, exposed_risk,
            mobility, endurance,
            float(is_boreal_strike), float(not is_boreal_strike),
            float(threat_count), avg_velocity / 500.0,
            strike_prior, velocity_x_density,
        ])

        # ---- Label generation (grounded in Bayesian + Monte Carlo physics) ----

        # Robustness: high readiness + safety + sensor quality → high robustness
        #   jamming + density + risk → lower robustness
        #   Scenario A has lower robustness (overwhelmed), B higher (manageable until redirect)
        base_robustness = (
            0.15
            + readiness_mean * 0.18
            + safety * 0.10
            + sustainability * 0.07
            + asset_readiness * 0.14
            + sensor_quality * 0.10
            + mobility * 0.04
            + endurance * 0.05
            - cluster_density * 0.09
            - jammer_intensity * 0.08
            - exposed_risk * 0.16
        )

        if is_boreal_strike:
            base_robustness -= 0.06
            base_robustness += strike_prior * 0.03
        else:
            base_robustness += 0.02
            base_robustness -= jammer_intensity * 0.04

        robustness = np.clip(base_robustness + rng.normal(0, 0.04), 0.02, 0.98)

        # Failure probability: inverse relationship with robustness, amplified by risk
        failure = np.clip(
            1.0 - robustness
            + exposed_risk * 0.15
            + cluster_density * 0.05
            - readiness_mean * 0.08
            + rng.normal(0, 0.03),
            0.0, 0.95,
        )

        # Strike intent: Bayesian-style — driven by velocity, prior, class bias
        #   Scenario A: always high (missile strike)
        #   Scenario B: low normally, high after redirect
        strike_signal = (
            0.10
            + strike_prior * 0.40
            + (avg_velocity / 500.0) * 0.20
            + cluster_density * 0.08
            - sensor_quality * 0.15
            + (1.0 - exposed_risk) * 0.05
        )
        if is_boreal_strike:
            strike_signal += 0.25
        if jammer_intensity > 0.5:
            strike_signal += 0.05

        strike_intent = np.clip(
            1.0 / (1.0 + np.exp(-(strike_signal - 0.5) * 8))
            + rng.normal(0, 0.03),
            0.01, 0.99,
        )

        X_list.append(features)
        y_rob.append(float(robustness))
        y_fail.append(float(failure))
        y_strike.append(float(strike_intent))

    X = np.array(X_list)
    y_rob = np.array(y_rob)
    y_fail = np.array(y_fail)
    y_strike = np.array(y_strike)
    return X, y_rob, y_fail, y_strike


def train_or_load(n_per_scenario: int = 5000) -> ScenarioRFInference:
    """Train the RF models or load from disk if cached.

    Generates n_per_scenario samples per scenario (A + B = 2x total),
    trains three RandomForestRegressors, and persists via joblib.
    """
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    all_paths_exist = (
        _ROBUSTNESS_MODEL_PATH.exists()
        and _FAILURE_MODEL_PATH.exists()
        and _INTENT_MODEL_PATH.exists()
    )
    if all_paths_exist:
        return ScenarioRFInference(
            robustness_rf=joblib.load(_ROBUSTNESS_MODEL_PATH),
            failure_rf=joblib.load(_FAILURE_MODEL_PATH),
            intent_rf=joblib.load(_INTENT_MODEL_PATH),
        )

    rng = np.random.default_rng(42)

    X_a, y_rob_a, y_fail_a, y_strike_a = _generate_scenario_samples(
        "boreal_strike", n_per_scenario, rng
    )
    X_b, y_rob_b, y_fail_b, y_strike_b = _generate_scenario_samples(
        "ghost_feint", n_per_scenario, rng
    )

    X = np.vstack([X_a, X_b])
    y_rob = np.concatenate([y_rob_a, y_rob_b])
    y_fail = np.concatenate([y_fail_a, y_fail_b])
    y_strike = np.concatenate([y_strike_a, y_strike_b])

    shuffle_idx = rng.permutation(len(X))
    X = X[shuffle_idx]
    y_rob = y_rob[shuffle_idx]
    y_fail = y_fail[shuffle_idx]
    y_strike = y_strike[shuffle_idx]

    rf_kwargs = dict(
        n_estimators=100,
        max_depth=12,
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1,
    )

    robustness_rf = RandomForestRegressor(**rf_kwargs)
    robustness_rf.fit(X, y_rob)

    failure_rf = RandomForestRegressor(**rf_kwargs)
    failure_rf.fit(X, y_fail)

    intent_rf = RandomForestRegressor(**rf_kwargs)
    intent_rf.fit(X, y_strike)

    joblib.dump(robustness_rf, _ROBUSTNESS_MODEL_PATH)
    joblib.dump(failure_rf, _FAILURE_MODEL_PATH)
    joblib.dump(intent_rf, _INTENT_MODEL_PATH)

    r2_rob = robustness_rf.score(X, y_rob)
    r2_fail = failure_rf.score(X, y_fail)
    r2_strike = intent_rf.score(X, y_strike)

    return ScenarioRFInference(
        robustness_rf=robustness_rf,
        failure_rf=failure_rf,
        intent_rf=intent_rf,
    )


def build_feature_vector(
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
    scenario_name: str = "Boreal Sentinel I",
    threat_count: int = 3,
    avg_velocity: float = 250.0,
    strike_prior: float = 0.3,
) -> np.ndarray:
    """Build the 16-feature vector from raw inputs, matching FEATURE_NAMES."""
    is_boreal_strike = 1.0 if scenario_name in ("Boreal Strike", "KINETIC_STRIKE") else 0.0
    is_ghost_feint = 1.0 if scenario_name in ("Ghost Feint", "PROBE_DECEPTION") else 0.0
    velocity_x_density = (avg_velocity / 500.0) * cluster_density

    return np.array([[
        readiness_mean, cluster_density, jammer_intensity,
        safety, sustainability,
        asset_readiness, sensor_quality, exposed_risk,
        mobility, endurance,
        is_boreal_strike, is_ghost_feint,
        float(threat_count), avg_velocity / 500.0,
        strike_prior, velocity_x_density,
    ]])