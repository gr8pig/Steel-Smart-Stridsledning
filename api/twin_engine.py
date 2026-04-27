"""
Digital Twin state engine.

All internal coordinates are in map units (1 unit ≈ 0.25 km).
Velocity is stored as display km/h; tick movement applies DEMO_SPEED_FACTOR
so tracks cross the theater in a few minutes of real time.
"""
from __future__ import annotations
import math
import random
import time
from dataclasses import dataclass, field
from typing import Optional

# ── Constants ─────────────────────────────────────────────────────────────────
MAP_KM_PER_UNIT = 0.25       # 1 map unit = 0.25 km  (1400-unit canvas ≈ 350 km)
DEMO_SPEED_FACTOR = 20        # multiplier so tracks cross map in minutes, not hours
TICK_INTERVAL_S = 2.0         # WebSocket tick every 2 seconds
IMMINENT_THRESHOLD_UNITS = 50.0 / MAP_KM_PER_UNIT  # 50 km → 200 map units
LEAK_THRESHOLD_UNITS = 15.0   # Threat within 15 map units of target → LEAKED

EFFECTOR_SPECS: dict[str, dict] = {
    'interceptor_short': {
        'range_km': 9,
        'speed_km_s': 0.8,
        'pk': {'DRONE': 0.75, 'MISSILE': 0.65, 'AIRCRAFT': 0.55, 'UNKNOWN': 0.50},
        'cost_units': 1,
        'catalog_ref': 'RBS_70_and_RBS_70_NG',
        'note': 'RBS 70 NG public range >9km; Pk values are test-condition estimates (low confidence).',
    },
    'interceptor_mid': {
        'range_km': 25,
        'speed_km_s': 1.2,
        'pk': {'DRONE': 0.55, 'MISSILE': 0.80, 'AIRCRAFT': 0.70, 'UNKNOWN': 0.50},
        'cost_units': 4,
        'catalog_ref': 'IRIS_T_SLS_RBS_98',
        'note': 'IRIS-T SLS public range ~25km; Pk values are test-condition estimates (low confidence).',
    },
    'interceptor_long': {
        'range_km': 160,
        'speed_km_s': 1.0,
        'pk': {'DRONE': 0.30, 'MISSILE': 0.85, 'AIRCRAFT': 0.90, 'UNKNOWN': 0.50},
        'cost_units': 12,
        'catalog_ref': 'Patriot_PAC_3_Swedish_Lv_103',
        'note': 'Patriot PAC-3 MSE public range ~160km; Pk values are test-condition estimates (low confidence).',
    },
}

# Readiness score weights (must sum to 1 for positive + negative terms)
_W = dict(airframe=0.20, crew=0.20, missiles=0.25, fuel=0.15, fatigue=0.10, maint=0.10)

# ── Theater Event ─────────────────────────────────────────────────────────────

EVENT_TYPE_INTERCEPT_SUCCESS = 'INTERCEPT_SUCCESS'
EVENT_TYPE_INTERCEPT_FAILURE = 'INTERCEPT_FAILURE'
EVENT_TYPE_BASE_STRIKE = 'BASE_STRIKE'
EVENT_TYPE_BASE_DEGRADED = 'BASE_DEGRADED'
EVENT_TYPE_BASE_DESTROYED = 'BASE_DESTROYED'
EVENT_TYPE_THREAT_IMMINENT = 'THREAT_IMMINENT'
EVENT_TYPE_PHASE_SHIFT = 'PHASE_SHIFT'

@dataclass
class TheaterEvent:
    id: str
    eventType: str
    simTime: float
    details: dict
    timestamp: float = field(default_factory=time.time)


# ── Helpers ───────────────────────────────────────────────────────────────────

def euclidean(x1: float, y1: float, x2: float, y2: float) -> float:
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)


def normalize_dict(d: dict[str, float]) -> dict[str, float]:
    total = sum(d.values())
    if total <= 0:
        n = len(d)
        return {k: 1.0 / n for k in d}
    return {k: v / total for k, v in d.items()}


# ── Base twin ─────────────────────────────────────────────────────────────────

@dataclass
class BaseState:
    id: str
    name: str
    role: str
    x: float
    y: float
    # Readiness component factors (0–1)
    airframe_availability: float
    crew_availability: float
    fuel: float
    fatigue: float               # penalty
    maintenance_backlog: float   # penalty
    # Live inventory
    interceptor_short: int
    interceptor_mid: int
    interceptor_long: int
    # Initial inventory (for missile_depth normalisation)
    max_interceptor_short: int
    max_interceptor_mid: int
    max_interceptor_long: int
    # Capacity
    runway_cap: int
    crew_cap: int
    airframe_cap: int
    # Metadata
    runway_status: str = "OPERATIONAL"
    threat_exposure: float = 0.3
    is_reserved: bool = False
    depletion_rate: float = 0.04

    # ── Computed properties ──────────────────────────────────────────────────

    @property
    def effector_cap(self) -> int:
        return (
            self.interceptor_short
            + self.interceptor_mid
            + self.interceptor_long
        )

    @property
    def missile_depth(self) -> float:
        max_total = (self.max_interceptor_short
                     + self.max_interceptor_mid
                     + self.max_interceptor_long)
        if max_total == 0:
            return 0.0
        return (self.interceptor_short
                + self.interceptor_mid
                + self.interceptor_long) / max_total

    @property
    def readiness_score(self) -> float:
        # Crew effectiveness degrades nonlinearly with fatigue
        crew_term = self.crew_availability * (1.0 - self.fatigue ** 1.4)
        # Fuel below 0.2 causes quadratic operational penalty (sortie prep stalls)
        fuel_term = self.fuel ** 2 if self.fuel < 0.2 else self.fuel
        r = (_W['airframe'] * self.airframe_availability
             + _W['crew'] * crew_term
             + _W['missiles'] * self.missile_depth
             + _W['fuel'] * fuel_term
             - _W['fatigue'] * self.fatigue
             - _W['maint'] * self.maintenance_backlog)
        return round(max(0.0, min(1.0, r)), 4)

    @property
    def sortie_capacity(self) -> int:
        return min(
            self.runway_cap,
            self.crew_cap,
            self.airframe_cap,
            max(1, self.effector_cap),
        )

    @property
    def recovery_time(self) -> str:
        hours = int(self.maintenance_backlog * 4)
        mins = int((self.maintenance_backlog * 4 - hours) * 60)
        return f"{hours:02d}:{mins:02d}:00"

    # ── Inventory helpers ────────────────────────────────────────────────────

    def get_inventory(self, effector_type: str) -> int:
        return {
            'interceptor_short': self.interceptor_short,
            'interceptor_mid':   self.interceptor_mid,
            'interceptor_long':  self.interceptor_long,
        }.get(effector_type, 0)

    def deduct_inventory(self, effector_type: str, count: int = 1) -> None:
        if effector_type == 'interceptor_short':
            self.interceptor_short = max(0, self.interceptor_short - count)
        elif effector_type == 'interceptor_mid':
            self.interceptor_mid = max(0, self.interceptor_mid - count)
        elif effector_type == 'interceptor_long':
            self.interceptor_long = max(0, self.interceptor_long - count)
        self.fatigue = min(1.0, self.fatigue + 0.04)


# ── Threat twin ───────────────────────────────────────────────────────────────

@dataclass
class ThreatState:
    id: str
    threat_class: str     # DRONE | MISSILE | AIRCRAFT | UNKNOWN
    intent: str           # PROBE | FEINT | STRIKE | SATURATION | DECOY
    confidence: float
    x: float
    y: float
    heading: float        # compass degrees (0=N, 90=E, 180=S, 270=W)
    velocity: float       # km/h (display value)
    target_id: str        # which base/asset this track threatens
    target_x: float
    target_y: float
    status: str           # IDENTIFIED | TRACKING | ENGAGED | NEUTRALIZED | LEAKED
    intent_distribution: dict[str, float]
    classification_confidence: float
    sensor_quality: float = 1.0
    jamming_probability: float = 0.0
    uncertainty_source: str = ""
    # Platform identification from force catalog
    platform: Optional[str] = None
    armaments: Optional[list[str]] = None
    armament: Optional[str] = None
    origin_country: Optional[str] = None
    engaged_by_base_id: Optional[str] = None
    engaged_effector_type: Optional[str] = None
    pending_engagement_pk: Optional[float] = None
    engagement_resolve_at: Optional[float] = None

    @property
    def time_to_target(self) -> float:
        """Real-physics time in seconds (NOT demo-scaled).
        Used for reachability checks and backend analytic calculations."""
        dist = euclidean(self.x, self.y, self.target_x, self.target_y)
        speed_units_s = (self.velocity / 3600.0) / MAP_KM_PER_UNIT  # real speed
        if speed_units_s <= 0:
            return 9999.0
        return dist / speed_units_s

    @property
    def display_time_to_target(self) -> float:
        """Demo-clock ETA used by the operator-facing WebSocket/UI payloads."""
        dist = euclidean(self.x, self.y, self.target_x, self.target_y)
        speed_units_s = ((self.velocity / 3600.0) * DEMO_SPEED_FACTOR) / MAP_KM_PER_UNIT
        if speed_units_s <= 0:
            return 9999.0
        return dist / speed_units_s

    def velocity_components(self, *, demo_scaled: bool = True) -> tuple[float, float]:
        """Returns (vx, vy) in map units per second."""
        speed_km_s = self.velocity / 3600.0
        if demo_scaled:
            speed_km_s *= DEMO_SPEED_FACTOR
        speed_units_s = speed_km_s / MAP_KM_PER_UNIT
        heading_rad = math.radians(self.heading)
        # screen coords: y increases southward, so north (hdg=0) → vy negative
        vx = math.sin(heading_rad) * speed_units_s
        vy = math.cos(heading_rad) * speed_units_s   # NOTE: positive = south in this map
        return vx, vy

    def project_position(self, seconds: float, *, demo_scaled: bool = False) -> tuple[float, float]:
        vx, vy = self.velocity_components(demo_scaled=demo_scaled)
        return self.x + vx * seconds, self.y + vy * seconds

    def estimated_time_to_target(self, target_x: float, target_y: float) -> float:
        dist = euclidean(self.x, self.y, target_x, target_y)
        speed_units_s = (self.velocity / 3600.0) / MAP_KM_PER_UNIT
        if speed_units_s <= 0:
            return 9999.0
        return dist / speed_units_s


# ── Policy state ──────────────────────────────────────────────────────────────

@dataclass
class PolicyState:
    id: str = "POL-01"
    name: str = "Standard Defense Posture"
    safety_weight: float = 0.7
    sustainability_weight: float = 0.5
    resilience_weight: float = 0.6
    readiness_floors: dict[str, float] = field(default_factory=dict)
    civilian_protected: bool = True
    reserve_interceptor_floor: int = 12
    min_readiness_threshold: float = 0.65
    critical_asset_priority: float = 0.75
    engagement_authority: str = "SEMI"


# ── Campaign twin (single source of truth) ────────────────────────────────────

class CampaignTwin:
    def __init__(self) -> None:
        self.bases: list[BaseState] = []
        self.threats: list[ThreatState] = []
        self.policy = PolicyState()
        self.coas: list[dict] = []
        self.sim_time: float = 0.0
        self.phase: str = "INITIAL_ASSESSMENT"
        self.scenario_name: str = "Boreal Sentinel I"
        self._jamming_active: bool = False
        self._jammer_severity: float = 0.0
        self.events: list[TheaterEvent] = []
        self._event_seq: int = 0

    @property
    def jammer_severity(self) -> float:
        return self._jammer_severity

    def _emit_event(self, event_type: str, details: dict) -> TheaterEvent:
        self._event_seq += 1
        evt = TheaterEvent(
            id=f"EVT-{self._event_seq:04d}",
            eventType=event_type,
            simTime=self.sim_time,
            details=details,
        )
        self.events.append(evt)
        return evt

    # ── Tick ─────────────────────────────────────────────────────────────────

    def tick(self) -> None:
        self.sim_time += TICK_INTERVAL_S
        self._move_threats()
        self._update_intent_distributions()
        self._check_threat_status()
        self._apply_resource_depletion()
        self._advance_phase()

    def _move_threats(self) -> None:
        for t in self.threats:
            if t.status in ('NEUTRALIZED', 'LEAKED'):
                continue
            vx, vy = t.velocity_components(demo_scaled=True)
            t.x += vx * TICK_INTERVAL_S
            t.y += vy * TICK_INTERVAL_S

    def _update_intent_distributions(self) -> None:
        active_bases = [b for b in self.bases if b.runway_status != 'DISABLED']
        for t in self.threats:
            if t.status in ('NEUTRALIZED', 'LEAKED'):
                continue
            self._bayesian_intent_update(t, active_bases)

    def _bayesian_intent_update(self, t: ThreatState, bases: list[BaseState]) -> None:
        if not bases:
            return

        # Apply jamming degradation first so observables reflect degraded sensor
        if self._jamming_active:
            t.sensor_quality = max(0.2, 1.0 - self._jammer_severity * 0.3)
            t.jamming_probability = self._jammer_severity
            t.uncertainty_source = "Jamming"

        v   = t.velocity
        ttt = t.time_to_target
        c   = t.classification_confidence

        # Per-class prior bias derived from platform physics
        class_bias: dict[str, dict[str, float]] = {
            'DRONE':    {'strike': 0.25, 'feint': 0.20, 'saturation': 0.35, 'probe': 0.10, 'decoy': 0.10},
            'MISSILE':  {'strike': 0.65, 'feint': 0.05, 'saturation': 0.10, 'probe': 0.05, 'decoy': 0.15},
            'AIRCRAFT': {'strike': 0.30, 'feint': 0.35, 'saturation': 0.10, 'probe': 0.15, 'decoy': 0.10},
            'UNKNOWN':  {'strike': 0.20, 'feint': 0.20, 'saturation': 0.20, 'probe': 0.20, 'decoy': 0.20},
        }
        bias = class_bias.get(t.threat_class, class_bias['UNKNOWN'])

        def g(x: float, mu: float, sigma: float) -> float:
            z = (x - mu) / sigma
            return math.exp(-0.5 * z * z)

        # Independent Gaussian likelihoods over velocity (km/h), TTT (s), confidence
        likelihoods = {
            'strike':     bias['strike']     * g(v, 450, 150) * g(ttt,  80, 55)  * g(c, 0.85, 0.12),
            'feint':      bias['feint']      * g(v, 220, 110) * g(ttt, 200, 90)  * g(c, 0.45, 0.18),
            'saturation': bias['saturation'] * g(v, 160,  70) * g(ttt, 140, 65)  * g(c, 0.65, 0.20),
            'probe':      bias['probe']      * g(v, 140,  75) * g(ttt, 330, 140) * g(c, 0.50, 0.20),
            'decoy':      bias['decoy']      * g(v,  90,  55) * g(ttt, 430, 180) * g(c, 0.28, 0.18),
        }
        likelihoods = {k: max(1e-9, v) for k, v in likelihoods.items()}

        # Bayesian posterior: prior × likelihood, normalised
        prior = t.intent_distribution
        unnorm = {k: prior.get(k, 0.2) * likelihoods[k] for k in likelihoods}
        posterior = normalize_dict(unnorm)

        t.intent_distribution = posterior
        dominant = max(posterior, key=posterior.get)
        t.intent = dominant.upper()
        t.classification_confidence = posterior[dominant]
        t.confidence = round(t.classification_confidence * t.sensor_quality, 3)

    def _check_threat_status(self) -> None:
        for t in self.threats:
            if t.status in ('NEUTRALIZED', 'LEAKED', 'ENGAGED'):
                continue
            dist = euclidean(t.x, t.y, t.target_x, t.target_y)
            if dist < LEAK_THRESHOLD_UNITS:
                t.status = 'LEAKED'
                self._handle_base_strike(t)
            elif dist < IMMINENT_THRESHOLD_UNITS and t.status == 'TRACKING':
                t.status = 'IDENTIFIED'
                base = next((b for b in self.bases if b.id == t.target_id), None)
                self._emit_event(EVENT_TYPE_THREAT_IMMINENT, {
                    'trackId': t.id,
                    'threatClass': t.threat_class,
                    'intent': t.intent,
                    'targetId': t.target_id,
                    'targetName': base.name if base else t.target_id,
                    'timeToTarget': round(t.display_time_to_target, 1),
                    'distance': round(dist, 1),
                })

    def _handle_base_strike(self, threat: ThreatState) -> None:
        base = next((b for b in self.bases if b.id == threat.target_id), None)
        if not base:
            return

        if threat.threat_class == 'MISSILE':
            damage_severity = 0.35
        elif threat.threat_class == 'AIRCRAFT':
            damage_severity = 0.25
        else:
            damage_severity = 0.15

        if threat.intent in ('STRIKE', 'SATURATION'):
            damage_severity *= 1.4
        elif threat.intent == 'FEINT':
            damage_severity *= 0.7

        base.airframe_availability = max(0.05, base.airframe_availability - damage_severity * 0.5)
        base.crew_availability = max(0.05, base.crew_availability - damage_severity * 0.3)
        base.fuel = max(0.05, base.fuel - damage_severity * 0.4)
        base.maintenance_backlog = min(1.0, base.maintenance_backlog + damage_severity * 0.3)

        short_destroyed = int(base.interceptor_short * damage_severity * 0.4)
        mid_destroyed = int(base.interceptor_mid * damage_severity * 0.4)
        long_destroyed = int(base.interceptor_long * damage_severity * 0.4)
        base.interceptor_short = max(0, base.interceptor_short - short_destroyed)
        base.interceptor_mid = max(0, base.interceptor_mid - mid_destroyed)
        base.interceptor_long = max(0, base.interceptor_long - long_destroyed)

        prev_status = base.runway_status
        if base.readiness_score < 0.25:
            base.runway_status = 'DISABLED'
        elif base.readiness_score < 0.50:
            base.runway_status = 'DEGRADED'

        event_details = {
            'trackId': threat.id,
            'threatClass': threat.threat_class,
            'intent': threat.intent,
            'baseId': base.id,
            'baseName': base.name,
            'damageSeverity': round(damage_severity, 3),
            'readinessAfter': round(base.readiness_score, 3),
            'runwayStatusAfter': base.runway_status,
            'interceptorsLost': {
                'short': short_destroyed,
                'mid': mid_destroyed,
                'long': long_destroyed,
            },
        }

        if base.runway_status == 'DISABLED' and prev_status != 'DISABLED':
            self._emit_event(EVENT_TYPE_BASE_DESTROYED, event_details)
        elif base.runway_status == 'DEGRADED' and prev_status != 'DEGRADED':
            self._emit_event(EVENT_TYPE_BASE_DEGRADED, event_details)
        else:
            self._emit_event(EVENT_TYPE_BASE_STRIKE, event_details)

    def _apply_resource_depletion(self) -> None:
        for base in self.bases:
            if base.runway_status == 'DISABLED':
                continue
            drain = base.depletion_rate * TICK_INTERVAL_S / 3600.0
            base.fuel = max(0.0, base.fuel - drain * 0.3)
            base.maintenance_backlog = min(1.0, base.maintenance_backlog + drain * 0.1)
            base.fatigue = min(1.0, base.fatigue + drain * 0.05)
            active_threats_for_base = sum(
                1 for t in self.threats
                if t.target_id == base.id and t.status in ('TRACKING', 'IDENTIFIED', 'ENGAGED')
            )
            if active_threats_for_base > 0:
                base.fuel = max(0.0, base.fuel - 0.001 * active_threats_for_base)
                base.fatigue = min(1.0, base.fatigue + 0.002 * active_threats_for_base)

    def _advance_phase(self) -> None:
        active_threats = [t for t in self.threats if t.status not in ('NEUTRALIZED', 'LEAKED')]
        leaked_threats = [t for t in self.threats if t.status == 'LEAKED']
        bases_degraded = sum(1 for b in self.bases if b.runway_status != 'OPERATIONAL')
        bases_destroyed = sum(1 for b in self.bases if b.runway_status == 'DISABLED')

        if bases_destroyed >= 2:
            new_phase = 'CRITICAL_FAILURE'
        elif bases_degraded >= 3 or leaked_threats and bases_degraded >= 2:
            new_phase = 'SUSTAINED_ENGAGEMENT'
        elif active_threats and leaked_threats:
            new_phase = 'KINETIC_STRIKE'
        elif active_threats:
            new_phase = 'INITIAL_ASSESSMENT'
        else:
            if not leaked_threats:
                new_phase = 'ALL_CLEAR'
            else:
                new_phase = 'SUSTAINED_ENGAGEMENT'

        if new_phase != self.phase:
            old_phase = self.phase
            self.phase = new_phase
            self._emit_event(EVENT_TYPE_PHASE_SHIFT, {
                'fromPhase': old_phase,
                'toPhase': new_phase,
                'activeThreats': len(active_threats),
                'leakedThreats': len(leaked_threats),
                'basesDegraded': bases_degraded,
                'basesDestroyed': bases_destroyed,
            })

    # ── Engagement ────────────────────────────────────────────────────────────

    def engage_track(self, track_id: str, base_id: str, effector_type: str) -> bool:
        threat = next((t for t in self.threats if t.id == track_id), None)
        base = next((b for b in self.bases if b.id == base_id), None)
        if not threat or not base:
            return False
        if threat.status in ('ENGAGED', 'NEUTRALIZED', 'LEAKED'):
            return False
        if base.is_reserved:
            return False
        if base.get_inventory(effector_type) <= 0:
            return False
        base.deduct_inventory(effector_type, 1)
        threat.status = 'ENGAGED'
        threat.engaged_by_base_id = base_id
        threat.engaged_effector_type = effector_type
        return True

    def queue_engagement_resolution(
        self,
        track_id: str,
        *,
        pk: float,
        resolve_after_s: float = TICK_INTERVAL_S,
    ) -> None:
        t = next((threat for threat in self.threats if threat.id == track_id), None)
        if not t:
            return
        t.pending_engagement_pk = max(0.01, min(0.99, pk))
        t.engagement_resolve_at = self.sim_time + max(TICK_INTERVAL_S, resolve_after_s)

    def resolve_engagements(self) -> None:
        for threat in self.threats:
            if threat.status != 'ENGAGED':
                continue
            if threat.engagement_resolve_at is None or self.sim_time < threat.engagement_resolve_at:
                continue

            base = next((b for b in self.bases if b.id == threat.engaged_by_base_id), None)
            eff_type = threat.engaged_effector_type
            if base and eff_type and eff_type in EFFECTOR_SPECS:
                spec = EFFECTOR_SPECS[eff_type]
                pk_base = spec['pk'].get(threat.threat_class, 0.50)
                ecm_factor = 1.0 - threat.jamming_probability
                f = base.fatigue
                if f < 0.3:
                    fatigue_penalty = f * 0.05
                elif f < 0.6:
                    fatigue_penalty = 0.015 + (f - 0.3) * 0.12
                else:
                    fatigue_penalty = 0.051 + (f - 0.6) ** 1.4
                pk = max(0.01, min(0.99,
                    pk_base * threat.sensor_quality * ecm_factor * (1.0 - fatigue_penalty)
                ))
            else:
                pk = threat.pending_engagement_pk or 0.5

            if random.random() <= pk:
                threat.status = 'NEUTRALIZED'
                self._emit_event(EVENT_TYPE_INTERCEPT_SUCCESS, {
                    'trackId': threat.id,
                    'threatClass': threat.threat_class,
                    'intent': threat.intent,
                    'baseId': threat.engaged_by_base_id or '',
                    'baseName': base.name if base else '',
                    'effectorType': eff_type or '',
                    'pk': round(pk, 3),
                    'simTime': self.sim_time,
                })
            else:
                threat.status = 'TRACKING'
                self._emit_event(EVENT_TYPE_INTERCEPT_FAILURE, {
                    'trackId': threat.id,
                    'threatClass': threat.threat_class,
                    'intent': threat.intent,
                    'baseId': threat.engaged_by_base_id or '',
                    'baseName': base.name if base else '',
                    'effectorType': eff_type or '',
                    'pk': round(pk, 3),
                    'simTime': self.sim_time,
                })
            threat.pending_engagement_pk = None
            threat.engagement_resolve_at = None

    # ── Track injection ───────────────────────────────────────────────────────

    def inject_tracks(self, count: int, track_type: str) -> list[ThreatState]:
        """Add new tracks from the north edge of the map."""
        from api.force_catalog import PLATFORM_CATALOG, THREAT_CLASS_VELOCITIES
        new_tracks: list[ThreatState] = []
        target_bases = [b for b in self.bases if b.runway_status != 'DISABLED']
        if not target_bases:
            return []

        for _ in range(count):
            tid = f"INJ-{random.randint(1000, 9999)}"
            while any(t.id == tid for t in self.threats):
                tid = f"INJ-{random.randint(1000, 9999)}"

            platform_key = None
            armaments_list = None
            armament_val = None
            origin_val = None

            if track_type == 'DRONE':
                tc = 'DRONE'
                vel = 120.0
                platform_key = random.choice(['ORLAN_10', 'SHAHED_136', 'GENERIC_DRONE'])
            elif track_type == 'KINETIC':
                tc = 'MISSILE'
                vel = 450.0
                platform_key = random.choice(['KALIBR', 'ISKANDER', 'GENERIC_MISSILE'])
            elif track_type == 'FEINT':
                tc = random.choice(['AIRCRAFT', 'DRONE'])
                platform_key = random.choice(['SU_35', 'SU_34', 'ORLAN_10']) if tc == 'AIRCRAFT' else random.choice(['ORLAN_10', 'GENERIC_DRONE'])
                vel = 250.0
            else:  # MIXED
                tc = random.choice(['DRONE', 'MISSILE', 'AIRCRAFT'])
                platform_key = random.choice(['SU_35', 'KALIBR', 'ORLAN_10', 'GENERIC_DRONE', 'GENERIC_MISSILE'])
                vel = random.choice([120.0, 250.0, 350.0, 450.0])

            if platform_key and platform_key in PLATFORM_CATALOG:
                plat = PLATFORM_CATALOG[platform_key]
                armaments_list = plat.get('armaments')
                armament_val = plat.get('armament')
                origin_val = plat.get('origin_country')

            target = random.choice(target_bases)
            spawn_x = random.uniform(200, 1100)
            spawn_y = random.uniform(30, 120)

            # Compute heading toward target
            dx, dy = target.x - spawn_x, target.y - spawn_y
            heading = math.degrees(math.atan2(dx, dy)) % 360

            init_dist = {
                'probe': 0.20, 'feint': 0.20, 'strike': 0.20,
                'saturation': 0.20, 'decoy': 0.20,
            }

            t = ThreatState(
                id=tid,
                threat_class=tc,
                intent='PROBE',
                confidence=0.6,
                x=spawn_x, y=spawn_y,
                heading=heading,
                velocity=vel,
                target_id=target.id,
                target_x=target.x,
                target_y=target.y,
                status='TRACKING',
                intent_distribution=dict(init_dist),
                classification_confidence=0.6,
                sensor_quality=1.0,
                jamming_probability=0.0,
                platform=platform_key,
                armaments=armaments_list,
                armament=armament_val,
                origin_country=origin_val,
            )
            new_tracks.append(t)

        self.threats.extend(new_tracks)
        return new_tracks

    # ── Reset ─────────────────────────────────────────────────────────────────

    def reset(self) -> None:
        """Clear all runtime state; caller must re-seed after calling this."""
        self.bases = []
        self.threats = []
        self.policy = PolicyState()
        self.coas = []
        self.sim_time = 0.0
        self.phase = "INITIAL_ASSESSMENT"
        self.scenario_name = "Boreal Sentinel I"
        self._jamming_active = False
        self._jammer_severity = 0.0
        self.events = []
        self._event_seq = 0

    # ── Policy helpers ────────────────────────────────────────────────────────

    def update_policy_weights(self, safety: float, sustainability: float,
                               resilience: float) -> None:
        self.policy.safety_weight = safety
        self.policy.sustainability_weight = sustainability
        self.policy.resilience_weight = resilience

    def set_jamming(self, active: bool, severity: float = 0.0) -> None:
        self._jamming_active = active
        self._jammer_severity = max(0.0, min(1.0, severity))
        for t in self.get_active_threats():
            t.sensor_quality = max(0.2, 1.0 - severity * 0.3) if active else 1.0
            t.jamming_probability = severity if active else 0.0

    def redirect_tracks(
        self,
        track_ids: list[str] | None = None,
        heading: float | None = None,
        velocity: float | None = None,
        target_id: str | None = None,
    ) -> list[ThreatState]:
        if track_ids is None:
            targets = self.get_active_threats()
        else:
            targets = [t for t in self.threats if t.id in track_ids and t.status not in ('NEUTRALIZED', 'LEAKED')]

        base_lookup = {b.id: b for b in self.bases}

        for t in targets:
            if velocity is not None:
                t.velocity = velocity

            dest_base = base_lookup.get(target_id) if target_id else None
            if dest_base:
                t.target_id = dest_base.id
                t.target_x = dest_base.x
                t.target_y = dest_base.y

            if heading is not None:
                t.heading = heading
            elif dest_base is not None or velocity is not None:
                t.heading = math.degrees(math.atan2(t.target_x - t.x, t.target_y - t.y)) % 360

        return targets

    def get_active_threats(self) -> list[ThreatState]:
        return [t for t in self.threats if t.status not in ('NEUTRALIZED', 'LEAKED')]

    # ── Readiness projections ─────────────────────────────────────────────────

    def get_readiness_projections(self, hours: list[int] | None = None) -> list[dict]:
        requested_hours = sorted(set(hours or [6, 12, 24]))
        projections = []
        for b in self.bases:
            r_now = b.readiness_score
            gamma_launch   = 0.028 + b.depletion_rate * 0.12
            gamma_scarce   = b.depletion_rate * 0.45
            gamma_recovery = 0.020 * max(0.2, 1.0 - b.maintenance_backlog)
            # λ controls how fast fatigue accumulates toward saturation
            lambda_fatigue = 0.008 + b.depletion_rate * 0.04

            projected: dict[int, float] = {}
            prev_hour = 0
            prev_readiness = r_now
            prev_fatigue = b.fatigue

            for hour in requested_hours:
                delta_h = max(1, hour - prev_hour)

                # Exponential fatigue growth: asymptotes at 1.0 over time
                new_fatigue = 1.0 - (1.0 - prev_fatigue) * math.exp(-lambda_fatigue * delta_h)

                # Maintenance backlog creates cascading failures above 0.5 threshold
                if b.maintenance_backlog > 0.5:
                    maint_penalty = 0.015 + (b.maintenance_backlog - 0.5) ** 2
                else:
                    maint_penalty = b.maintenance_backlog * 0.005

                burn       = gamma_launch * (delta_h / 6.0)
                scarce_burn = gamma_scarce * (delta_h / 12.0)
                recovery   = gamma_recovery * min(1.0, delta_h / 24.0)

                # Nonlinear collapse below 0.35: readiness degrades exponentially
                if prev_readiness < 0.35:
                    decay_rate = 0.012 * (0.35 - prev_readiness)
                    prev_readiness = prev_readiness * math.exp(-decay_rate * delta_h)
                else:
                    prev_readiness = max(0.0, min(1.0,
                        prev_readiness - burn - scarce_burn - maint_penalty + recovery
                    ))

                prev_fatigue = new_fatigue
                projected[hour] = prev_readiness
                prev_hour = hour

            r_6h  = projected.get(6, projected[min(projected)])
            le_12 = [h for h in projected if h <= 12]
            r_12h = projected.get(12, projected[max(le_12)] if le_12 else projected[min(projected)])
            r_24h = projected.get(24, projected[max(projected)])
            r_min = 0.30
            drop  = (r_now - r_24h) / 24.0
            life  = (r_now - r_min) / drop if drop > 0 and r_now > r_min else 72.0

            row = {
                'baseId':              b.id,
                'baseName':            b.name,
                'readinessNow':        round(r_now, 3),
                'readiness6h':         round(r_6h, 3),
                'readiness12h':        round(r_12h, 3),
                'readiness24h':        round(r_24h, 3),
                'lifeExpectancyHours': round(life, 1),
            }
            for hour, value in projected.items():
                row[f'readiness{hour}h'] = round(value, 3)
            projections.append(row)
        return projections

    # ── Serialisation helpers ─────────────────────────────────────────────────

    def snapshot(self) -> dict:
        return {
            'type':    'FULL_SNAPSHOT',
            'simTime': self.sim_time,
            'threats': [self._threat_dict(t) for t in self.threats],
            'bases':   [self._base_dict(b)   for b in self.bases],
            'phase':   self.phase,
            'scenarioName': self.scenario_name,
            'events':  [self._event_dict(e) for e in self.events],
        }

    def compute_delta(self) -> dict:
        new_events = [e for e in self.events if e.simTime >= self.sim_time - TICK_INTERVAL_S]
        return {
            'type':    'DELTA',
            'simTime': self.sim_time,
            'threats': [self._threat_dict(t) for t in self.threats],
            'bases':   [self._base_dict(b)   for b in self.bases],
            'phase':   self.phase,
            'scenarioName': self.scenario_name,
            'events':  [self._event_dict(e) for e in new_events],
        }

    def _event_dict(self, e: TheaterEvent) -> dict:
        return {
            'id':        e.id,
            'eventType': e.eventType,
            'simTime':   round(e.simTime, 1),
            'details':   e.details,
            'timestamp': e.timestamp,
        }

    def _threat_dict(self, t: ThreatState) -> dict:
        d = {
            'id':      t.id,
            'class':   t.threat_class,
            'intent':  t.intent,
            'confidence': round(t.confidence, 3),
            'timeToTarget': round(t.display_time_to_target, 1),
            'targetId': t.target_id,
            'geometry': {
                'x':       round(t.x, 2),
                'y':       round(t.y, 2),
                'heading': round(t.heading, 1),
                'velocity': t.velocity,
            },
            'status': t.status,
            'uncertaintySource': t.uncertainty_source or None,
            'intentDistribution': {
                k: round(v, 3) for k, v in t.intent_distribution.items()
            },
            'classificationConfidence': round(t.classification_confidence, 3),
            'sensorQuality':   round(t.sensor_quality, 3),
            'jammingProbability': round(t.jamming_probability, 3),
        }
        if t.platform is not None:
            d['platform'] = t.platform
        if t.armaments is not None:
            d['armaments'] = t.armaments
        if t.armament is not None:
            d['armament'] = t.armament
        if t.origin_country is not None:
            d['originCountry'] = t.origin_country
        return d

    def _base_dict(self, b: BaseState) -> dict:
        return {
            'id':       b.id,
            'name':     b.name,
            'role':     b.role,
            'readiness': b.readiness_score,
            'sortieCapacity': b.sortie_capacity,
            'runwayStatus':   b.runway_status,
            'airframesAvailable': b.airframe_cap,
            'crewsAvailable':     b.crew_cap,
            'crewFatigue':        round(b.fatigue, 3),
            'fuelStock':          round(b.fuel, 3),
            'depletionRate':      b.depletion_rate,
            'missileInventory': {
                'interceptorShort': b.interceptor_short,
                'interceptorMid':   b.interceptor_mid,
                'interceptorLong':  b.interceptor_long,
            },
            'recoveryTime':  b.recovery_time,
            'threatExposure': b.threat_exposure,
            'isReserved':    b.is_reserved,
        }


# ── Singleton (imported by main.py and solver/lab) ───────────────────────────
campaign_twin = CampaignTwin()
