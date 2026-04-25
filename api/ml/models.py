from __future__ import annotations

from typing import Any, List, Literal

from pydantic import Field

from ..models import BDTModel
from .types import PolicyDeltas


class TheaterStateVector(BDTModel):
    """
    A compressed representation of the theater state at a specific point in time,
    including any 'latent perturbations' applied for counterfactual analysis.
    """
    timestamp: str
    track_count: int
    avg_velocity: float
    cluster_density: float
    base_readiness_mean: float
    jammer_intensity: float
    policy_deltas: PolicyDeltas
    scenario_name: str | None = None
    phase: str | None = None
    track_velocity_spread: float | None = None


class SimulationAsset(BDTModel):
    """
    A unit or asset participating in the counterfactual simulation.

    The frontend derives these from drawing-board units or fallback catalog
    entries so the backend can compare how different asset properties affect
    the forecast.
    """

    id: str
    label: str
    unit_type: str
    side: Literal["BLUE", "RED", "NEUTRAL"] = "BLUE"
    readiness: float = 0.5
    speed: float = 0.5
    waypoint_complexity: float = 0.5
    inventory_depth: float = 0.5
    sensor_quality: float = 0.5
    exposed_risk: float = 0.5
    mobility: float = 0.5
    endurance: float = 0.5
    source: Literal["drawing_board", "campaign", "catalog"] = "catalog"
    metadata: dict[str, Any] = Field(default_factory=dict)


class SimulationContext(BDTModel):
    """
    Full simulation request used by the counterfactual lab.
    """

    theater: TheaterStateVector
    assets: list[SimulationAsset] = Field(default_factory=list)
    selected_asset_id: str | None = None
    horizon_minutes: list[int] = Field(default_factory=lambda: [0, 5, 10, 15, 20, 25, 30])
    model_version: str = "synthetic-ensemble-v2"
    n_ensemble_members: int = 7
    n_runs: int = 1000


class MetricTrajectory(BDTModel):
    name: str
    unit: str = "score"
    p10: list[float]
    p50: list[float]
    p90: list[float]


class EnsembleMemberTrace(BDTModel):
    id: str
    label: str
    values: list[float]
    agreement: float
    variance: float


class FeatureContribution(BDTModel):
    name: str
    category: str
    value: float
    impact: float


class AssetImpact(BDTModel):
    asset_id: str
    label: str
    unit_type: str
    source: str
    side: str
    robustness_score: float
    readiness_floor: float
    failure_probability: float
    asymmetry_ratio: float
    delta_robustness: float
    delta_readiness: float
    delta_failure_probability: float
    summary: str


class DeepSimHint(BDTModel):
    required: bool
    reason: str
    recommended_runs: int
    provider: str = "runpod"


class DeepSimJobMetadata(BDTModel):
    status: Literal["triggered", "queued", "failed"] = "triggered"
    job_id: str
    provider: str = "runpod"
    provider_job_id: str | None = None
    scenario_digest: str
    model_version: str
    selected_asset_id: str | None = None
    asset_count: int = 0
    n_runs: int = 1000
    trust_score: float = 1.0
    created_at: str | None = None


class PredictedTrajectory(BDTModel):
    """
    Represents a predicted outcome path over a time horizon, including
    confidence quantiles for robustness analysis.
    """
    time_horizon: List[int]
    p10: List[float]
    p50: List[float]
    p90: List[float]
    trust_score: float
    is_speculative: bool
    metric_trajectories: list[MetricTrajectory] = Field(default_factory=list)
    ensemble_members: list[EnsembleMemberTrace] = Field(default_factory=list)
    feature_importances: list[FeatureContribution] = Field(default_factory=list)
    asset_impacts: list[AssetImpact] = Field(default_factory=list)
    selected_asset: SimulationAsset | None = None
    selected_asset_id: str | None = None
    scenario_digest: str | None = None
    model_version: str | None = None
    deep_sim_hint: DeepSimHint | None = None
    provenance: dict[str, Any] = Field(default_factory=dict)
