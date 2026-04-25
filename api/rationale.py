"""
OpenRouter → Mistral Large rationale engine.

Primary model: mistral/mistral-large-2411 (European HQ, self-hostable at NSC/on-prem).
Fallback: deterministic text if OPENROUTER_API_KEY is unset or call fails.
"""
from __future__ import annotations
import logging
import os
from datetime import datetime, timezone

import httpx

from api.twin_engine import CampaignTwin

logger = logging.getLogger(__name__)


OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL_ID = "mistral/mistral-large-2411"
MODEL_DISPLAY = "Mistral Large 2411"


def _api_key() -> str:
    return os.getenv("OPENROUTER_API_KEY", "")


# ── COA rationale ─────────────────────────────────────────────────────────────

async def generate_coa_rationale(coa: dict, campaign: CampaignTwin) -> str:
    """Generate a 3-4 sentence COA rationale via Mistral Large."""
    active = campaign.get_active_threats()
    bases  = campaign.bases
    policy = campaign.policy

    dominant_intents = {}
    for t in active:
        di = t.intent
        dominant_intents[di] = dominant_intents.get(di, 0) + 1
    dominant = max(dominant_intents, key=dominant_intents.get) if dominant_intents else "UNKNOWN"

    base_summary = ", ".join(
        f"{b.name}: {b.readiness_score:.0%}" for b in bases
    )

    po = coa.get('projectedOutcome', {}) or coa.get('projected_outcome', {})
    assignments = coa.get('assignments', [])

    prompt = f"""You are the AI rationale engine for the Steel Smart Stridsledning air defense command system.
Explain in exactly 3-4 sentences why the {coa.get('type','BALANCED')} course of action is recommended, given:
- Active threats: {len(active)} tracks, dominant intent: {dominant}
- Blue resource state: {base_summary}
- Policy weights: Safety {policy.safety_weight:.0%}, Sustainability {policy.sustainability_weight:.0%}, Resilience {policy.resilience_weight:.0%}
- COA projected outcome: {po.get('intercepts', po.get('intercepts',0))} intercepts, {po.get('leakage',0)} leakage, AR={po.get('asymmetryRatio', po.get('asymmetry_ratio',0)):.1f}
- Assignments: {len(assignments)} effector-threat pairings
- Readiness delta: {po.get('readinessDeltaByBase', po.get('readiness_delta_by_base', {}))}

Emphasise: what makes this COA better than a simple "engage everything" legacy approach, and what future-wave risk it preserves against. Be specific, military-precise, and concise. Do not use bullet points."""

    key = _api_key()
    if not key:
        return _fallback_rationale(coa)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                OPENROUTER_API_URL,
                headers={
                    "Authorization":  f"Bearer {key}",
                    "HTTP-Referer":   "https://steel.boreal.demo",
                    "X-Title":        "Steel Smart Stridsledning",
                    "Content-Type":   "application/json",
                },
                json={
                    "model":    MODEL_ID,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 300,
                },
            )
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"].strip()
        logger.warning("Mistral COA rationale failed: HTTP %s — %s", resp.status_code, resp.text[:200])
        return _fallback_rationale(coa)
    except Exception as exc:
        logger.warning("Mistral COA rationale exception: %s", exc)
        return _fallback_rationale(coa)


def _fallback_rationale(coa: dict) -> str:
    coa_type = coa.get('type', 'BALANCED')
    po = coa.get('projectedOutcome', {}) or coa.get('projected_outcome', {})
    intercepts = po.get('intercepts', 0)
    leakage    = po.get('leakage', 0)
    ar = po.get('asymmetryRatio', po.get('asymmetry_ratio', 1.0))

    if coa_type == 'MAX_PROTECTION':
        return (
            f"The MAX PROTECTION COA maximises asset safety by engaging all {intercepts + leakage} "
            f"active threats with highest-Pk effector pairings, projecting {intercepts} intercepts and "
            f"zero leakage to critical assets. Unlike legacy rule-based fire control, this COA "
            f"accounts for effector scarcity across five bases and avoids over-concentration on "
            f"low-value decoy tracks. The {ar:.1f}× asymmetry ratio remains favourable when "
            "follow-on wave probability is low."
        )
    if coa_type == 'DEEP_SUSTAINABILITY':
        return (
            f"The DEEP SUSTAINABILITY COA conserves elite long-range interceptors for the predicted "
            f"follow-on saturation wave, accepting {leakage} leakage on lower-value tracks while "
            f"maintaining full readiness floors across forward bases. Legacy systems would exhaust "
            f"scarce effectors on this wave, leaving zero capacity for the next. "
            f"With robustness score {po.get('robustnessScore', po.get('robustness_score',0)):.0%}, "
            "this is the dominant choice under multi-wave planning horizons."
        )
    return (
        f"The BALANCED COA achieves {intercepts} intercepts with an asymmetry ratio of {ar:.1f}×, "
        "hedging mission success against long-term sustainability across all five Boreal bases. "
        "Where a legacy system would either over-engage (depleting reserves) or under-engage (risking "
        "leakage), this COA allocates effectors precisely according to threat priority and base "
        "reachability geometry. The result preserves sufficient interceptor depth for the next wave."
    )


# ── Lab-run rationale ─────────────────────────────────────────────────────────

async def generate_lab_rationale(run_result: dict, campaign: CampaignTwin) -> str:
    """Generate a 2-sentence brittleness explanation from a Monte Carlo result."""
    fragility  = run_result.get('fragilityPoint', 'Unknown')
    robustness = run_result.get('robustnessScore', 0.0)
    correction = run_result.get('correctionRecommendation', '')
    fail_p     = run_result.get('failureProbability', 0.0)

    prompt = f"""You are the AI analysis engine for the Steel Smart Stridsledning robustness lab.
In exactly 2 concise sentences, explain the brittleness finding:
- Robustness score: {robustness:.0%}
- Primary fragility point: {fragility}
- Failure probability: {fail_p:.0%}
- Recommended correction: {correction}

Write from the perspective of an intelligence analyst briefing a commander. Be direct and actionable."""

    key = _api_key()
    if not key:
        return f"Robustness analysis identifies {fragility} as the primary failure vector with {fail_p:.0%} failure probability. {correction}"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                OPENROUTER_API_URL,
                headers={
                    "Authorization": f"Bearer {key}",
                    "HTTP-Referer":  "https://steel.boreal.demo",
                    "X-Title":       "Steel Smart Stridsledning",
                    "Content-Type":  "application/json",
                },
                json={
                    "model":    MODEL_ID,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 150,
                },
            )
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"].strip()
        logger.warning("Mistral lab rationale failed: HTTP %s — %s", resp.status_code, resp.text[:200])
    except Exception as exc:
        logger.warning("Mistral lab rationale exception: %s", exc)

    return (
        f"Robustness analysis identifies {fragility} as the primary failure vector "
        f"({fail_p:.0%} failure probability under current red posture). {correction}"
    )
