"""
Force catalog loader — reads the open-source capability dataset and exposes
structured lookups for the simulation engine and API endpoints.
"""
from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Any

_CATALOG_PATH = os.path.join(os.path.dirname(__file__), "data", "force_catalog.json")


@lru_cache(maxsize=1)
def _load_catalog() -> dict:
    with open(_CATALOG_PATH, "r") as f:
        return json.load(f)


def get_catalog() -> dict:
    return _load_catalog()


def get_forces() -> dict:
    return get_catalog().get("forces", {})


def get_cross_cutting() -> dict:
    return get_catalog().get("cross_cutting_data", {})


def get_sources() -> list[dict]:
    return get_catalog().get("sources", [])


def get_sensitive_overrides() -> dict:
    return get_catalog().get("sensitive_field_overrides", {})


def get_declassified_context() -> dict:
    return get_catalog().get("declassified_public_intelligence_context", {})


def _extract_value(field: Any) -> Any:
    if field is None:
        return None
    if isinstance(field, dict) and "value" in field:
        return field["value"]
    return field


def _force_confidence(field: Any) -> str | None:
    if isinstance(field, dict) and "confidence" in field:
        return field["confidence"]
    return None


def _normalize_token(value: str) -> str:
    return "".join(ch.lower() for ch in value if ch.isalnum())


UNIT_PLATFORM_ALIASES: dict[str, str] = {
    "JAS_39_Gripen_C_D": "GRIPEN_CD",
    "JAS_39E_Gripen": "GRIPEN_E",
    "F_35A_B": "F_35",
    "Su_35S_Flanker_E": "SU_35",
    "Su_34_Fullback": "SU_34",
    "MiG_31BM_Foxhound": "MIG_31",
    "Tu_22M3_Backfire": "TU_22M3",
    "J_20_Mighty_Dragon": "J_20",
    "J_16": "J_16",
    "J_10C": "J_10C",
    "H_6K_N_bomber": "H_6K",
    "KJ_500_AEW": "KJ_500",
    "S_400_Triumf": "S_400",
    "Patriot_PAC_3_Swedish_Lv_103": "PATRIOT",
    "Patriot_PAC_3_MSE": "PATRIOT",
    "NASAMS": "NASAMS",
    "IRIS_T_SLS_RBS_98": "IRIS_T_SLS",
    "IRIS_T_SLM": "IRIS_T_SLS",
    "RBS_70_and_RBS_70_NG": "RBS_70_NG",
    "RBS_23_BAMSE": "BAMSE",
    "Kalibr_3M_14": "KALIBR",
    "Iskander_M_9K720": "ISKANDER",
    "Shahed_136": "SHAHED_136",
    "Orlan_10": "ORLAN_10",
    "F_16_Fighting_Falcon_NATO": "F_16",
    "Eurofighter_Typhoon": "EUROFIGHTER",
    "E_3_Sentry_AWACS": "E_3_SENTRY",
}


def _flat_unit(unit: dict) -> dict:
    flat: dict = {}
    for key, val in unit.items():
        if isinstance(val, dict) and "value" in val:
            flat[key] = val["value"]
            flat[f"{key}_confidence"] = val.get("confidence")
            flat[f"{key}_releasability"] = val.get("releasability")
            flat[f"{key}_use_in_simulation"] = val.get("use_in_simulation")
        elif isinstance(val, dict):
            nested = _flat_unit(val)
            for nk, nv in nested.items():
                flat[f"{key}_{nk}"] = nv
        else:
            flat[key] = val
    return flat


def get_platform(platform_id: str | None) -> dict[str, Any] | None:
    if not platform_id:
        return None
    platform = PLATFORM_CATALOG.get(platform_id)
    if platform is None:
        return None
    return {"id": platform_id, **platform}


def _infer_threat_class(entry: dict[str, Any]) -> str:
    category_blob = " ".join(
        str(entry.get(key, "")) for key in ("_category", "_id", "_force")
    ).lower()
    if any(token in category_blob for token in ("drone", "uav", "loitering")):
        return "DRONE"
    if any(token in category_blob for token in ("missile", "gbad", "sam", "iskander", "kalibr", "kinzhal")):
        return "MISSILE"
    if any(token in category_blob for token in ("aircraft", "fighter", "bomber", "awacs", "air_units")):
        return "AIRCRAFT"
    return "UNKNOWN"


def resolve_platform_id(unit_id: str, entry: dict[str, Any] | None = None) -> str | None:
    if not unit_id:
        return None

    direct = UNIT_PLATFORM_ALIASES.get(unit_id)
    if direct:
        return direct

    normalized_unit_id = _normalize_token(unit_id)
    for alias, platform_id in UNIT_PLATFORM_ALIASES.items():
        if normalized_unit_id == _normalize_token(alias):
            return platform_id

    for platform_id, platform in PLATFORM_CATALOG.items():
        platform_tokens = {
            _normalize_token(platform_id),
            _normalize_token(str(platform.get("display_name", ""))),
        }
        if normalized_unit_id in platform_tokens:
            return platform_id
        if any(token and (token in normalized_unit_id or normalized_unit_id in token) for token in platform_tokens):
            return platform_id

    if entry:
        source_ids = entry.get("source_ids")
        if isinstance(source_ids, list):
            normalized_sources = " ".join(_normalize_token(str(source_id)) for source_id in source_ids)
            for platform_id, platform in PLATFORM_CATALOG.items():
                platform_name = _normalize_token(str(platform.get("display_name", "")))
                if platform_name and platform_name in normalized_sources:
                    return platform_id

    return None


def enrich_unit_entry(entry: dict[str, Any]) -> dict[str, Any]:
    enriched = dict(entry)
    platform_id = resolve_platform_id(str(enriched.get("_id", "")), enriched)
    if platform_id:
        platform = get_platform(platform_id)
        enriched["_platform_id"] = platform_id
        enriched["_platform_profile"] = platform
        if platform is not None:
            enriched["_threat_class"] = platform.get("threat_class")
            enriched["_origin_country"] = platform.get("origin_country")
    else:
        enriched["_platform_id"] = None
        enriched["_platform_profile"] = None
        enriched["_threat_class"] = _infer_threat_class(enriched)
        enriched["_origin_country"] = None
    return enriched


def summarize_catalog() -> dict[str, int]:
    forces = get_forces()
    force_group_count = 0
    category_count = 0
    unit_count = 0

    for categories in forces.values():
        if not isinstance(categories, dict):
            continue
        force_group_count += 1
        for units in categories.values():
            if not isinstance(units, dict):
                continue
            category_count += 1
            unit_count += len(units)

    return {
        "unit_count": unit_count,
        "force_group_count": force_group_count,
        "category_count": category_count,
        "platform_count": len(PLATFORM_CATALOG),
        "source_count": len(get_sources()),
    }


def list_units(nation: str | None = None, category: str | None = None) -> list[dict]:
    forces = get_forces()
    results: list[dict] = []
    for force_key, categories in forces.items():
        if nation and nation.lower() not in force_key.lower():
            continue
        if not isinstance(categories, dict):
            continue
        for cat_key, units in categories.items():
            if category and category.lower() not in cat_key.lower():
                continue
            if not isinstance(units, dict):
                continue
            for unit_id, unit_data in units.items():
                entry = _flat_unit(unit_data)
                entry["_id"] = unit_id
                entry["_force"] = force_key
                entry["_category"] = cat_key
                results.append(enrich_unit_entry(entry))
    return results


def get_unit(unit_id: str) -> dict | None:
    forces = get_forces()
    for force_key, categories in forces.items():
        if not isinstance(categories, dict):
            continue
        for cat_key, units in categories.items():
            if not isinstance(units, dict):
                continue
            if unit_id in units:
                entry = _flat_unit(units[unit_id])
                entry["_id"] = unit_id
                entry["_force"] = force_key
                entry["_category"] = cat_key
                return enrich_unit_entry(entry)
    return None


EFFECTOR_SPECS_FROM_CATALOG: dict[str, dict] = {
    "interceptor_short": {
        "range_km": 9,
        "speed_km_s": 0.8,
        "pk": {"DRONE": 0.75, "MISSILE": 0.65, "AIRCRAFT": 0.55, "UNKNOWN": 0.50},
        "cost_units": 1,
        "catalog_ref": "RBS_70_and_RBS_70_NG",
        "note": "Range from RBS 70 NG public claim >9km; Pk values are test-condition estimates (low confidence).",
    },
    "interceptor_mid": {
        "range_km": 25,
        "speed_km_s": 1.2,
        "pk": {"DRONE": 0.55, "MISSILE": 0.80, "AIRCRAFT": 0.70, "UNKNOWN": 0.50},
        "cost_units": 4,
        "catalog_ref": "IRIS_T_SLS_RBS_98",
        "note": "Range from IRIS-T SLS public claim ~25km; Pk values are test-condition estimates (low confidence).",
    },
    "interceptor_long": {
        "range_km": 160,
        "speed_km_s": 1.0,
        "pk": {"DRONE": 0.30, "MISSILE": 0.85, "AIRCRAFT": 0.90, "UNKNOWN": 0.50},
        "cost_units": 12,
        "catalog_ref": "Patriot_PAC_3_Swedish_Lv_103",
        "note": "Range from Patriot PAC-3 MSE public claim ~160km; Pk values are test-condition estimates (low confidence).",
    },
}

PLATFORM_CATALOG: dict[str, dict] = {
    "GRIPEN_CD": {
        "display_name": "JAS 39 Gripen C/D",
        "nation": "SWEDEN",
        "type": "AIRCRAFT",
        "threat_class": "AIRCRAFT",
        "origin_country": "SWEDEN",
        "armaments": ["SHORT_RANGE_AAM", "LONG_RANGE_AAM", "BOMB"],
        "armament": "AIR_SUPERIORITY",
        "max_speed_kmh": 2469,
        "combat_radius_km": 800,
        "service_ceiling_m": 15240,
        "radar_range_km": 150,
    },
    "GRIPEN_E": {
        "display_name": "JAS 39E Gripen",
        "nation": "SWEDEN",
        "type": "AIRCRAFT",
        "threat_class": "AIRCRAFT",
        "origin_country": "SWEDEN",
        "armaments": ["SHORT_RANGE_AAM", "LONG_RANGE_AAM", "BOMB"],
        "armament": "AIR_SUPERIORITY",
        "max_speed_kmh": 2136,
        "combat_radius_km": 1300,
        "service_ceiling_m": 16000,
        "radar_range_km": 180,
    },
    "F_35": {
        "display_name": "F-35A/B",
        "nation": "NATO",
        "type": "AIRCRAFT",
        "threat_class": "AIRCRAFT",
        "origin_country": "NATO",
        "armaments": ["SHORT_RANGE_AAM", "LONG_RANGE_AAM", "BOMB", "CRUISE_MISSILE"],
        "armament": "AIR_SUPERIORITY",
        "max_speed_kmh": 1930,
        "combat_radius_km": 1093,
        "service_ceiling_m": 15240,
        "radar_range_km": 200,
    },
    "SU_35": {
        "display_name": "Su-35S Flanker-E",
        "nation": "RUSSIA",
        "type": "AIRCRAFT",
        "threat_class": "AIRCRAFT",
        "origin_country": "RUSSIA",
        "armaments": ["SHORT_RANGE_AAM", "LONG_RANGE_AAM", "BOMB", "CRUISE_MISSILE"],
        "armament": "KINETIC_STRIKE",
        "max_speed_kmh": 2500,
        "combat_radius_km": 1600,
        "service_ceiling_m": 18000,
        "radar_range_km": 200,
    },
    "SU_34": {
        "display_name": "Su-34 Fullback",
        "nation": "RUSSIA",
        "type": "AIRCRAFT",
        "threat_class": "AIRCRAFT",
        "origin_country": "RUSSIA",
        "armaments": ["SHORT_RANGE_AAM", "LONG_RANGE_AAM", "BOMB", "CRUISE_MISSILE"],
        "armament": "KINETIC_STRIKE",
        "max_speed_kmh": 1900,
        "combat_radius_km": 1100,
        "service_ceiling_m": 15000,
        "radar_range_km": 150,
    },
    "MIG_31": {
        "display_name": "MiG-31BM Foxhound",
        "nation": "RUSSIA",
        "type": "AIRCRAFT",
        "threat_class": "AIRCRAFT",
        "origin_country": "RUSSIA",
        "armaments": ["LONG_RANGE_AAM", "SHORT_RANGE_AAM"],
        "armament": "KINETIC_STRIKE",
        "max_speed_kmh": 3000,
        "combat_radius_km": 1450,
        "service_ceiling_m": 20600,
        "radar_range_km": 200,
    },
    "TU_22M3": {
        "display_name": "Tu-22M3 Backfire",
        "nation": "RUSSIA",
        "type": "AIRCRAFT",
        "threat_class": "AIRCRAFT",
        "origin_country": "RUSSIA",
        "armaments": ["CRUISE_MISSILE", "BOMB"],
        "armament": "KINETIC_STRIKE",
        "max_speed_kmh": 2320,
        "combat_radius_km": 2400,
        "service_ceiling_m": 13300,
        "radar_range_km": 150,
    },
    "J_20": {
        "display_name": "J-20 Mighty Dragon",
        "nation": "CHINA",
        "type": "AIRCRAFT",
        "threat_class": "AIRCRAFT",
        "origin_country": "CHINA",
        "armaments": ["SHORT_RANGE_AAM", "LONG_RANGE_AAM", "CRUISE_MISSILE"],
        "armament": "AIR_SUPERIORITY",
        "max_speed_kmh": 2100,
        "combat_radius_km": 2000,
        "service_ceiling_m": 20000,
        "radar_range_km": 180,
    },
    "J_16": {
        "display_name": "J-16",
        "nation": "CHINA",
        "type": "AIRCRAFT",
        "threat_class": "AIRCRAFT",
        "origin_country": "CHINA",
        "armaments": ["SHORT_RANGE_AAM", "LONG_RANGE_AAM", "BOMB", "CRUISE_MISSILE"],
        "armament": "KINETIC_STRIKE",
        "max_speed_kmh": 2200,
        "combat_radius_km": 1500,
        "service_ceiling_m": 17000,
        "radar_range_km": 160,
    },
    "S_400": {
        "display_name": "S-400 Triumph",
        "nation": "RUSSIA",
        "type": "GBAD",
        "threat_class": "MISSILE",
        "origin_country": "RUSSIA",
        "armaments": ["SAM_LONG_RANGE"],
        "armament": "KINETIC_STRIKE",
        "max_speed_kmh": 4800,
        "combat_radius_km": 400,
        "service_ceiling_m": 30000,
        "radar_range_km": 600,
    },
    "PATRIOT": {
        "display_name": "Patriot PAC-3",
        "nation": "NATO",
        "type": "GBAD",
        "threat_class": "MISSILE",
        "origin_country": "NATO",
        "armaments": ["SAM_LONG_RANGE"],
        "armament": "AIR_SUPERIORITY",
        "max_speed_kmh": 5000,
        "combat_radius_km": 160,
        "service_ceiling_m": 24000,
        "radar_range_km": 180,
    },
    "KALIBR": {
        "display_name": "Kalibr 3M-14",
        "nation": "RUSSIA",
        "type": "CRUISE_MISSILE",
        "threat_class": "MISSILE",
        "origin_country": "RUSSIA",
        "armaments": ["CRUISE_MISSILE"],
        "armament": "KINETIC_STRIKE",
        "max_speed_kmh": 925,
        "combat_radius_km": 1500,
        "service_ceiling_m": 30,
        "radar_range_km": 0,
    },
    "ISKANDER": {
        "display_name": "Iskander-M",
        "nation": "RUSSIA",
        "type": "BALLISTIC_MISSILE",
        "threat_class": "MISSILE",
        "origin_country": "RUSSIA",
        "armaments": ["BOMB"],
        "armament": "KINETIC_STRIKE",
        "max_speed_kmh": 7350,
        "combat_radius_km": 500,
        "service_ceiling_m": 50000,
        "radar_range_km": 0,
    },
    "SHAHED_136": {
        "display_name": "Shahed-136",
        "nation": "RUSSIA",
        "type": "DRONE",
        "threat_class": "DRONE",
        "origin_country": "RUSSIA",
        "armaments": ["BOMB"],
        "armament": "KINETIC_STRIKE",
        "max_speed_kmh": 185,
        "combat_radius_km": 2500,
        "service_ceiling_m": 4000,
        "radar_range_km": 0,
    },
    "ORLAN_10": {
        "display_name": "Orlan-10",
        "nation": "RUSSIA",
        "type": "DRONE",
        "threat_class": "DRONE",
        "origin_country": "RUSSIA",
        "armaments": ["NONE"],
        "armament": "ISR_SURVEILLANCE",
        "max_speed_kmh": 150,
        "combat_radius_km": 120,
        "service_ceiling_m": 5000,
        "radar_range_km": 0,
    },
    "GENERIC_DRONE": {
        "display_name": "Generic UAV",
        "nation": "OTHER",
        "type": "DRONE",
        "threat_class": "DRONE",
        "origin_country": "OTHER",
        "armaments": ["NONE"],
        "armament": "ISR_SURVEILLANCE",
        "max_speed_kmh": 150,
        "combat_radius_km": 50,
        "service_ceiling_m": 5000,
        "radar_range_km": 0,
    },
    "GENERIC_MISSILE": {
        "display_name": "Generic Missile",
        "nation": "OTHER",
        "type": "MISSILE",
        "threat_class": "MISSILE",
        "origin_country": "OTHER",
        "armaments": ["CRUISE_MISSILE"],
        "armament": "KINETIC_STRIKE",
        "max_speed_kmh": 1000,
        "combat_radius_km": 300,
        "service_ceiling_m": 15000,
        "radar_range_km": 0,
    },
    "UNKNOWN": {
        "display_name": "Unknown Platform",
        "nation": "OTHER",
        "type": "UNKNOWN",
        "threat_class": "UNKNOWN",
        "origin_country": "OTHER",
        "armaments": ["NONE"],
        "armament": None,
        "max_speed_kmh": 500,
        "combat_radius_km": 200,
        "service_ceiling_m": 10000,
        "radar_range_km": 0,
    },
}

THREAT_CLASS_VELOCITIES: dict[str, dict] = {
    "DRONE": {
        "typical_velocity_kmh": 150,
        "velocity_range_kmh": [80, 400],
    },
    "MISSILE": {
        "typical_velocity_kmh": 925,
        "velocity_range_kmh": [600, 7500],
    },
    "AIRCRAFT": {
        "typical_velocity_kmh": 850,
        "velocity_range_kmh": [500, 3000],
    },
    "UNKNOWN": {
        "typical_velocity_kmh": 500,
        "velocity_range_kmh": [100, 3000],
    },
}

DOCTRINE_PROFILES: dict[str, dict] = {
    "SWEDEN": {
        "style": "defensive_area_denial",
        "threat_intent_bias": {"probe": 0.15, "feint": 0.20, "strike": 0.30, "saturation": 0.25, "decoy": 0.10},
        "description": "Dispersed basing, shoot-and-scoot, total defense concept.",
    },
    "NATO": {
        "style": "air_centric_coalition",
        "threat_intent_bias": {"probe": 0.20, "feint": 0.25, "strike": 0.30, "saturation": 0.15, "decoy": 0.10},
        "description": "Air-centric coalition ops, SEAD/DEAD workflows, A2AD penetration playbooks.",
    },
    "RUSSIA": {
        "style": "hybrid_probing_escalation",
        "threat_intent_bias": {"probe": 0.10, "feint": 0.15, "strike": 0.40, "saturation": 0.25, "decoy": 0.10},
        "description": "PROBE→FEINT→SATURATION escalation, EW integration, drone-first reconnaissance.",
    },
    "CHINA": {
        "style": "a2ad_layered_saturation",
        "threat_intent_bias": {"probe": 0.10, "feint": 0.10, "strike": 0.35, "saturation": 0.35, "decoy": 0.10},
        "description": "A2AD layered defense, long-range missile saturation, drone swarm tactics.",
    },
}
