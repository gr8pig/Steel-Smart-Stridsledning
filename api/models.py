from __future__ import annotations
from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from typing import Literal, Optional


class SSSModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


# ── Shared sub-models ────────────────────────────────────────────────────────

class MissileInventory(SSSModel):
    interceptor_short: int
    interceptor_mid: int
    interceptor_long: int


class PolicyWeights(SSSModel):
    safety: float
    sustainability: float
    resilience: float


class Guardrails(SSSModel):
    civilian_protected: bool
    reserve_interceptor_floor: int
    min_readiness_threshold: float
    critical_asset_priority: float
    engagement_authority: Literal["AUTO", "SEMI", "MANUAL"]


class Assignment(SSSModel):
    threat_id: str
    base_id: str
    effector_type: str
    pk: float


class ProjectedOutcome(SSSModel):
    intercepts: int
    leakage: int
    cost: int
    readiness_delta_by_base: dict[str, float]
    asymmetry_ratio: float
    robustness_score: float
    confidence: float


class IntentDistribution(SSSModel):
    probe: float
    feint: float
    strike: float
    saturation: float
    decoy: float
    strategic_strike: Optional[float] = 0.0
    tactical_cap: Optional[float] = 0.0


class ThreatGeometry(SSSModel):
    x: float
    y: float
    heading: float
    velocity: float


# ── Primary twin models (match TypeScript interfaces exactly) ─────────────────

class BaseTwinModel(SSSModel):
    id: str
    name: str
    role: str
    readiness: float
    sortie_capacity: int
    runway_status: Literal["OPERATIONAL", "DEGRADED", "DISABLED"]
    airframes_available: int
    crews_available: int
    crew_fatigue: float
    fuel_stock: float
    depletion_rate: Optional[float] = None
    missile_inventory: MissileInventory
    recovery_time: str
    threat_exposure: float
    is_reserved: Optional[bool] = None
    target_floor: Optional[float] = None


ArmamentLoadout = Literal[
    "KINETIC_STRIKE",
    "ELECTRONIC_WARFARE",
    "ISR_SURVEILLANCE",
    "AIR_SUPERIORITY",
    "HYBRID_DECEPTION",
]

OriginCountry = Literal["SWEDEN", "NATO", "RUSSIA", "OTHER"]

class ThreatTwinModel(SSSModel):
    id: str
    threat_class: Literal["DRONE", "MISSILE", "AIRCRAFT", "UNKNOWN"] = Field(
        validation_alias=AliasChoices("class", "threatClass", "threat_class"),
        serialization_alias="class",
    )
    platform: Optional[str] = None
    armaments: Optional[list[str]] = None
    armament: Optional[ArmamentLoadout] = None
    intent: Literal["PROBE", "FEINT", "STRIKE", "SATURATION", "DECOY", "STRATEGIC_STRIKE", "TACTICAL_CAP"]
    confidence: float
    time_to_target: float
    target_id: str
    geometry: ThreatGeometry
    heading: Optional[float] = Field(None, ge=0.0, le=360.0)
    origin_country: Optional[OriginCountry] = None
    status: Literal["IDENTIFIED", "TRACKING", "ENGAGED", "NEUTRALIZED", "LEAKED"]
    uncertainty_source: Optional[str] = None
    intent_distribution: Optional[IntentDistribution] = None
    classification_confidence: Optional[float] = None
    sensor_quality: Optional[float] = None
    jamming_probability: Optional[float] = None


class PolicyTwinModel(SSSModel):
    id: str
    name: str
    weights: PolicyWeights
    readiness_floors: dict[str, float]
    guardrails: Guardrails


class DecisionFabricTwin(SSSModel):
    id: str
    sim_time: float
    c2_resilience_score: float
    trust_entropy: float
    authority_friction: float
    operator_load: float
    audit_completeness: float
    failure_probability: float
    projected_collapse_sec: Optional[float] = None
    status: Literal["HEALTHY", "STRESSED", "DEGRADED", "COLLAPSED"]
    timestamp: str


class COATwinModel(SSSModel):
    id: str
    name: str
    type: Literal["MAX_PROTECTION", "BALANCED", "DEEP_SUSTAINABILITY", "CUSTOM"]
    rationale: str
    projected_outcome: ProjectedOutcome
    assignments: list[Assignment]


# ── API request / response schemas ───────────────────────────────────────────

class PolicyUpdateRequest(SSSModel):
    policy_weights: Optional[PolicyWeights] = None
    guardrails: Optional[Guardrails] = None
    client_action_id: Optional[str] = None
    device_id: Optional[str] = None
    queued_at: Optional[str] = None


class PolicyUpdateResponse(PolicyTwinModel):
    accepted: bool = True
    replayed: bool = False
    applied_at: Optional[str] = None
    client_action_id: Optional[str] = None


class COASolveRequest(SSSModel):
    policy_weights: PolicyWeights
    guardrails: Optional[Guardrails] = None


class COASolveResult(SSSModel):
    coas: list[COATwinModel]
    pareto_frontier_size: int
    solve_time_ms: float
    threat_count: int
    reachable_assignments: int


class EngageRequest(SSSModel):
    track_id: str
    base_id: str
    effector_type: str
    client_action_id: Optional[str] = None
    device_id: Optional[str] = None
    queued_at: Optional[str] = None


class EngagementResult(SSSModel):
    success: bool
    track_id: str
    new_status: str
    pk: Optional[float] = None
    inventory_remaining: MissileInventory
    accepted: bool = True
    replayed: bool = False
    applied_at: Optional[str] = None
    client_action_id: Optional[str] = None


class ReadinessProjectionPoint(SSSModel):
    base_id: str
    base_name: str
    readiness_now: float
    readiness_6h: float = Field(
        validation_alias=AliasChoices("readiness6h", "readiness6H", "readiness_6h"),
        serialization_alias="readiness6h",
    )
    readiness_12h: float = Field(
        validation_alias=AliasChoices("readiness12h", "readiness12H", "readiness_12h"),
        serialization_alias="readiness12h",
    )
    readiness_24h: float = Field(
        validation_alias=AliasChoices("readiness24h", "readiness24H", "readiness_24h"),
        serialization_alias="readiness24h",
    )
    life_expectancy_hours: float


class Distribution(SSSModel):
    mean: float
    std: float
    p10: float
    p90: float


class MOEDistributions(SSSModel):
    intercept_fraction: Distribution
    readiness_6h: Distribution = Field(
        validation_alias=AliasChoices("readiness6h", "readiness6H", "readiness_6h"),
        serialization_alias="readiness6h",
    )
    blue_expenditure: Distribution
    asymmetry_ratio: Distribution


class LabRunRequest(SSSModel):
    coa_id: str
    red_model: Literal["DECEPTIVE", "SATURATION", "KINETIC"]
    jammer_severity: int  # 1-3
    track_degradation: int  # 1-3
    n_runs: int = 500


class LabRunResult(SSSModel):
    robustness_score: float
    legacy_comparison_score: float
    fragility_point: str
    failure_probability: float
    failure_heatmap: list[list[float]]  # 12x12
    moe_distributions: MOEDistributions
    runs_completed: int
    run_time_ms: float
    correction_recommendation: str


class RationaleRequest(SSSModel):
    coa_id: str


class RationaleResult(SSSModel):
    rationale_text: str
    generated_at: str


class LabRationaleRequest(SSSModel):
    run_result: LabRunResult


class InjectTracksRequest(SSSModel):
    count: int
    type: Literal["FEINT", "KINETIC", "MIXED", "DRONE"]


class CampaignSnapshot(SSSModel):
    bases: list[BaseTwinModel]
    threats: list[ThreatTwinModel]
    policy: PolicyTwinModel
    coas: list[COATwinModel]
    sim_time: float
    phase: str


class TheaterDelta(SSSModel):
    type: Literal["FULL_SNAPSHOT", "DELTA"]
    sim_time: float
    threats: list[ThreatTwinModel]
    bases: list[BaseTwinModel]
    phase: str
