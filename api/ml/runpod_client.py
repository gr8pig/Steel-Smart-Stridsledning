import asyncio
import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

import runpod


@dataclass
class DeepSimJob:
    """In-memory tracker for a submitted deep-sim job."""

    job_id: str
    provider_job_id: str | None = None
    scenario_digest: str = ""
    status: str = "QUEUED"
    created_at: float = field(default_factory=time.time)
    context_payload: Dict[str, Any] = field(default_factory=dict)
    result: Dict[str, Any] | None = None
    error: str | None = None
    poll_count: int = 0


class DeepSimJobRegistry:
    """Thread-safe in-memory registry for deep-sim jobs."""

    def __init__(self, max_age_seconds: int = 3600):
        self._jobs: Dict[str, DeepSimJob] = {}
        self.max_age_seconds = max_age_seconds

    def register(self, job: DeepSimJob) -> None:
        self._jobs[job.job_id] = job
        self._evict()

    def get(self, job_id: str) -> DeepSimJob | None:
        return self._jobs.get(job_id)

    def update(self, job_id: str, **kwargs: Any) -> None:
        job = self._jobs.get(job_id)
        if job:
            for k, v in kwargs.items():
                setattr(job, k, v)

    def _evict(self) -> None:
        now = time.time()
        expired = [
            jid
            for jid, job in self._jobs.items()
            if now - job.created_at > self.max_age_seconds
        ]
        for jid in expired:
            del self._jobs[jid]


class RunPodOrchestrator:
    """
    Orchestrator for managing deep simulation jobs on RunPod.

    Prefers spot GPU instances for cost-efficiency (configured at the
    endpoint level). Tracks submitted jobs in an in-memory registry for
    status polling.
    """

    def __init__(self, registry: DeepSimJobRegistry | None = None):
        self.endpoint_id = os.getenv("RUNPOD_ENDPOINT_ID")
        if not self.endpoint_id:
            print("Warning: RUNPOD_ENDPOINT_ID not found in environment variables.")
        self.registry = registry or DeepSimJobRegistry()

    def _ensure_api_key(self) -> None:
        runpod.api_key = os.getenv("RUNPOD_API_KEY")

    async def trigger_deep_sim(self, scenario_data: Dict) -> str:
        """
        Submits a simulation job to a RunPod serverless endpoint.

        Returns the unique ID of the submitted job.
        """
        if not self.endpoint_id:
            raise ValueError("RUNPOD_ENDPOINT_ID must be configured to trigger simulations.")

        self._ensure_api_key()
        endpoint = runpod.Endpoint(self.endpoint_id)

        loop = asyncio.get_event_loop()
        job = await loop.run_in_executor(None, endpoint.run, scenario_data)

        stable_job_id = scenario_data.get("stableJobId", f"deep-{job.id}")
        self.registry.register(
            DeepSimJob(
                job_id=stable_job_id,
                provider_job_id=job.id,
                scenario_digest=scenario_data.get("scenarioDigest", ""),
                status="IN_PROGRESS",
                created_at=time.time(),
                context_payload=scenario_data.get("context", {}),
            )
        )
        return job.id

    async def run_sync(self, payload: Dict[str, Any], *, timeout_seconds: int = 600) -> Dict[str, Any]:
        """Run a synchronous job against the configured RunPod endpoint."""
        if not self.endpoint_id:
            raise ValueError("RUNPOD_ENDPOINT_ID must be configured to trigger simulations.")

        self._ensure_api_key()
        endpoint = runpod.Endpoint(self.endpoint_id)

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: endpoint.run_sync(payload, timeout=timeout_seconds),
        )

    async def poll_status(self, job_id: str) -> Dict[str, Any]:
        """
        Polls RunPod for the status of a submitted job.

        Returns a dict with:
          - id: the stable job ID
          - status: one of QUEUED, IN_PROGRESS, COMPLETED, FAILED
          - output: the job result (only when COMPLETED)
          - error: error message (only when FAILED)
        """
        tracked = self.registry.get(job_id)
        if tracked is None:
            return {"id": job_id, "status": "NOT_FOUND"}

        if tracked.status in ("COMPLETED", "FAILED"):
            return self._job_to_response(tracked)

        if not self.endpoint_id:
            tracked.status = "FAILED"
            tracked.error = "RUNPOD_ENDPOINT_ID not configured"
            return self._job_to_response(tracked)

        self._ensure_api_key()
        endpoint = runpod.Endpoint(self.endpoint_id)

        loop = asyncio.get_event_loop()
        runpod_job_status = await loop.run_in_executor(
            None, self._fetch_job_status, endpoint, tracked.provider_job_id
        )

        tracked.poll_count += 1
        rp_status = runpod_job_status.get("status", "").upper()

        if rp_status == "COMPLETED":
            tracked.status = "COMPLETED"
            output = runpod_job_status.get("output", runpod_job_status)
            if isinstance(output, str):
                import json
                try:
                    output = json.loads(output)
                except (json.JSONDecodeError, TypeError):
                    output = {"raw": output}
            tracked.result = output
        elif rp_status in ("FAILED", "ERROR", "CANCELLED", "TIMED_OUT"):
            tracked.status = "FAILED"
            tracked.error = runpod_job_status.get("error", f"RunPod job {rp_status}")
        elif rp_status in ("IN_QUEUE", "IN_PROGRESS", "RUNNING"):
            tracked.status = "IN_PROGRESS"
        else:
            tracked.status = "IN_PROGRESS"

        self.registry.update(job_id, status=tracked.status, result=tracked.result, error=tracked.error)
        return self._job_to_response(tracked)

    def _fetch_job_status(self, endpoint: runpod.Endpoint, provider_job_id: str) -> Dict:
        try:
            return endpoint.rp_client.get(f"{endpoint.endpoint_id}/status/{provider_job_id}")
        except Exception as exc:
            return {"status": "IN_PROGRESS", "error": str(exc)}

    async def trigger_training_job(self) -> str:
        """
        Submits a training job to RunPod, requesting cost-efficient consumer GPUs.
        """
        if not self.endpoint_id:
            raise ValueError("RUNPOD_ENDPOINT_ID must be configured.")

        self._ensure_api_key()
        endpoint = runpod.Endpoint(self.endpoint_id)

        payload = {
            "task": "train_ensemble",
            "execution_timeout": 900,
            "gpu_type": "RTX 3090",
        }

        loop = asyncio.get_event_loop()
        job = await loop.run_in_executor(None, endpoint.run, payload)
        return job.id

    @staticmethod
    def _job_to_response(job: DeepSimJob) -> Dict[str, Any]:
        resp: Dict[str, Any] = {
            "id": job.job_id,
            "status": job.status,
        }
        if job.result is not None:
            resp["output"] = job.result
        if job.error is not None:
            resp["error"] = job.error
        return resp

    async def provision_endpoint(self, docker_image: str | None = None) -> Dict[str, str]:
        """Provision a RunPod serverless endpoint for deep-sim inference.

        Creates a template from the docker image, then a serverless endpoint
        that scales to zero when idle. Sets self.endpoint_id on success.

        Returns dict with endpoint_id, template_id, and status.
        """
        self._ensure_api_key()

        image = docker_image or os.getenv(
            "RUNPOD_WORKER_IMAGE", "steel-deep-sim:latest"
        )

        loop = asyncio.get_event_loop()
        template_id = await loop.run_in_executor(
            None,
            self._create_template,
            image,
        )

        endpoint_id = await loop.run_in_executor(
            None,
            self._create_endpoint,
            template_id,
        )

        self.endpoint_id = endpoint_id
        os.environ["RUNPOD_ENDPOINT_ID"] = endpoint_id

        return {
            "endpoint_id": endpoint_id,
            "template_id": template_id,
            "image": image,
            "status": "provisioned",
        }

    def _create_template(self, image_name: str) -> str:
        result = runpod.create_template(
            name="steel-deep-sim",
            image_name=image_name,
            docker_start_cmd="python -u /app/api/ml/worker/handler.py",
            container_disk_in_gb=15,
            env={
                "RUNPOD_SKIP_AUTO_SYSTEM_CHECKS": "true",
                "RUNPOD_SKIP_GPU_CHECK": "true",
            },
            is_serverless=True,
        )
        template_id = result.get("id") if isinstance(result, dict) else str(result)
        return template_id

    def _create_endpoint(self, template_id: str) -> str:
        result = runpod.create_endpoint(
            name="steel-deep-sim",
            template_id=template_id,
            gpu_ids="AMPERE_16",
            idle_timeout=300,
            workers_min=0,
            workers_max=3,
            scaler_type="QUEUE_DELAY",
            scaler_value=4,
        )
        endpoint_id = result.get("id") if isinstance(result, dict) else str(result)
        return endpoint_id
