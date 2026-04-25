import asyncio
import os
from typing import Dict

import runpod


class RunPodOrchestrator:
    """
    Orchestrator for managing deep simulation jobs on RunPod.
    Prefers spot GPU instances for cost-efficiency (configured at the endpoint level).
    """
    def __init__(self):
        self.endpoint_id = os.getenv("RUNPOD_ENDPOINT_ID")
        if not self.endpoint_id:
            print("Warning: RUNPOD_ENDPOINT_ID not found in environment variables.")

    def _ensure_api_key(self) -> None:
        # Read lazily so load_dotenv() in main.py has already run at call time.
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

        # endpoint.run() is a blocking HTTP call — run it off the event loop.
        loop = asyncio.get_event_loop()
        job = await loop.run_in_executor(None, endpoint.run, scenario_data)
        return job.id

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
