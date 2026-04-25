"""
Reachability filter + Pareto COA solver.

Generates N=50 candidate COAs, scores on three objectives,
extracts the Pareto front, and selects the three representative COAs
(MAX_PROTECTION, BALANCED, DEEP_SUSTAINABILITY).

Designed to run in under 200 ms for demo responsiveness.
"""
from __future__ import annotations
import math
import random
import time

from api.twin_engine import (
    BaseState, ThreatState, CampaignTwin,
    EFFECTOR_SPECS, MAP_KM_PER_UNIT,
)

# Readiness contribution weight by base role for f_resilience scoring
_ROLE_READINESS_WEIGHTS: dict[str, float] = {
    'Orchestrator':        0.30,
    'Forward Alert':       0.20,
    'Strike Ready':        0.20,
    'Reserve':             0.15,
    'Deep Sustainability': 0.15,
}


# ── Geometry helpers ──────────────────────────────────────────────────────────

def _euclidean_km(ax: float, ay: float, bx: float, by: float) -> float:
    return math.sqrt((bx - ax) ** 2 + (by - ay) ** 2) * MAP_KM_PER_UNIT


def _normalize_weights(weights: dict | None) -> dict[str, float]:
    raw = {
        'safety': float((weights or {}).get('safety', 0.7)),
        'sustainability': float((weights or {}).get('sustainability', 0.5)),
        'resilience': float((weights or {}).get('resilience', 0.6)),
    }
    total = sum(raw.values()) or 1.0
    return {k: v / total for k, v in raw.items()}


def _threat_value(threat: ThreatState, campaign: CampaignTwin) -> float:
    class_weight = {
        'MISSILE': 1.00,
        'AIRCRAFT': 0.80,
        'DRONE': 0.45,
        'UNKNOWN': 0.55,
    }.get(threat.threat_class, 0.55)
    intent_weight = {
        'STRIKE': 1.00,
        'SATURATION': 0.75,
        'FEINT': 0.35,
        'PROBE': 0.25,
        'DECOY': 0.15,
    }.get(threat.intent, 0.40)
    target_base = next((b for b in campaign.bases if b.id == threat.target_id), None)
    target_priority = 0.5
    if target_base:
        role_weight = {
            'Orchestrator': 1.00,
            'Forward Alert': 0.85,
            'Strike Ready': 0.75,
            'Reserve': 0.70,
            'Deep Sustainability': 0.65,
        }.get(target_base.role, 0.60)
        target_priority = max(role_weight, target_base.threat_exposure)
    confidence_factor = 0.70 + threat.classification_confidence * 0.30

    # Urgency: exponential decay beyond 240 s real TTT; imminent threats score 2×
    ttt = threat.time_to_target
    if ttt < 60:
        urgency = 2.0
    elif ttt < 120:
        urgency = 1.5
    elif ttt < 240:
        urgency = 1.0
    else:
        urgency = max(0.30, math.exp(-(ttt - 240) / 300))

    return class_weight * intent_weight * target_priority * confidence_factor * urgency


def _candidate_intercept(base: BaseState, effector_type: str, threat: ThreatState) -> tuple[float, float, float] | None:
    spec = EFFECTOR_SPECS[effector_type]
    time_horizon = max(1.0, threat.time_to_target)
    steps = max(8, min(48, int(time_horizon // 20) + 8))
    best: tuple[float, float, float] | None = None

    for idx in range(1, steps + 1):
        intercept_t = time_horizon * idx / steps
        ix, iy = threat.project_position(intercept_t, demo_scaled=False)
        distance_km = _euclidean_km(base.x, base.y, ix, iy)
        if distance_km > spec['range_km']:
            continue
        missile_ttg = distance_km / spec['speed_km_s']
        slack = intercept_t - missile_ttg
        if slack < 0:
            continue
        candidate = (distance_km, missile_ttg, intercept_t)
        if best is None or slack < (best[2] - best[1]):
            best = candidate

    return best


def _base_remaining_inventory(base: BaseState) -> int:
    return base.interceptor_short + base.interceptor_mid + base.interceptor_long


def _guardrails_for(campaign: CampaignTwin, guardrails: dict | None) -> dict[str, float]:
    policy = campaign.policy
    return {
        'reserveInterceptorFloor': float((guardrails or {}).get('reserveInterceptorFloor', policy.reserve_interceptor_floor)),
        'minReadinessThreshold': float((guardrails or {}).get('minReadinessThreshold', policy.min_readiness_threshold)),
        'criticalAssetPriority': float((guardrails or {}).get('criticalAssetPriority', policy.critical_asset_priority)),
    }


# ── Reachability ──────────────────────────────────────────────────────────────

def is_reachable(base: BaseState, effector_type: str, threat: ThreatState) -> bool:
    """Check if base can intercept threat using the given effector type."""
    if base.get_inventory(effector_type) <= 0:
        return False
    if threat.status in ('NEUTRALIZED', 'LEAKED', 'ENGAGED'):
        return False

    return _candidate_intercept(base, effector_type, threat) is not None


def p_kill(base: BaseState, effector_type: str, threat: ThreatState) -> float:
    """Single-shot Pk with environmental degradations applied."""
    spec = EFFECTOR_SPECS[effector_type]
    pk_base = spec['pk'].get(threat.threat_class, 0.50)
    quality_factor = threat.sensor_quality
    ecm_factor = 1.0 - threat.jamming_probability
    # Nonlinear fatigue penalty: negligible below 0.3, steep above 0.6
    f = base.fatigue
    if f < 0.3:
        fatigue_penalty = f * 0.05
    elif f < 0.6:
        fatigue_penalty = 0.015 + (f - 0.3) * 0.12
    else:
        fatigue_penalty = 0.051 + (f - 0.6) ** 1.4
    return max(0.01, min(0.99, pk_base * quality_factor * ecm_factor * (1.0 - fatigue_penalty)))


# ── COA candidate generation ──────────────────────────────────────────────────

def _all_reachable_triples(
    campaign: CampaignTwin,
    guardrails: dict | None = None,
) -> list[tuple[BaseState, str, ThreatState, float, float]]:
    """Return [(base, effector_type, threat, pk)] for all reachable assignments."""
    triples = []
    active = campaign.get_active_threats()
    gr = _guardrails_for(campaign, guardrails)
    for base in campaign.bases:
        if base.is_reserved or base.runway_status == 'DISABLED':
            continue
        for eff_type in EFFECTOR_SPECS:
            for threat in active:
                if is_reachable(base, eff_type, threat):
                    if _base_remaining_inventory(base) - 1 < gr['reserveInterceptorFloor']:
                        continue
                    pk = p_kill(base, eff_type, threat)
                    threat_value = _threat_value(threat, campaign) * (
                        0.7 + 0.3 * gr['criticalAssetPriority']
                    )
                    triples.append((base, eff_type, threat, pk, threat_value))
    return triples


def _generate_candidates(
    campaign: CampaignTwin,
    weights: dict,
    guardrails: dict | None = None,
    n: int = 50,
) -> list[list[tuple[str, str, str, float]]]:
    """
    Generate n candidate assignment lists.
    Each candidate is [(base_id, effector_type, threat_id, pk), ...].
    """
    triples = _all_reachable_triples(campaign, guardrails=guardrails)
    if not triples:
        return []

    active = campaign.get_active_threats()
    candidates: list[list] = []
    norm_weights = _normalize_weights(weights)
    gr = _guardrails_for(campaign, guardrails)

    for _ in range(n):
        # Track remaining inventory (copy)
        inv: dict[tuple[str, str], int] = {}
        for base in campaign.bases:
            for eff in EFFECTOR_SPECS:
                inv[(base.id, eff)] = base.get_inventory(eff)

        # Per-threat shot count (max 2 shots per threat per COA)
        shots_on: dict[str, int] = {t.id: 0 for t in active}

        # Channel limit: max simultaneous engagements per base (= sortie_capacity/2)
        base_load: dict[str, int] = {b.id: 0 for b in campaign.bases}
        base_limit: dict[str, int] = {
            b.id: max(1, b.sortie_capacity // 2) for b in campaign.bases
        }

        triple_scores = []
        for base, eff, threat, pk, threat_value in triples:
            cost = EFFECTOR_SPECS[eff]['cost_units']
            readiness_margin = max(0.0, base.readiness_score - gr['minReadinessThreshold'])
            score = (
                norm_weights['safety'] * threat_value * pk
                + norm_weights['resilience'] * readiness_margin
                + norm_weights['sustainability'] * max(0.05, 1.0 / (1.0 + cost))
            )
            score *= random.uniform(0.75, 1.25)
            triple_scores.append((score, base, eff, threat, pk))
        shuffled = sorted(triple_scores, key=lambda item: -item[0])

        assignments: list[tuple[str, str, str, float]] = []
        for _, base, eff, threat, pk in shuffled:
            if inv[(base.id, eff)] <= 0:
                continue
            if base_load[base.id] >= base_limit[base.id]:
                continue
            if shots_on[threat.id] >= 2:
                continue
            remaining_at_base = sum(
                inv[(base.id, eff_name)] for eff_name in EFFECTOR_SPECS
            )
            if remaining_at_base - 1 < gr['reserveInterceptorFloor']:
                continue

            assignments.append((base.id, eff, threat.id, round(pk, 4)))
            inv[(base.id, eff)] -= 1
            base_load[base.id] += 1
            shots_on[threat.id] += 1

        if assignments:
            candidates.append(assignments)

    return candidates


# ── Threat convergence ────────────────────────────────────────────────────────

def _threat_convergence_penalties(active: list[ThreatState]) -> dict[str, float]:
    """
    Discount secondary threats that arrive at the same target within the same
    30-second window.  Only the first threat in each cluster carries full value;
    additional simultaneous threats are redundant (one leak suffices to damage
    the asset) and should not drive wasteful over-engagement.
    """
    from collections import defaultdict
    clusters: dict[tuple[str, int], list[str]] = defaultdict(list)
    for t in active:
        window = int(t.time_to_target / 30)
        clusters[(t.target_id, window)].append(t.id)

    penalties: dict[str, float] = {}
    for ids in clusters.values():
        for i, tid in enumerate(ids):
            penalties[tid] = 1.0 if i == 0 else max(0.30, 1.0 / len(ids))
    return penalties


# ── Multi-objective scoring ───────────────────────────────────────────────────

def _score_candidate(
    assignments: list[tuple[str, str, str, float]],
    campaign: CampaignTwin,
    weights: dict,
) -> dict:
    """
    Return a scored COA dict with objectives f_safety, f_sustain, f_resilience.
    """
    active = campaign.get_active_threats()
    threat_by_id = {t.id: t for t in active}
    base_by_id   = {b.id: b for b in campaign.bases}
    norm_weights = _normalize_weights(weights)

    # ── P(intercept) per threat using independent shots ──────────────────────
    miss_probs: dict[str, float] = {}
    for base_id, eff, tid, pk in assignments:
        miss_probs[tid] = miss_probs.get(tid, 1.0) * (1.0 - pk)

    intercept_probs = {tid: 1.0 - mp for tid, mp in miss_probs.items()}

    # ── f_safety: expected threat value neutralised (with convergence discount) ─
    convergence_penalties = _threat_convergence_penalties(active)
    threat_values = {
        tid: _threat_value(threat, campaign) * convergence_penalties.get(tid, 1.0)
        for tid, threat in threat_by_id.items()
    }
    f_safety = sum(
        threat_values.get(tid, 0.5) * prob for tid, prob in intercept_probs.items()
    )

    # ── f_sustain: total inventory cost ──────────────────────────────────────
    f_sustain = 0.0
    scarce_burn_by_base: dict[str, float] = {}
    launches_by_base: dict[str, int] = {}
    for base_id, eff, _, _ in assignments:
        cost_units = EFFECTOR_SPECS[eff]['cost_units']
        base = base_by_id[base_id]
        scarcity = 1.0 / max(1, base.get_inventory(eff))
        f_sustain += cost_units * (1.0 + scarcity)
        scarce_burn_by_base[base_id] = scarce_burn_by_base.get(base_id, 0.0) + scarcity
        launches_by_base[base_id] = launches_by_base.get(base_id, 0) + 1

    # ── Readiness delta per base ──────────────────────────────────────────────
    rd_delta: dict[str, float] = {}
    for base_id, eff, _, _ in assignments:
        cost = EFFECTOR_SPECS[eff]['cost_units']
        rd_delta[base_id] = rd_delta.get(base_id, 0.0) - 0.005 * cost - 0.008

    # ── f_resilience: role-weighted forward readiness after execution ─────────
    base_readiness_after = {}
    for b in campaign.bases:
        launches = launches_by_base.get(b.id, 0)
        scarce_burn = scarce_burn_by_base.get(b.id, 0.0)
        fatigue_inc = 0.01 * launches + b.fatigue * 0.008
        recovery = 0.02 * max(0.2, 1.0 - b.maintenance_backlog)
        projected = (
            b.readiness_score
            - 0.018 * launches
            - 0.035 * scarce_burn
            - fatigue_inc
            + recovery
        )
        base_readiness_after[b.id] = max(0.0, min(1.0, projected))
    # Weight by base role: Orchestrator degradation matters more than Reserve
    total_role_weight = sum(_ROLE_READINESS_WEIGHTS.get(b.role, 0.20) for b in campaign.bases)
    f_resilience = (
        sum(
            base_readiness_after[b.id] * _ROLE_READINESS_WEIGHTS.get(b.role, 0.20)
            for b in campaign.bases
        ) / max(total_role_weight, 1e-9)
        if base_readiness_after else 0.0
    )

    # ── Intercepts / leakage ─────────────────────────────────────────────────
    threatened_ids = {t.id for t in active}
    covered_ids = set(intercept_probs.keys())
    uncovered = threatened_ids - covered_ids

    intercepts = sum(1 for p in intercept_probs.values() if p > 0.50)
    leakage    = len(uncovered) + sum(1 for p in intercept_probs.values() if p <= 0.50)

    # ── Asymmetry ratio ───────────────────────────────────────────────────────
    blue_cost = max(1, f_sustain)
    asymmetry_ratio = round((intercepts / blue_cost) * 10, 2)

    # ── Robustness proxy (blend) ──────────────────────────────────────────────
    n_bases = max(1, len(campaign.bases))
    robustness = round(
        0.45 * (f_safety / max(0.01, sum(threat_values.values()) or 1.0))
        + 0.35 * f_resilience
        + 0.20 * max(0.0, 1.0 - f_sustain / 80),
        3,
    )
    confidence = round(
        min(0.99, 0.68 + 0.20 * (f_safety / max(0.01, sum(threat_values.values()) or 1.0))), 3
    )

    policy_fit = round(
        norm_weights['safety'] * min(1.0, f_safety / max(0.01, sum(threat_values.values()) or 1.0))
        + norm_weights['sustainability'] * max(0.0, 1.0 - f_sustain / 120.0)
        + norm_weights['resilience'] * f_resilience,
        4,
    )

    return {
        'assignments': [
            {'base_id': bid, 'effector_type': eff, 'threat_id': tid, 'pk': pk}
            for bid, eff, tid, pk in assignments
        ],
        'f_safety':       round(f_safety, 4),
        'f_sustain':      round(f_sustain, 4),
        'f_resilience':   round(f_resilience, 4),
        'intercepts':     intercepts,
        'leakage':        leakage,
        'cost':           int(f_sustain * 75_000),
        'readiness_delta_by_base': {k: round(v, 4) for k, v in rd_delta.items()},
        'asymmetry_ratio':  asymmetry_ratio,
        'robustness_score': robustness,
        'confidence':       confidence,
        'policy_fit':       policy_fit,
    }


# ── Pareto front ──────────────────────────────────────────────────────────────

def _pareto_front(scored: list[dict], epsilon: float = 0.02) -> list[dict]:
    """
    ε-dominance Pareto front over [f_safety↑, f_sustain↓, f_resilience↑].

    'other' ε-dominates 'coa' when other is not significantly worse on any
    objective AND is significantly better on at least one.  The ε gap filters
    near-identical candidates that differ only by noise, keeping the front lean.
    """
    front = []
    for coa in scored:
        dominated = False
        for other in scored:
            if other is coa:
                continue
            not_worse = (
                other['f_safety']     >= coa['f_safety']     - epsilon
                and other['f_sustain']    <= coa['f_sustain']    + epsilon
                and other['f_resilience'] >= coa['f_resilience'] - epsilon
            )
            significantly_better = (
                other['f_safety']     > coa['f_safety']     + epsilon
                or other['f_sustain']  < coa['f_sustain']    - epsilon
                or other['f_resilience'] > coa['f_resilience'] + epsilon
            )
            if not_worse and significantly_better:
                dominated = True
                break
        if not dominated:
            front.append(coa)
    return front


def _select_three(front: list[dict], weights: dict) -> tuple[dict, dict, dict]:
    """
    Select the three representative COAs from the Pareto front:
      MAX_PROTECTION     – highest f_safety
      DEEP_SUSTAINABILITY – highest f_resilience + lowest f_sustain
      BALANCED           – closest to centroid of objective vectors
    """
    if not front:
        raise ValueError("Empty Pareto front")

    def signature(coa: dict) -> tuple:
        assignments = coa.get('assignments', [])
        return tuple(sorted((a['base_id'], a['effector_type'], a['threat_id']) for a in assignments))

    used_signatures: set[tuple] = set()

    def choose_sorted(candidates: list[dict], key_fn, *, reverse: bool = False) -> dict:
        ordered = sorted(candidates, key=key_fn, reverse=reverse)
        for candidate in ordered:
            sig = signature(candidate)
            if sig not in used_signatures:
                used_signatures.add(sig)
                return candidate
        candidate = ordered[0]
        used_signatures.add(signature(candidate))
        return candidate

    max_prot = choose_sorted(front, key_fn=lambda c: c['f_safety'], reverse=True)

    deep_sust = choose_sorted(
        front,
        key_fn=lambda c: c['f_resilience'] - c['f_sustain'] / 100.0,
        reverse=True,
    )

    # Policy-weighted target point rather than an unweighted centroid.
    norm_weights = _normalize_weights(weights)
    max_s = max(c['f_safety']     for c in front) or 1.0
    min_u = min(c['f_sustain']    for c in front)
    max_u = max(c['f_sustain']    for c in front) or 1.0
    max_r = max(c['f_resilience'] for c in front) or 1.0

    def norm_obj(c: dict) -> tuple[float, float, float]:
        return (
            c['f_safety']     / max_s,
            1.0 - (c['f_sustain'] - min_u) / max(1e-9, max_u - min_u),
            c['f_resilience'] / max_r,
        )

    target = (
        norm_weights['safety'],
        norm_weights['sustainability'],
        norm_weights['resilience'],
    )

    def dist_to_target(c: dict) -> float:
        no = norm_obj(c)
        return sum((no[i] - target[i]) ** 2 for i in range(3)) ** 0.5

    balanced = choose_sorted(
        front,
        key_fn=lambda c: (dist_to_target(c), -c['policy_fit']),
    )

    return max_prot, balanced, deep_sust


def _ensure_distinct_candidates(
    front: list[dict],
    scored: list[dict],
    campaign: CampaignTwin,
    weights: dict,
) -> list[dict]:
    def signature(coa: dict) -> tuple:
        assignments = coa.get('assignments', [])
        return tuple(sorted((a['base_id'], a['effector_type'], a['threat_id']) for a in assignments))

    distinct: list[dict] = []
    seen: set[tuple] = set()

    for pool in (front, scored):
        for candidate in pool:
            sig = signature(candidate)
            if sig in seen:
                continue
            distinct.append(candidate)
            seen.add(sig)
            if len(distinct) >= 3:
                return distinct

    if not distinct:
        return front

    base_candidate = max(distinct, key=lambda c: c.get('policy_fit', 0.0))
    base_assignments = [
        (a['base_id'], a['effector_type'], a['threat_id'], a['pk'])
        for a in base_candidate.get('assignments', [])
    ]
    base_by_id = {b.id: b for b in campaign.bases}
    threat_by_id = {t.id: t for t in campaign.get_active_threats()}

    def assignment_priority(item: tuple[str, str, str, float]) -> float:
        base_id, eff, threat_id, pk = item
        threat = threat_by_id.get(threat_id)
        base = base_by_id.get(base_id)
        threat_value = _threat_value(threat, campaign) if threat else 0.0
        sustain_penalty = EFFECTOR_SPECS[eff]['cost_units']
        resilience_bonus = base.readiness_score if base else 0.0
        return threat_value * pk + resilience_bonus - 0.05 * sustain_penalty

    variants = [
        sorted(base_assignments, key=assignment_priority, reverse=True),
        sorted(base_assignments, key=assignment_priority, reverse=True)[:-1],
        sorted(base_assignments, key=lambda item: (EFFECTOR_SPECS[item[1]]['cost_units'], -assignment_priority(item))),
    ]

    for variant in variants:
        if not variant:
            continue
        rescored = _score_candidate(variant, campaign, weights=weights)
        sig = signature(rescored)
        if sig in seen:
            continue
        distinct.append(rescored)
        seen.add(sig)
        if len(distinct) >= 3:
            return distinct

    return distinct


# ── Public entry point ────────────────────────────────────────────────────────

def solve_coas(
    campaign: CampaignTwin,
    weights: dict,          # {safety, sustainability, resilience}
    guardrails: dict = None,
    n_candidates: int = 50,
) -> dict:
    """
    Run the full COA solve pipeline.
    Returns a dict matching COASolveResult schema.
    """
    t0 = time.perf_counter()
    active = campaign.get_active_threats()

    # Count all reachable triples for the response metadata
    all_triples = _all_reachable_triples(campaign, guardrails=guardrails)
    reachable_count = len(all_triples)

    if not active or not all_triples:
        # No threats or nothing reachable — return empty defensive COAs
        empty = _empty_coas(campaign)
        return {
            'coas': empty,
            'paretoFrontierSize': 0,
            'solveTimeMs': round((time.perf_counter() - t0) * 1000, 1),
            'threatCount': len(active),
            'reachableAssignments': 0,
        }

    # Generate candidates
    candidates = _generate_candidates(
        campaign,
        weights=weights,
        guardrails=guardrails,
        n=n_candidates,
    )
    if not candidates:
        empty = _empty_coas(campaign)
        return {
            'coas': empty,
            'paretoFrontierSize': 0,
            'solveTimeMs': round((time.perf_counter() - t0) * 1000, 1),
            'threatCount': len(active),
            'reachableAssignments': reachable_count,
        }

    # Score all candidates
    scored = [_score_candidate(c, campaign, weights=weights) for c in candidates]

    # Pareto front
    front = _pareto_front(scored)
    if not front:
        front = scored  # fallback: all non-dominated (shouldn't happen)
    front = _ensure_distinct_candidates(front, scored, campaign, weights)

    # Ensure we have at least 3 entries in the front (duplicate if needed)
    while len(front) < 3:
        front.append(front[-1])

    max_prot, balanced, deep_sust = _select_three(front, weights=weights)

    def _coa_model(scored_coa: dict, coa_type: str, coa_name: str) -> dict:
        return {
            'id':   f'COA-{coa_type[:3]}',
            'name': coa_name,
            'type': coa_type,
            'rationale': _rationale_stub(coa_type, scored_coa, campaign),
            'projectedOutcome': {
                'intercepts':  scored_coa['intercepts'],
                'leakage':     scored_coa['leakage'],
                'cost':        scored_coa['cost'],
                'readinessDeltaByBase': scored_coa['readiness_delta_by_base'],
                'asymmetryRatio':  scored_coa['asymmetry_ratio'],
                'robustnessScore': scored_coa['robustness_score'],
                'confidence':      scored_coa['confidence'],
            },
            'assignments': [
                {
                    'threatId':    a['threat_id'],
                    'baseId':      a['base_id'],
                    'effectorType': a['effector_type'],
                    'pk':          a['pk'],
                }
                for a in scored_coa['assignments']
            ],
        }

    coas = [
        _coa_model(max_prot,  'MAX_PROTECTION',    'Max Protection'),
        _coa_model(balanced,  'BALANCED',           'Balanced Approach'),
        _coa_model(deep_sust, 'DEEP_SUSTAINABILITY','Deep Sustainability'),
    ]

    return {
        'coas': coas,
        'paretoFrontierSize': len(front),
        'solveTimeMs': round((time.perf_counter() - t0) * 1000, 1),
        'threatCount': len(active),
        'reachableAssignments': reachable_count,
    }


def _rationale_stub(coa_type: str, coa: dict, campaign: CampaignTwin) -> str:
    """Short deterministic rationale (Gemini will override this)."""
    n_threats = len(campaign.get_active_threats())
    if coa_type == 'MAX_PROTECTION':
        return (
            f"Engages all {n_threats} active threats with highest-Pk effector pairings. "
            f"Prioritises asset safety at the cost of {coa['cost']:,} unit depletion. "
            "Recommended when follow-on wave risk is low."
        )
    if coa_type == 'BALANCED':
        return (
            f"Hedges {coa['intercepts']} intercepts against long-term readiness. "
            f"Asymmetry ratio {coa['asymmetry_ratio']:.1f}× preserves forward depth. "
            "Preferred posture under current sustainability policy."
        )
    return (
        f"Conserves elite interceptors; accepts {coa['leakage']} leakage. "
        f"Readiness floors maintained for predicted follow-on saturation wave. "
        "Highest robustness score under multi-wave scenario modelling."
    )


def _empty_coas(campaign: CampaignTwin) -> list[dict]:
    """Fallback COA list when no reachable assignments exist."""
    rd = {b.id: 0.0 for b in campaign.bases}
    base = {
        'intercepts': 0, 'leakage': len(campaign.get_active_threats()),
        'cost': 0, 'readinessDeltaByBase': rd,
        'asymmetryRatio': 0.0, 'robustnessScore': 0.5, 'confidence': 0.5,
    }
    return [
        {'id': f'COA-{t[:3]}', 'name': n, 'type': t,
         'rationale': 'No reachable engagements under current posture.',
         'projectedOutcome': base, 'assignments': []}
        for t, n in [
            ('MAX_PROTECTION',    'Max Protection'),
            ('BALANCED',          'Balanced Approach'),
            ('DEEP_SUSTAINABILITY','Deep Sustainability'),
        ]
    ]
