"""Generate a single bundled baseline artifact for seeded Steel scenarios."""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from api.baseline_bundle import build_simulation_context, generate_bundle, resolve_scenario_keys
from api.main import ensemble_inference, runpod_orchestrator


async def _wait_for_runpod_job(job_id: str, *, max_polls: int = 60, poll_interval_seconds: int = 5) -> dict[str, Any]:
    for _poll in range(max_polls):
        await asyncio.sleep(poll_interval_seconds)
        status = await runpod_orchestrator.poll_status(job_id)
        if status["status"] in {"COMPLETED", "FAILED"}:
            return status

    return {
        "id": job_id,
        "status": "FAILED",
        "error": f"Timed out after {max_polls * poll_interval_seconds}s",
    }


def _write_json(file_path: Path, payload: dict[str, Any]) -> None:
    file_path.write_text(json.dumps(payload, indent=2, default=str) + "\n", encoding="utf-8")


def upload_outputs(output_dir: Path) -> list[str]:
    bucket_name = os.getenv("BASELINE_GCS_BUCKET") or os.getenv("GCP_BUCKET_NAME")
    if not bucket_name:
        return []

    try:
        from google.cloud import storage
    except ImportError as exc:
        raise RuntimeError(
            "google-cloud-storage is required to upload baseline artifacts"
        ) from exc

    prefix = os.getenv("BASELINE_GCS_PREFIX", "baseline-data").strip("/")
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    uploaded: list[str] = []

    for file_path in sorted(output_dir.glob("*.json")):
        remote_path = f"{prefix}/{file_path.name}" if prefix else file_path.name
        bucket.blob(remote_path).upload_from_filename(file_path)
        uploaded.append(f"gs://{bucket_name}/{remote_path}")

    return uploaded


async def generate_all_baselines(
    output_dir: Path,
    scenario_keys: list[str],
    *,
    allow_local_fallback: bool,
) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    results: dict[str, Any]

    print("\n" + "=" * 60)
    print("STEEL BASELINE INFERENCE GENERATOR")
    print("=" * 60)
    print(f"Output directory: {output_dir}")
    print(f"RunPod endpoint: {runpod_orchestrator.endpoint_id or 'NOT CONFIGURED'}")
    print(f"Allow local fallback: {allow_local_fallback}")
    print(f"Scenarios: {', '.join(scenario_keys)}")

    combined_path = output_dir / "baseline-all.json"

    if runpod_orchestrator.endpoint_id:
        payload = {
            "task": "generate_baseline_bundle",
            "scenarioKeys": scenario_keys,
        }
        stable_job_id = "baseline-bundle"
        try:
            await runpod_orchestrator.trigger_deep_sim(
                {
                    **payload,
                    "scenarioDigest": "baseline-bundle",
                    "stableJobId": stable_job_id,
                }
            )
            status = await _wait_for_runpod_job(stable_job_id)
            if status["status"] != "COMPLETED":
                raise RuntimeError(status.get("error") or "RunPod bundle job failed")
            output = status.get("output") or {}
            results = output.get("content") if isinstance(output, dict) and "content" in output else output
            if not isinstance(results, dict):
                raise RuntimeError("RunPod bundle job returned an unexpected payload")
        except Exception as exc:
            if not allow_local_fallback:
                raise RuntimeError(f"RunPod baseline bundle failed: {exc}") from exc
            print(f"RunPod bundle failed, falling back locally: {exc}")
            results = generate_bundle(ensemble_inference, scenario_keys, provider_label="local")
    else:
        if not allow_local_fallback:
            raise RuntimeError("RUNPOD_ENDPOINT_ID is required when local fallback is disabled")
        results = generate_bundle(ensemble_inference, scenario_keys, provider_label="local")

    _write_json(combined_path, results)

    uploaded_files = upload_outputs(output_dir)
    if uploaded_files:
        print("Uploaded artifacts:")
        for uri in uploaded_files:
            print(f"  {uri}")

    print("\nSummary:")
    for key, scenario_result in results["scenarios"].items():
        prediction_count = len(scenario_result["predictions"])
        provider = next(iter(scenario_result["predictions"].values()), {}).get("provider", results.get("provider", "unknown"))
        print(f"  {key}: {prediction_count} predictions via {provider}")

    return results


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate baseline inference data for seeded scenarios")
    parser.add_argument(
        "--output-dir",
        default=os.getenv("BASELINE_OUTPUT_DIR", "/tmp/baseline-data"),
        help="Local output directory for generated JSON artifacts",
    )
    parser.add_argument(
        "--scenarios",
        default="all",
        help="Comma-separated scenario keys (seed,a,b) or 'all'",
    )
    parser.add_argument(
        "--allow-local-fallback",
        action="store_true",
        help="Use local inference if RunPod is not configured or job submission fails",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    requested = None if args.scenarios == "all" else [key.strip() for key in args.scenarios.split(",") if key.strip()]
    scenario_keys = resolve_scenario_keys(requested)

    asyncio.run(
        generate_all_baselines(
            Path(args.output_dir),
            scenario_keys,
            allow_local_fallback=args.allow_local_fallback,
        )
    )


if __name__ == "__main__":
    main()
