"""
Boreal Decision Twin — initial scenario state.

Five bases per the implementation plan, plus 3 starter threat tracks.
Call seed() once at startup from main.py.
"""
from __future__ import annotations
import math
import random

from api.twin_engine import BaseState, ThreatState, campaign_twin


def _make_base(
    id: str, name: str, role: str, x: float, y: float,
    airframe: float, crew: float, fuel: float, fatigue: float, maint: float,
    inv_s: int, inv_m: int, inv_l: int,
    runway_cap: int, crew_cap: int, airframe_cap: int,
    runway_status: str = "OPERATIONAL",
    threat_exposure: float = 0.3,
    depletion_rate: float = 0.04,
) -> BaseState:
    return BaseState(
        id=id, name=name, role=role, x=x, y=y,
        airframe_availability=airframe, crew_availability=crew,
        fuel=fuel, fatigue=fatigue, maintenance_backlog=maint,
        interceptor_short=inv_s, interceptor_mid=inv_m, interceptor_long=inv_l,
        max_interceptor_short=inv_s, max_interceptor_mid=inv_m, max_interceptor_long=inv_l,
        runway_cap=runway_cap, crew_cap=crew_cap, airframe_cap=airframe_cap,
        runway_status=runway_status, threat_exposure=threat_exposure,
        depletion_rate=depletion_rate,
    )


def _spawn_threat(
    tid: str, tc: str, spawn_x: float, spawn_y: float,
    heading: float, velocity: float,
    target_base: BaseState,
    init_strike: float = 0.30,
) -> ThreatState:
    total = 1.0
    s = init_strike
    remaining = (total - s) / 4
    return ThreatState(
        id=tid, threat_class=tc,
        intent='PROBE', confidence=0.65,
        x=spawn_x, y=spawn_y,
        heading=heading, velocity=velocity,
        target_id=target_base.id,
        target_x=target_base.x,
        target_y=target_base.y,
        status='TRACKING',
        intent_distribution={
            'probe': remaining, 'feint': remaining,
            'strike': s, 'saturation': remaining, 'decoy': remaining,
        },
        classification_confidence=0.65,
        sensor_quality=1.0, jamming_probability=0.0,
    )


def _heading_toward(sx: float, sy: float, tx: float, ty: float) -> float:
    return math.degrees(math.atan2(tx - sx, ty - sy)) % 360


def seed() -> None:
    """Populate campaign_twin with Boreal scenario initial state."""
    random.seed(42)
    campaign_twin.sim_time = 0.0
    campaign_twin.phase = "INITIAL_ASSESSMENT"
    campaign_twin.coas = []
    campaign_twin.set_jamming(False, 0.0)

    # ── Five bases (from plan coordinates) ───────────────────────────────────
    bases = [
        _make_base(
            'BASE-1', 'Northern Vanguard', 'Forward Alert',
            198.3, 335.0,
            airframe=0.90, crew=0.85, fuel=0.90, fatigue=0.20, maint=0.15,
            inv_s=36, inv_m=12, inv_l=4,
            runway_cap=12, crew_cap=8, airframe_cap=10,
            threat_exposure=0.65, depletion_rate=0.05,
        ),
        _make_base(
            'BASE-2', 'Highridge Command', 'Orchestrator',
            838.3, 75.0,
            airframe=0.95, crew=0.95, fuel=1.00, fatigue=0.05, maint=0.05,
            inv_s=24, inv_m=24, inv_l=18,
            runway_cap=24, crew_cap=20, airframe_cap=22,
            threat_exposure=0.15, depletion_rate=0.02,
        ),
        _make_base(
            'BASE-3', 'Boreal Watch Post', 'Deep Sustainability',
            1158.3, 385.0,
            airframe=0.80, crew=0.75, fuel=0.60, fatigue=0.45, maint=0.30,
            inv_s=16, inv_m=10, inv_l=6,
            runway_cap=8, crew_cap=6, airframe_cap=6,
            threat_exposure=0.35, depletion_rate=0.06,
        ),
        _make_base(
            'BASE-4', 'Spear Point Base', 'Strike Ready',
            918.3, 835.0,
            airframe=0.88, crew=0.82, fuel=0.85, fatigue=0.25, maint=0.20,
            inv_s=20, inv_m=18, inv_l=8,
            runway_cap=16, crew_cap=14, airframe_cap=14,
            threat_exposure=0.45, depletion_rate=0.04,
        ),
        _make_base(
            'BASE-5', 'Southern Redoubt', 'Reserve',
            321.7, 1238.3,
            airframe=0.92, crew=0.90, fuel=0.95, fatigue=0.10, maint=0.10,
            inv_s=40, inv_m=20, inv_l=4,
            runway_cap=20, crew_cap=18, airframe_cap=18,
            threat_exposure=0.10, depletion_rate=0.03,
        ),
    ]
    campaign_twin.bases = bases

    # ── Update policy readiness floors for all 5 bases ────────────────────────
    campaign_twin.policy.readiness_floors = {
        'BASE-1': 0.60, 'BASE-2': 0.80, 'BASE-3': 0.50,
        'BASE-4': 0.65, 'BASE-5': 0.70,
    }

    # ── Base-to-base lookup shortcut ──────────────────────────────────────────
    b1, b2, b3, b4, b5 = bases

    # ── Three initial threat tracks from the north ────────────────────────────
    # T-0001: Missile inbound toward BASE-3 (Boreal Watch Post)
    t1 = _spawn_threat(
        'T-0001', 'MISSILE',
        spawn_x=1050.0, spawn_y=65.0,
        heading=_heading_toward(1050, 65, b3.x, b3.y),
        velocity=350.0,
        target_base=b3, init_strike=0.55,
    )

    # T-0002: Drone inbound toward BASE-1 (Northern Vanguard)
    t2 = _spawn_threat(
        'T-0002', 'DRONE',
        spawn_x=280.0, spawn_y=90.0,
        heading=_heading_toward(280, 90, b1.x, b1.y),
        velocity=120.0,
        target_base=b1, init_strike=0.30,
    )

    # T-0003: Aircraft on possible feint toward BASE-2 (Highridge Command)
    t3 = _spawn_threat(
        'T-0003', 'AIRCRAFT',
        spawn_x=750.0, spawn_y=30.0,
        heading=_heading_toward(750, 30, b2.x, b2.y),
        velocity=250.0,
        target_base=b2, init_strike=0.25,
    )
    t3.intent_distribution['feint'] = 0.35
    t3.intent_distribution['strike'] = 0.25

    campaign_twin.threats = [t1, t2, t3]
