"""
Steel Smart Stridsledning — initial scenario state.

Five bases per the implementation plan, plus 3 starter threat tracks.
Call seed() once at startup from main.py.
"""
from __future__ import annotations
import math
import random

from api.twin_engine import BaseState, ThreatState, campaign_twin
from api.force_catalog import PLATFORM_CATALOG


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
    platform: str | None = None,
    armaments: list[str] | None = None,
    armament: str | None = None,
    origin_country: str | None = None,
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
        platform=platform, armaments=armaments,
        armament=armament, origin_country=origin_country,
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
            'BASE-1', 'Northern Vanguard Base', 'Forward Alert',
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
        platform='KALIBR', armaments=['CRUISE_MISSILE'],
        armament='KINETIC_STRIKE', origin_country='RUSSIA',
    )

    # T-0002: Drone inbound toward BASE-1 (Northern Vanguard)
    t2 = _spawn_threat(
        'T-0002', 'DRONE',
        spawn_x=280.0, spawn_y=90.0,
        heading=_heading_toward(280, 90, b1.x, b1.y),
        velocity=120.0,
        target_base=b1, init_strike=0.30,
        platform='ORLAN_10', armaments=['NONE'],
        armament='ISR_SURVEILLANCE', origin_country='RUSSIA',
    )

    # T-0003: Aircraft on possible feint toward BASE-2 (Highridge Command)
    t3 = _spawn_threat(
        'T-0003', 'AIRCRAFT',
        spawn_x=750.0, spawn_y=30.0,
        heading=_heading_toward(750, 30, b2.x, b2.y),
        velocity=250.0,
        target_base=b2, init_strike=0.25,
        platform='SU_35', armaments=['SHORT_RANGE_AAM', 'LONG_RANGE_AAM'],
        armament='HYBRID_DECEPTION', origin_country='RUSSIA',
    )
    t3.intent_distribution['feint'] = 0.35
    t3.intent_distribution['strike'] = 0.25

    campaign_twin.threats = [t1, t2, t3]


def seed_scenario_a() -> None:
    """Scenario A: Boreal Strike — coordinated kinetic missile strike on Highridge Command."""
    random.seed(101)
    campaign_twin.reset()
    campaign_twin.phase = "KINETIC_STRIKE"
    campaign_twin.scenario_name = "Boreal Strike"

    bases = [
        _make_base(
            'BASE-1', 'Northern Vanguard Base', 'Forward Alert',
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
    campaign_twin.policy.readiness_floors = {
        'BASE-1': 0.60, 'BASE-2': 0.80, 'BASE-3': 0.50,
        'BASE-4': 0.65, 'BASE-5': 0.70,
    }
    campaign_twin.policy.safety_weight = 0.7
    campaign_twin.policy.sustainability_weight = 0.5
    campaign_twin.policy.resilience_weight = 0.6

    b2 = bases[1]

    threats = []
    for i in range(5):
        spawn_x = random.uniform(600, 1100)
        spawn_y = random.uniform(20, 80)
        t = _spawn_threat(
            f'SA-{i+1:03d}', 'MISSILE',
            spawn_x=spawn_x, spawn_y=spawn_y,
            heading=_heading_toward(spawn_x, spawn_y, b2.x, b2.y),
            velocity=450.0,
            target_base=b2,
            init_strike=0.55,
            platform='KALIBR', armaments=['CRUISE_MISSILE'],
            armament='KINETIC_STRIKE', origin_country='RUSSIA',
        )
        threats.append(t)

    campaign_twin.threats = threats


def seed_scenario_b() -> None:
    """Scenario B: Ghost Feint — 10 slow aircraft (PROBE/FEINT) that later redirect to STRIKE."""
    random.seed(202)
    campaign_twin.reset()
    campaign_twin.phase = "PROBE_DECEPTION"
    campaign_twin.scenario_name = "Ghost Feint"

    bases = [
        _make_base(
            'BASE-1', 'Northern Vanguard Base', 'Forward Alert',
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
    campaign_twin.policy.readiness_floors = {
        'BASE-1': 0.60, 'BASE-2': 0.80, 'BASE-3': 0.50,
        'BASE-4': 0.65, 'BASE-5': 0.70,
    }
    campaign_twin.policy.safety_weight = 0.5
    campaign_twin.policy.sustainability_weight = 0.6
    campaign_twin.policy.resilience_weight = 0.5

    targets = bases[:4]

    threats = []
    su_aircraft = ['SU_35', 'SU_34', 'MIG_31']
    for i in range(10):
        target = random.choice(targets)
        spawn_x = random.uniform(200, 1100)
        spawn_y = random.uniform(30, 120)
        platform = su_aircraft[i % len(su_aircraft)]
        plat_data = PLATFORM_CATALOG.get(platform, {})
        t = _spawn_threat(
            f'SB-{i+1:03d}', 'AIRCRAFT',
            spawn_x=spawn_x, spawn_y=spawn_y,
            heading=_heading_toward(spawn_x, spawn_y, target.x, target.y),
            velocity=250.0,
            target_base=target,
            init_strike=0.12,
            platform=platform,
            armaments=plat_data.get('armaments', ['SHORT_RANGE_AAM', 'LONG_RANGE_AAM']),
            armament='HYBRID_DECEPTION',
            origin_country='RUSSIA',
        )
        t.intent_distribution = {
            'probe': 0.45, 'feint': 0.25, 'strike': 0.10,
            'saturation': 0.10, 'decoy': 0.10,
        }
        threats.append(t)

    campaign_twin.threats = threats
