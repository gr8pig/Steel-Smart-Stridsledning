"""
RunPod serverless worker for deep-sim Monte Carlo inference.

Receives a scenario payload from the Steel API, runs a high-fidelity
Monte Carlo simulation using the RF model + ensemble engine, and returns
a full PredictedTrajectory-compatible result.

Input payload (from runpod_orchestrator.trigger_deep_sim):
    {
        "context": { ...SimulationContext payload... },
        "scenarioDigest": "...",
        "stableJobId": "deep-..."
    }

Output:
    Full PredictedTrajectory dict matching the /api/ml/predict response schema.
"""
from __future__ import annotations

import json
import sys
import traceback
from pathlib import Path

import numpy as np

# Ensure the api package is importable when running inside the worker container.
# The script lives at /app/api/ml/worker/handler.py, so we need /app on sys.path.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from api.ml.inference import EnsembleInference
from api.ml.models import SimulationContext
from api.ml.random_forest_model import train_or_load
from api.baseline_bundle import generate_bundle, resolve_scenario_keys


_rf_model = None
_inference_engine = None


def _get_engine() -> EnsembleInference:
    global _rf_model, _inference_engine
    if _inference_engine is None:
        _rf_model = train_or_load()
        _inference_engine = EnsembleInference(rf_model=_rf_model)
    return _inference_engine


def handler(event: dict) -> dict:
    """
    RunPod serverless handler entrypoint.

    Receives a job event, extracts the SimulationContext, and runs the
    full ensemble inference pipeline.
    """
    try:
        payload = event.get("input", event)
        task = payload.get("task")

        if task == "generate_baseline_bundle":
            scenario_keys = resolve_scenario_keys(payload.get("scenarioKeys") or payload.get("scenario_keys"))
            bundle = generate_bundle(
                _get_engine(),
                scenario_keys,
                provider_label="runpod",
            )
            return {
                "file_name": "baseline-all.json",
                "content": bundle,
            }

        context_data = payload.get("context", {})
        if isinstance(context_data, str):
            context_data = json.loads(context_data)

        context = SimulationContext.model_validate(context_data)
        engine = _get_engine()
        result = engine.predict_trajectory(context)

        return result.model_dump(by_alias=True, exclude_none=True)

    except Exception as exc:
        traceback.print_exc()
        return {
            "error": str(exc),
            "error_type": type(exc).__name__,
        }


if __name__ == "__main__":
    import runpod
    runpod.serverless.start({"handler": handler})
