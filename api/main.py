"""
Steel Smart Stridsledning — FastAPI backend.

Run with:  uvicorn api.main:app --reload --port 8000
"""
from __future__ import annotations
import asyncio
import hashlib
import json
import os
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from typing import Annotated

from scipy.spatial import ConvexHull, QhullError
import numpy as np

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from api.twin_engine import campaign_twin
from api.scenario_seed import seed
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
from api.ml.runpod_client import RunPodOrchestrator
from api.ml.types import PolicyDeltas
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
    RationaleResult,
    ThreatTwinModel,
    TheaterDelta,
)

load_dotenv()

# ── ML Initialization ────────────────────────────────────────────────────────

ensemble_inference = EnsembleInference()
runpod_orchestrator = RunPodOrchestrator()

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
            assets.append(asset)
        elif isinstance(asset, dict):
            assets.append(SimulationAsset.model_validate(asset))

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
    campaign_twin.reset()
    seed()
    decision_fabric_state.reset()
    replay_registry.reset()
    if manager.active_connections:
        await manager.broadcast(campaign_twin.snapshot())
    return {
        "status": "reset",
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
    
    try:
        provider_job_id = await runpod_orchestrator.trigger_deep_sim(scenario_payload)
        selected_asset_id = context.selected_asset_id or (context.assets[0].id if context.assets else None)
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
