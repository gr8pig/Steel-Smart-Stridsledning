"""
Steel Smart Stridsledning — FastAPI backend.

Run with:  uvicorn api.main:app --reload --port 8000
"""
from __future__ import annotations
import asyncio
import hashlib
import json
import math
import os
import random
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from typing import Annotated

from scipy.spatial import ConvexHull, QhullError
import numpy as np

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from api.twin_engine import CampaignTwin, campaign_twin
from api.scenario_seed import seed
from api.scenario_seed import seed_scenario_a, seed_scenario_b, _heading_toward
from api.solver import is_reachable, p_kill, solve_coas
from api.lab import run_monte_carlo
from api.rationale import generate_coa_rationale, generate_lab_rationale
from api.ws_manager import manager
from api.decision_fabric import decision_fabric_state
from api.replay import replay_registry
from api.ml.models import (
    DeepSimJobMetadata,
    PredictedTrajectory,
    SimulationAsset,
    SimulationContext,
    TheaterStateVector,
)
from api.ml.inference import EnsembleInference
from api.ml.random_forest_model import train_or_load
from api.ml.runpod_client import RunPodOrchestrator, DeepSimJobRegistry, DeepSimJob
from api.ml.types import PolicyDeltas
from api.scenario_sim import run_scenario_sweep, run_scenario_comparison
from api.force_catalog import (
    get_catalog,
    get_forces,
    get_cross_cutting,
    get_sources,
    get_sensitive_overrides,
    get_declassified_context,
    list_units,
    get_unit,
    get_platform,
    summarize_catalog,
    PLATFORM_CATALOG,
    EFFECTOR_SPECS_FROM_CATALOG,
    THREAT_CLASS_VELOCITIES,
    DOCTRINE_PROFILES,
)
from api.models import (
    BaseTwinModel,
    CampaignSnapshot,
    COASolveResult,
    DecisionFabricTwin,
    EngageRequest,
    EngagementResult,
    LabRunResult,
    PolicyUpdateRequest,
    PolicyUpdateResponse,
    PolicyTwinModel,
    ReadinessProjectionPoint,
    RedirectTracksRequest,
    RationaleResult,
    ScenarioCompareRequest,
    ScenarioSimRequest,
    SetJammingRequest,
    TheaterEventModel,
    ThreatTwinModel,
    TheaterDelta,
)

load_dotenv()

# ── ML Initialization ────────────────────────────────────────────────────────

rf_model = train_or_load()
ensemble_inference = EnsembleInference(rf_model=rf_model)
deep_sim_registry = DeepSimJobRegistry()
runpod_orchestrator = RunPodOrchestrator(registry=deep_sim_registry)

def _calculate_spatial_density(threats: list) -> float:
    """
    Calculates the spatial density of a list of threats.
    
    Uses the volume of the convex hull of the threats' coordinates.
    Falls back to a linear calculation if there are fewer than 3 threats
    or if the points are collinear (raising a QhullError).
    """
    if len(threats) < 3:
        return float(len(threats)) / 10.0 # Fallback
    points = np.array([[t.x, t.y] for t in threats])
    try:
        hull = ConvexHull(points)
        area = hull.volume if hull.volume > 0 else 1.0
        return len(threats) / area
    except QhullError:
        return float(len(threats)) / 10.0

def vectorize_theater_state(policy_deltas: PolicyDeltas = None) -> TheaterStateVector:
    """Converts current campaign_twin state into a ML state vector."""
    active_threats = campaign_twin.get_active_threats()
    avg_readiness = sum(b.readiness_score for b in campaign_twin.bases) / max(1, len(campaign_twin.bases))
    velocity_spread = 0.0
    if active_threats:
        velocities = [t.velocity for t in active_threats]
        velocity_spread = max(velocities) - min(velocities) if len(velocities) > 1 else 0.0

    # Simple cluster density calculation
    density = _calculate_spatial_density(active_threats)

    return TheaterStateVector(
        timestamp=datetime.now(timezone.utc).isoformat(),
        track_count=len(active_threats),
        avg_velocity=sum(t.velocity for t in active_threats) / max(1, len(active_threats)),
        cluster_density=density,
        base_readiness_mean=avg_readiness,
        jammer_intensity=campaign_twin.jammer_severity if hasattr(campaign_twin, 'jammer_severity') else 2.0,
        policy_deltas=policy_deltas or PolicyDeltas(),
        scenario_name=getattr(campaign_twin, "scenario_name", "Boreal Sentinel I"),
        phase=getattr(campaign_twin, "phase", "PRE-ENGAGEMENT"),
        track_velocity_spread=velocity_spread,
    )


def _parse_policy_deltas(body: dict) -> PolicyDeltas:
    deltas = body.get("policyDeltas") or body.get("policy_deltas")
    if isinstance(deltas, dict):
        return PolicyDeltas.model_validate(deltas)
    if "safety" in body or "sustainability" in body:
        return PolicyDeltas.model_validate({
            "safety": body.get("safety", 0.0),
            "sustainability": body.get("sustainability", 0.0),
        })
    return PolicyDeltas()


def _build_simulation_context(body: dict) -> SimulationContext:
    theater_payload = body.get("theater") or body.get("theater_state") or body.get("theaterState") or {}
    if not theater_payload:
        theater = vectorize_theater_state(_parse_policy_deltas(body))
    else:
        theater_payload = dict(theater_payload)
        if "policyDeltas" not in theater_payload and "policy_deltas" not in theater_payload:
            theater_payload["policyDeltas"] = _parse_policy_deltas(body).model_dump(by_alias=True)
        theater = TheaterStateVector.model_validate(theater_payload)

    assets_payload = body.get("assets") or body.get("units") or body.get("selectedAsset") or []
    if isinstance(assets_payload, dict):
        assets_payload = [assets_payload]

    assets: list[SimulationAsset] = []
    for asset in assets_payload:
        if isinstance(asset, SimulationAsset):
            assets.append(_enrich_simulation_asset(asset))
        elif isinstance(asset, dict):
            assets.append(_enrich_simulation_asset(SimulationAsset.model_validate(asset)))

    selected_asset_id = body.get("selectedAssetId") or body.get("selected_asset_id")
    horizon_minutes = body.get("horizonMinutes") or body.get("horizon_minutes") or [0, 5, 10, 15, 20, 25, 30]

    return SimulationContext(
        theater=theater,
        assets=assets,
        selected_asset_id=selected_asset_id,
        horizon_minutes=[int(v) for v in horizon_minutes],
        model_version=body.get("modelVersion") or body.get("model_version") or "synthetic-ensemble-v2",
        n_ensemble_members=int(body.get("nEnsembleMembers") or body.get("n_ensemble_members") or 7),
        n_runs=int(body.get("nRuns") or body.get("n_runs") or 1000),
    )


def _enrich_simulation_asset(asset: SimulationAsset) -> SimulationAsset:
    if not asset.platform:
        return asset

    platform = get_platform(asset.platform)
    if platform is None:
        return asset

    metadata = dict(asset.metadata)
    metadata.setdefault("catalogPlatformId", platform["id"])
    metadata.setdefault("catalogPlatformLabel", platform.get("display_name"))

    updates: dict[str, object] = {"metadata": metadata}

    if not asset.armaments:
        updates["armaments"] = list(platform.get("armaments") or [])
    if asset.armament is None and platform.get("armament"):
        updates["armament"] = platform["armament"]
    if asset.origin_country is None and platform.get("origin_country"):
        updates["origin_country"] = platform["origin_country"]
    if not asset.label or asset.label == asset.id:
        updates["label"] = str(platform.get("display_name") or asset.label)

    return asset.model_copy(update=updates)


def _scenario_digest(context: SimulationContext) -> str:
    payload = context.model_dump(by_alias=True, exclude_none=True)
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:16]

# ── Lifespan: seed + background tick ─────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    seed()
    decision_fabric_state.reset()
    replay_registry.reset()
    task = asyncio.create_task(_theater_tick_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


async def _theater_tick_loop() -> None:
    """Advances the simulation every 2 seconds and broadcasts to WS clients."""
    while True:
        await asyncio.sleep(2)
        campaign_twin.tick()
        campaign_twin.resolve_engagements()
        if manager.active_connections:
            delta = campaign_twin.compute_delta()
            await manager.broadcast(delta)


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Steel Smart Stridsledning API",
    version="1.0.0",
    lifespan=lifespan,
)

_cors_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:4200,http://localhost:4000")
_cors_origins = [o.strip() for o in _cors_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "sim_time": campaign_twin.sim_time,
        "bases": len(campaign_twin.bases),
        "threats": len(campaign_twin.threats),
        "ws_connections": len(manager.active_connections),
    }


# ── Twin read endpoints ───────────────────────────────────────────────────────

@app.get("/api/twins/campaign", response_model=CampaignSnapshot)
async def get_campaign():
    return {
        "bases":   [campaign_twin._base_dict(b)   for b in campaign_twin.bases],
        "threats": [campaign_twin._threat_dict(t) for t in campaign_twin.threats],
        "policy":  _policy_dict(),
        "coas":    campaign_twin.coas,
        "simTime": campaign_twin.sim_time,
        "phase":   campaign_twin.phase,
        "scenarioName": campaign_twin.scenario_name,
    }


@app.get("/api/twins/bases", response_model=list[BaseTwinModel])
async def get_bases():
    return [campaign_twin._base_dict(b) for b in campaign_twin.bases]


@app.get("/api/twins/threats", response_model=list[ThreatTwinModel])
async def get_threats():
    return [campaign_twin._threat_dict(t) for t in campaign_twin.threats]


@app.get("/api/twins/policy", response_model=PolicyTwinModel)
async def get_policy():
    return _policy_dict()


@app.get("/api/twins/decision-fabric", response_model=DecisionFabricTwin)
async def get_decision_fabric():
    return decision_fabric_state.build_twin(campaign_twin)


@app.get("/api/twins/events", response_model=list[TheaterEventModel])
async def get_events():
    return [campaign_twin._event_dict(e) for e in campaign_twin.events]


@app.post("/api/twins/policy", response_model=PolicyUpdateResponse)
async def update_policy(body: dict):
    request = PolicyUpdateRequest.model_validate(body or {})
    replayed_response = replay_registry.get("policy", request.client_action_id)
    if replayed_response is not None:
        return replayed_response

    weights = (
        request.policy_weights.model_dump(by_alias=True)
        if request.policy_weights is not None
        else {}
    )
    if weights:
        campaign_twin.update_policy_weights(
            weights.get("safety", campaign_twin.policy.safety_weight),
            weights.get("sustainability", campaign_twin.policy.sustainability_weight),
            weights.get("resilience", campaign_twin.policy.resilience_weight),
        )
    guardrails = request.guardrails.model_dump(by_alias=True) if request.guardrails else {}
    if guardrails:
        p = campaign_twin.policy
        p.civilian_protected       = guardrails.get("civilianProtected", p.civilian_protected)
        p.reserve_interceptor_floor= guardrails.get("reserveInterceptorFloor", p.reserve_interceptor_floor)
        p.min_readiness_threshold  = guardrails.get("minReadinessThreshold", p.min_readiness_threshold)
        p.engagement_authority     = guardrails.get("engagementAuthority", p.engagement_authority)
    response = {
        **_policy_dict(),
        "accepted": True,
        "replayed": False,
        "appliedAt": datetime.now(timezone.utc).isoformat(),
        "clientActionId": request.client_action_id,
    }
    return replay_registry.record("policy", request.client_action_id, response)


@app.post("/api/twins/engage", response_model=EngagementResult)
async def engage_track(body: dict):
    request = EngageRequest.model_validate(body or {})
    replayed_response = replay_registry.get("engage", request.client_action_id)
    if replayed_response is not None:
        return replayed_response

    track_id = request.track_id
    base_id = request.base_id
    effector_type = request.effector_type

    if not all([track_id, base_id, effector_type]):
        raise HTTPException(400, "trackId, baseId, effectorType required")

    threat = next((t for t in campaign_twin.threats if t.id == track_id), None)
    base = next((b for b in campaign_twin.bases if b.id == base_id), None)
    if not threat or not base:
        raise HTTPException(404, "Track or base not found")
    if base.is_reserved:
        raise HTTPException(422, "Base is currently reserved by policy guardrails")
    if (
        base.interceptor_short
        + base.interceptor_mid
        + base.interceptor_long
        - 1
        < campaign_twin.policy.reserve_interceptor_floor
    ):
        raise HTTPException(422, "Engagement would violate reserve interceptor floor")
    if not is_reachable(base, effector_type, threat):
        raise HTTPException(422, "Engagement geometry is not reachable")
    pk = p_kill(base, effector_type, threat)

    success = campaign_twin.engage_track(track_id, base_id, effector_type)
    if not success:
        raise HTTPException(422, "Engagement failed: track not found, base not found, or no inventory")
    campaign_twin.queue_engagement_resolution(track_id, pk=pk)
    response = {
        "success": True,
        "trackId": track_id,
        "newStatus": "ENGAGED",
        "pk": round(pk, 3),
        "inventoryRemaining": {
            "interceptorShort": base.interceptor_short if base else 0,
            "interceptorMid":   base.interceptor_mid   if base else 0,
            "interceptorLong":  base.interceptor_long  if base else 0,
        } if base else {},
        "accepted": True,
        "replayed": False,
        "appliedAt": datetime.now(timezone.utc).isoformat(),
        "clientActionId": request.client_action_id,
    }
    return replay_registry.record("engage", request.client_action_id, response)


@app.get("/api/twins/readiness/projection", response_model=list[ReadinessProjectionPoint])
async def readiness_projection(hours: Annotated[str | None, Query()] = None):
    parsed_hours: list[int] = []
    if hours:
        for part in hours.split(","):
            part = part.strip()
            if not part:
                continue
            try:
                parsed_hours.append(int(part))
            except ValueError:
                raise HTTPException(400, f"Invalid hours value: {part!r} — must be comma-separated integers")
    return campaign_twin.get_readiness_projections(parsed_hours or None)


@app.post("/api/twins/reset")
async def reset_campaign():
    scenario = "default"
    body_data = {}
    # Check for scenario parameter in request
    # (handled by FastAPI body parsing below, but we use a simpler approach)
    campaign_twin.reset()
    seed()
    decision_fabric_state.reset()
    replay_registry.reset()
    if manager.active_connections:
        await manager.broadcast(campaign_twin.snapshot())
    return {
        "status": "reset",
        "scenarioName": campaign_twin.scenario_name,
        "simTime": campaign_twin.sim_time,
        "bases": len(campaign_twin.bases),
        "threats": len(campaign_twin.threats),
    }


PREBUILT_SCENARIOS = [
    {"id": "boreal-sentinel-i", "name": "Boreal Sentinel I", "description": "Baseline scenario: 3 initial threats, standard policy weights", "phase": "INITIAL_ASSESSMENT", "threatCount": 3, "baseCount": 5},
    {"id": "boreal-strike", "name": "Boreal Strike", "description": "Coordinated kinetic missile strike on Highridge Command", "phase": "KINETIC_STRIKE", "threatCount": 5, "baseCount": 5},
    {"id": "ghost-feint", "name": "Ghost Feint", "description": "10 slow aircraft with probe/feint intent distributing across bases", "phase": "PROBE_DECEPTION", "threatCount": 10, "baseCount": 5},
]


@app.get("/api/twins/scenarios")
async def list_scenarios():
    vault = _load_scenario_vault()
    custom = [{"id": f"custom-{s['id']}", "name": s["name"], "description": "Drawing Board scenario", "phase": "SKETCH", "threatCount": len(s.get("units", [])), "baseCount": 5, "source": "drawing-board"} for s in vault]
    prebuilt = [{**s, "source": "prebuilt"} for s in PREBUILT_SCENARIOS]
    return prebuilt + custom


@app.post("/api/twins/scenario/{scenario_name}")
async def load_scenario(scenario_name: str):
    if scenario_name in ("boreal-sentinel-i", "default"):
        campaign_twin.reset()
        seed()
    elif scenario_name == "boreal-strike":
        seed_scenario_a()
    elif scenario_name == "ghost-feint":
        seed_scenario_b()
    elif scenario_name.startswith("custom-"):
        vault_id = scenario_name.removeprefix("custom-")
        vault = _load_scenario_vault()
        entry = next((s for s in vault if s["id"] == vault_id), None)
        if entry is None:
            raise HTTPException(404, f"Drawing Board scenario '{vault_id}' not found")
        campaign_twin.reset()
        _seed_from_drawing_board(entry)
    else:
        raise HTTPException(400, f"Unknown scenario: {scenario_name}. Available: boreal-sentinel-i, boreal-strike, ghost-feint, custom-{{id}}")

    decision_fabric_state.reset()
    replay_registry.reset()
    if manager.active_connections:
        await manager.broadcast(campaign_twin.snapshot())

    return {
        "status": "loaded",
        "scenario": scenario_name,
        "scenarioName": campaign_twin.scenario_name,
        "simTime": campaign_twin.sim_time,
        "bases": len(campaign_twin.bases),
        "threats": len(campaign_twin.threats),
    }


@app.post("/api/twins/inject-tracks")
async def inject_tracks(body: dict):
    count = int(body.get("count", 3))
    track_type = body.get("type", "MIXED")
    if track_type not in ("FEINT", "KINETIC", "MIXED", "DRONE"):
        raise HTTPException(400, "type must be FEINT | KINETIC | MIXED | DRONE")

    new_tracks = campaign_twin.inject_tracks(count, track_type)
    # Broadcast immediately so the map updates without waiting for next tick
    if manager.active_connections:
        await manager.broadcast(campaign_twin.compute_delta())

    return {"injected": len(new_tracks), "ids": [t.id for t in new_tracks]}


@app.post("/api/twins/redirect-tracks")
async def redirect_tracks(body: dict):
    request = RedirectTracksRequest.model_validate(body)
    track_ids = request.track_ids if request.track_ids else None
    redirected = campaign_twin.redirect_tracks(
        track_ids=track_ids,
        heading=request.heading,
        velocity=request.velocity,
        target_id=request.target_id,
    )
    if manager.active_connections:
        await manager.broadcast(campaign_twin.compute_delta())

    return {
        "redirected": len(redirected),
        "ids": [t.id for t in redirected],
        "applied": {
            "heading": request.heading,
            "velocity": request.velocity,
            "targetId": request.target_id,
        },
    }


@app.post("/api/twins/set-jamming")
async def set_jamming(body: dict):
    request = SetJammingRequest.model_validate(body)
    campaign_twin.set_jamming(active=request.active, severity=request.severity)
    if manager.active_connections:
        await manager.broadcast(campaign_twin.compute_delta())

    return {
        "jammingActive": request.active,
        "severity": request.severity,
        "affectedTracks": len(campaign_twin.get_active_threats()),
    }


# ── COA solver ────────────────────────────────────────────────────────────────

@app.post("/api/coa/solve", response_model=COASolveResult)
async def coa_solve(body: dict):
    weights = body.get("policyWeights") or body.get("policy_weights", {})
    guardrails = body.get("guardrails", {})

    result = solve_coas(
        campaign_twin,
        weights=weights,
        guardrails=guardrails,
    )
    # Cache the COAs on the campaign twin for rationale lookups
    campaign_twin.coas = result.get("coas", [])
    return result


# ── Monte Carlo lab ───────────────────────────────────────────────────────────

@app.post("/api/lab/run", response_model=LabRunResult)
async def lab_run(body: dict):
    coa_id         = body.get("coaId") or body.get("coa_id")
    red_model      = body.get("redModel") or body.get("red_model", "DECEPTIVE")
    jammer_sev     = int(body.get("jammerSeverity") or body.get("jammer_severity", 2))
    track_deg      = int(body.get("trackDegradation") or body.get("track_degradation", 1))
    n_runs         = int(body.get("nRuns") or body.get("n_runs", 500))

    if red_model not in ("DECEPTIVE", "SATURATION", "KINETIC"):
        raise HTTPException(400, "redModel must be DECEPTIVE | SATURATION | KINETIC")

    # Find the COA
    coa = next(
        (c for c in campaign_twin.coas if c.get("id") == coa_id),
        campaign_twin.coas[0] if campaign_twin.coas else {},
    )

    result = run_monte_carlo(
        coa=coa,
        campaign=campaign_twin,
        red_model=red_model,
        jammer_severity=jammer_sev,
        track_degradation=track_deg,
        n_runs=min(n_runs, 1000),
    )
    decision_fabric_state.set_latest_failure_probability(result.get("failureProbability"))
    return result


# ── Counterfactual Command Lab (ML) ───────────────────────────────────────────

@app.post("/api/ml/predict", response_model=PredictedTrajectory, response_model_by_alias=False)
async def ml_predict(body: dict):
    """Zero-latency fast-path prediction grounded in live theater state."""
    context = _build_simulation_context(body)
    return ensemble_inference.predict_trajectory(context)


@app.post("/api/ml/deep-sim", response_model=DeepSimJobMetadata, response_model_by_alias=False)
async def ml_deep_sim(body: dict):
    """Triggers a high-fidelity RunPod simulation for active learning."""
    context = _build_simulation_context(body)
    scenario_digest = _scenario_digest(context)
    stable_job_id = f"deep-{scenario_digest}"
    scenario_payload = {
        "context": context.model_dump(by_alias=True, exclude_none=True),
        "scenarioDigest": scenario_digest,
        "stableJobId": stable_job_id,
    }

    selected_asset_id = context.selected_asset_id or (context.assets[0].id if context.assets else None)

    if not runpod_orchestrator.endpoint_id:
        result = ensemble_inference.predict_trajectory(context)
        deep_sim_registry.register(DeepSimJob(
            job_id=stable_job_id,
            scenario_digest=scenario_digest,
            status="COMPLETED",
            context_payload=body,
            result=result.model_dump(by_alias=True, exclude_none=True),
        ))
        return {
            "status": "triggered",
            "job_id": stable_job_id,
            "provider": "local",
            "provider_job_id": None,
            "scenario_digest": scenario_digest,
            "model_version": context.model_version,
            "selected_asset_id": selected_asset_id,
            "asset_count": len(context.assets),
            "n_runs": context.n_runs,
            "trust_score": result.trust_score,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    try:
        provider_job_id = await runpod_orchestrator.trigger_deep_sim(scenario_payload)
        return {
            "status": "triggered",
            "job_id": stable_job_id,
            "provider": "runpod",
            "provider_job_id": provider_job_id,
            "scenario_digest": scenario_digest,
            "model_version": context.model_version,
            "selected_asset_id": selected_asset_id,
            "asset_count": len(context.assets),
            "n_runs": context.n_runs,
            "trust_score": ensemble_inference.predict_trajectory(context).trust_score,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        raise HTTPException(500, f"RunPod orchestration failed: {str(e)}")


@app.get("/api/ml/deep-sim/{job_id}/status")
async def ml_deep_sim_status(job_id: str):
    """Polls the status of a deep-sim job. Falls back to local inference when
    the job was triggered with provider='local' or RunPod is unavailable."""
    tracked = deep_sim_registry.get(job_id)

    if tracked is None:
        raise HTTPException(404, f"Job {job_id} not found")

    if tracked.status == "COMPLETED":
        return {
            "id": tracked.job_id,
            "status": "COMPLETED",
            "output": tracked.result,
        }

    if tracked.status == "FAILED":
        return {
            "id": tracked.job_id,
            "status": "FAILED",
            "error": tracked.error or "Unknown error",
        }

    if tracked.context_payload and not runpod_orchestrator.endpoint_id:
        context_data = tracked.context_payload
        try:
            context = _build_simulation_context(context_data)
        except Exception:
            context = None

        if context is not None:
            result = ensemble_inference.predict_trajectory(context)
            tracked.status = "COMPLETED"
            tracked.result = result.model_dump(by_alias=True, exclude_none=True)
            return {
                "id": tracked.job_id,
                "status": "COMPLETED",
                "output": tracked.result,
            }

    try:
        status_response = await runpod_orchestrator.poll_status(job_id)
        return status_response
    except Exception as e:
        return {
            "id": job_id,
            "status": "IN_PROGRESS",
            "error": f"Polling failed: {str(e)}",
        }


@app.post("/api/ml/enable")
async def ml_enable(body: dict | None = None):
    """Provision a RunPod serverless endpoint for deep-sim inference.

    If RUNPOD_ENDPOINT_ID is already set, returns the current configuration.
    Otherwise, creates a template and endpoint using the RunPod SDK.

    Accepts optional ``dockerImage`` in the body to override the default
    worker image (set via RUNPOD_WORKER_IMAGE env var or default).
    """
    if runpod_orchestrator.endpoint_id:
        return {
            "status": "active",
            "provider": "runpod",
            "endpoint_id": runpod_orchestrator.endpoint_id,
            "message": "RunPod endpoint already configured.",
        }

    api_key = os.getenv("RUNPOD_API_KEY")
    if not api_key:
        raise HTTPException(
            400,
            "RUNPOD_API_KEY must be set to provision a RunPod endpoint. "
            "Set it in your .env or Cloud Run secrets.",
        )

    docker_image = (body or {}).get("dockerImage")

    try:
        result = await runpod_orchestrator.provision_endpoint(docker_image=docker_image)
        return {
            "status": "provisioned",
            "provider": "runpod",
            "endpoint_id": result["endpoint_id"],
            "template_id": result["template_id"],
            "image": result["image"],
            "message": "RunPod endpoint provisioned successfully. Deep-sim jobs will now run on GPU.",
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to provision RunPod endpoint: {str(e)}")


@app.get("/api/ml/status")
async def ml_status():
    """Returns current ML provisioning status."""
    return {
        "provider": "runpod" if runpod_orchestrator.endpoint_id else "local",
        "endpoint_id": runpod_orchestrator.endpoint_id,
        "rf_model_loaded": rf_model is not None,
        "pending_jobs": len([j for j in deep_sim_registry._jobs.values() if j.status not in ("COMPLETED", "FAILED")]),
    }


@app.get("/api/ml/forest-structure")
async def forest_structure():
    if rf_model is None:
        raise HTTPException(503, "RF model not loaded")
    return rf_model.export_forest_structure()


@app.get("/api/ml/training-samples")
async def training_samples(n: int = Query(default=5000, ge=500, le=10000), perplexity: float = Query(default=30.0, ge=5.0, le=100.0)):
    if rf_model is None:
        raise HTTPException(503, "RF model not loaded")
    return rf_model.export_training_samples_tsne(n_samples=n, perplexity=perplexity)


# ── Scenario Simulation ──────────────────────────────────────────────────────

def _snapshot_twin() -> CampaignTwin:
    snapshot = CampaignTwin()
    snapshot.bases = list(campaign_twin.bases)
    snapshot.threats = list(campaign_twin.threats)
    snapshot.policy = campaign_twin.policy
    snapshot.coas = list(campaign_twin.coas)
    snapshot.sim_time = campaign_twin.sim_time
    snapshot.phase = campaign_twin.phase
    snapshot.scenario_name = campaign_twin.scenario_name
    snapshot._jamming_active = campaign_twin._jamming_active
    snapshot._jammer_severity = campaign_twin._jammer_severity
    return snapshot


def _load_scenario_twin(scenario_name: str) -> CampaignTwin:
    twin = CampaignTwin()
    if scenario_name == "boreal-strike":
        seed_scenario_a()
    elif scenario_name == "ghost-feint":
        seed_scenario_b()
    elif scenario_name == "current":
        return _snapshot_twin()
    else:
        raise HTTPException(400, f"Unknown scenario: {scenario_name}. Available: boreal-strike, ghost-feint, current")
    twin.bases = list(campaign_twin.bases)
    twin.threats = list(campaign_twin.threats)
    twin.policy = campaign_twin.policy
    twin.coas = list(campaign_twin.coas)
    twin.sim_time = campaign_twin.sim_time
    twin.phase = campaign_twin.phase
    twin.scenario_name = campaign_twin.scenario_name
    twin._jamming_active = campaign_twin._jamming_active
    twin._jammer_severity = campaign_twin._jammer_severity
    return twin


@app.post("/api/ml/scenario-sim")
async def scenario_sim(body: dict):
    request = ScenarioSimRequest.model_validate(body)
    policy_sweep = request.policy_sweep
    jammer_sweep = request.jammer_sweep

    if policy_sweep is None:
        policy_sweep = {
            "safety": [0.3, 0.5, 0.7],
            "sustainability": [0.3, 0.5, 0.7],
        }

    twin = _load_scenario_twin(request.scenario_name)

    result = run_scenario_sweep(
        twin=twin,
        inference=ensemble_inference,
        policy_sweep=policy_sweep,
        jammer_sweep=jammer_sweep,
        n_runs=request.n_runs,
    )
    return result


@app.post("/api/ml/scenario-compare")
async def scenario_compare(body: dict):
    request = ScenarioCompareRequest.model_validate(body)
    policy_sweep = request.policy_sweep
    jammer_sweep = request.jammer_sweep

    if policy_sweep is None:
        policy_sweep = {
            "safety": [0.3, 0.5, 0.7],
            "sustainability": [0.3, 0.5, 0.7],
        }

    original_scenario = getattr(campaign_twin, "scenario_name", "") or "Boreal Sentinel I"
    twin_a = _load_scenario_twin(request.scenario_a)
    twin_b = _load_scenario_twin(request.scenario_b)

    result = run_scenario_comparison(
        twin_a=twin_a,
        twin_b=twin_b,
        inference=ensemble_inference,
        policy_sweep=policy_sweep,
        jammer_sweep=jammer_sweep,
        n_runs=request.n_runs,
    )

    seed()
    decision_fabric_state.reset()
    if manager.active_connections:
        await manager.broadcast(campaign_twin.snapshot())

    return result


# ── LLM Rationale ─────────────────────────────────────────────────────────────

@app.post("/api/rationale/coa", response_model=RationaleResult)
async def rationale_coa(body: dict):
    coa_id = body.get("coaId") or body.get("coa_id")
    coa = next(
        (c for c in campaign_twin.coas if c.get("id") == coa_id),
        campaign_twin.coas[0] if campaign_twin.coas else None,
    )
    if coa is None:
        raise HTTPException(404, "COA not found — run /api/coa/solve first")

    text = await generate_coa_rationale(coa, campaign_twin)
    return {
        "rationaleText":  text,
        "generatedAt":    datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/rationale/lab-result", response_model=RationaleResult)
async def rationale_lab(body: dict):
    run_result = body.get("runResult") or body
    text = await generate_lab_rationale(run_result, campaign_twin)
    return {
        "rationaleText": text,
        "generatedAt":   datetime.now(timezone.utc).isoformat(),
    }


# ── WebSocket theater feed ────────────────────────────────────────────────────

@app.websocket("/ws/theater")
async def theater_ws(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send full snapshot on connect
        await manager.send_to(websocket, campaign_twin.snapshot())
        # Keep connection alive; the background tick broadcasts deltas
        while True:
            await websocket.receive_text()   # wait for ping / any client message
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


# ── Drawing Board scenario vault ──────────────────────────────────────────────

SCENARIO_VAULT_PATH = os.path.join(os.path.dirname(__file__), "data", "scenarios.json")


def _load_scenario_vault() -> list[dict]:
    if not os.path.exists(SCENARIO_VAULT_PATH):
        return []
    try:
        with open(SCENARIO_VAULT_PATH, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _save_scenario_vault(vault: list[dict]) -> None:
    os.makedirs(os.path.dirname(SCENARIO_VAULT_PATH), exist_ok=True)
    with open(SCENARIO_VAULT_PATH, "w") as f:
        json.dump(vault, f, indent=2)


DRAWING_UNIT_TYPE_MAP = {
    "AIRCRAFT": "AIRCRAFT",
    "DRONE": "DRONE",
    "DRONE_SWARM": "DRONE",
    "HELICOPTER": "AIRCRAFT",
    "INFANTRY": "UNKNOWN",
    "ARMOR": "UNKNOWN",
    "ARTILLERY": "MISSILE",
    "SPECIAL_FORCES": "UNKNOWN",
    "SHIP_DESTROYER": "AIRCRAFT",
    "SHIP_CARRIER": "AIRCRAFT",
    "SHIP_SUBMARINE": "MISSILE",
    "SHIP_PATROL": "AIRCRAFT",
}


def _seed_from_drawing_board(entry: dict) -> None:
    from api.twin_engine import ThreatState
    units = entry.get("units", [])
    red_units = [u for u in units if u.get("side") == "RED"]
    seed()
    campaign_twin.scenario_name = entry.get("name", "Drawing Board")
    campaign_twin.phase = "INITIAL_ASSESSMENT"
    campaign_twin.threats = []
    for u in red_units:
        threat_class = DRAWING_UNIT_TYPE_MAP.get(u.get("type"), "UNKNOWN")
        velocity = u.get("speed", 150)
        target_base = random.choice(campaign_twin.bases) if campaign_twin.bases else None
        t = ThreatState(
            id=f"DB-{u.get('id', '')}",
            threat_class=threat_class,
            intent="PROBE",
            confidence=0.6,
            x=u.get("startX", 500),
            y=u.get("startY", 100),
            heading=0,
            velocity=velocity,
            target_id=target_base.id if target_base else "BASE-2",
            target_x=target_base.x if target_base else 838.3,
            target_y=target_base.y if target_base else 75.0,
            status="TRACKING",
            intent_distribution={"probe": 0.3, "feint": 0.2, "strike": 0.2, "saturation": 0.2, "decoy": 0.1},
            classification_confidence=0.55,
            sensor_quality=1.0,
            jamming_probability=0.0,
        )
        if target_base:
            t.heading = _heading_toward(t.x, t.y, target_base.x, target_base.y)
        campaign_twin.threats.append(t)


@app.get("/api/scenarios")
async def list_drawing_scenarios():
    return _load_scenario_vault()


@app.post("/api/scenarios")
async def save_drawing_scenario(body: dict):
    vault = _load_scenario_vault()
    entry_id = body.get("id") or f"scenario-{len(vault) + 1}"
    entry = {
        "id": entry_id,
        "name": body.get("name", "Untitled Scenario"),
        "units": body.get("units", []),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    existing = next((s for s in vault if s["id"] == entry_id), None)
    if existing:
        existing.update(entry)
    else:
        vault.append(entry)
    _save_scenario_vault(vault)
    return entry


@app.delete("/api/scenarios/{scenario_id}")
async def delete_drawing_scenario(scenario_id: str):
    vault = _load_scenario_vault()
    vault = [s for s in vault if s["id"] != scenario_id]
    _save_scenario_vault(vault)
    return {"status": "deleted", "id": scenario_id}


# ── Force Catalog ──────────────────────────────────────────────────────────────

@app.get("/api/force-catalog")
async def force_catalog_root():
    summary = summarize_catalog()
    return {
        "metadata": get_catalog().get("metadata", {}),
        "forceCount": summary["unit_count"],
        "unitCount": summary["unit_count"],
        "forceGroupCount": summary["force_group_count"],
        "categoryCount": summary["category_count"],
        "platforms": summary["platform_count"],
        "platformCount": summary["platform_count"],
        "sourceCount": summary["source_count"],
    }


@app.get("/api/force-catalog/forces")
async def force_catalog_forces(
    nation: str | None = None,
    category: str | None = None,
):
    return list_units(nation=nation, category=category)


@app.get("/api/force-catalog/forces/{unit_id}")
async def force_catalog_unit(unit_id: str):
    unit = get_unit(unit_id)
    if unit is None:
        raise HTTPException(404, f"Unit '{unit_id}' not found")
    return unit


@app.get("/api/force-catalog/platforms")
async def force_catalog_platforms():
    return PLATFORM_CATALOG


@app.get("/api/force-catalog/platforms/{platform_id}")
async def force_catalog_platform(platform_id: str):
    platform = PLATFORM_CATALOG.get(platform_id)
    if platform is None:
        raise HTTPException(404, f"Platform '{platform_id}' not found")
    return {"id": platform_id, **platform}


@app.get("/api/force-catalog/effectors")
async def force_catalog_effectors():
    return EFFECTOR_SPECS_FROM_CATALOG


@app.get("/api/force-catalog/velocities")
async def force_catalog_velocities():
    return THREAT_CLASS_VELOCITIES


@app.get("/api/force-catalog/doctrines")
async def force_catalog_doctrines():
    return DOCTRINE_PROFILES


@app.get("/api/force-catalog/cross-cutting")
async def force_catalog_cross_cutting():
    return get_cross_cutting()


@app.get("/api/force-catalog/sources")
async def force_catalog_sources():
    return get_sources()


@app.get("/api/force-catalog/sensitive-overrides")
async def force_catalog_sensitive_overrides():
    return get_sensitive_overrides()


@app.get("/api/force-catalog/declassified-context")
async def force_catalog_declassified():
    return get_declassified_context()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _policy_dict() -> dict:
    p = campaign_twin.policy
    return {
        "id":   p.id,
        "name": p.name,
        "weights": {
            "safety":         p.safety_weight,
            "sustainability": p.sustainability_weight,
            "resilience":     p.resilience_weight,
        },
        "readinessFloors": p.readiness_floors,
        "guardrails": {
            "civilianProtected":        p.civilian_protected,
            "reserveInterceptorFloor":  p.reserve_interceptor_floor,
            "minReadinessThreshold":    p.min_readiness_threshold,
            "criticalAssetPriority":    p.critical_asset_priority,
            "engagementAuthority":      p.engagement_authority,
        },
    }
