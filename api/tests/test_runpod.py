import unittest
from unittest.mock import patch, MagicMock, AsyncMock
import os
import sys
import time

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

try:
    import runpod
except ImportError:
    runpod = MagicMock()
    sys.modules["runpod"] = runpod

from api.ml.runpod_client import RunPodOrchestrator, DeepSimJobRegistry, DeepSimJob


class TestDeepSimJobRegistry(unittest.TestCase):
    def test_register_and_get(self):
        registry = DeepSimJobRegistry()
        job = DeepSimJob(job_id="j-1", provider_job_id="rp-1", scenario_digest="abc")
        registry.register(job)
        retrieved = registry.get("j-1")
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.job_id, "j-1")
        self.assertEqual(retrieved.provider_job_id, "rp-1")

    def test_get_missing_returns_none(self):
        registry = DeepSimJobRegistry()
        self.assertIsNone(registry.get("nonexistent"))

    def test_update(self):
        registry = DeepSimJobRegistry()
        job = DeepSimJob(job_id="j-2", status="IN_PROGRESS")
        registry.register(job)
        registry.update("j-2", status="COMPLETED", result={"p50": [0.5]})
        updated = registry.get("j-2")
        self.assertEqual(updated.status, "COMPLETED")
        self.assertEqual(updated.result, {"p50": [0.5]})

    def test_evict_old_jobs(self):
        registry = DeepSimJobRegistry(max_age_seconds=1)
        job = DeepSimJob(job_id="j-old", created_at=time.time() - 10)
        registry.register(job)
        registry._evict()
        self.assertIsNone(registry.get("j-old"))


class TestRunPodOrchestrator(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.env_patcher = patch.dict(os.environ, {
            "RUNPOD_API_KEY": "test_rpa_key",
            "RUNPOD_ENDPOINT_ID": "test_endpoint_id"
        })
        self.env_patcher.start()

    def tearDown(self):
        self.env_patcher.stop()

    async def test_trigger_deep_sim_success(self):
        with patch("runpod.Endpoint") as mock_endpoint_class:
            mock_endpoint = MagicMock()
            mock_endpoint_class.return_value = mock_endpoint
            mock_job = MagicMock()
            mock_job.id = "job_test_12345"
            mock_endpoint.run.return_value = mock_job

            orchestrator = RunPodOrchestrator()
            orchestrator.endpoint_id = "test_endpoint_id"
            scenario_data = {"theater": "Boreal", "intensity": "high", "stableJobId": "deep-abc"}

            job_id = await orchestrator.trigger_deep_sim(scenario_data)

            self.assertEqual(job_id, "job_test_12345")
            mock_endpoint_class.assert_called_once_with("test_endpoint_id")
            mock_endpoint.run.assert_called_once_with(scenario_data)

            tracked = orchestrator.registry.get("deep-abc")
            self.assertIsNotNone(tracked)
            self.assertEqual(tracked.provider_job_id, "job_test_12345")
            self.assertEqual(tracked.status, "IN_PROGRESS")

    async def test_trigger_deep_sim_no_endpoint(self):
        orchestrator = RunPodOrchestrator()
        orchestrator.endpoint_id = None

        with self.assertRaises(ValueError) as cm:
            await orchestrator.trigger_deep_sim({"data": "test"})
        self.assertEqual(str(cm.exception), "RUNPOD_ENDPOINT_ID must be configured to trigger simulations.")

    async def test_trigger_training_job_with_gpu_limits(self):
        with patch("runpod.Endpoint") as mock_endpoint_class:
            mock_endpoint = MagicMock()
            mock_endpoint_class.return_value = mock_endpoint
            mock_job = MagicMock()
            mock_job.id = "train_job_123"
            mock_endpoint.run.return_value = mock_job

            orchestrator = RunPodOrchestrator()
            orchestrator.endpoint_id = "test_endpoint_id"
            job_id = await orchestrator.trigger_training_job()

            self.assertEqual(job_id, "train_job_123")
            call_args = mock_endpoint.run.call_args[0][0]
            self.assertEqual(call_args["execution_timeout"], 900)
            self.assertEqual(call_args["gpu_type"], "RTX 3090")

    async def test_poll_status_not_found(self):
        orchestrator = RunPodOrchestrator()
        result = await orchestrator.poll_status("nonexistent-job")
        self.assertEqual(result["status"], "NOT_FOUND")

    async def test_poll_status_completed(self):
        registry = DeepSimJobRegistry()
        job = DeepSimJob(
            job_id="j-done",
            provider_job_id="rp-done",
            status="COMPLETED",
            result={"p50": [0.5, 0.6, 0.7]},
        )
        registry.register(job)
        orchestrator = RunPodOrchestrator(registry=registry)
        result = await orchestrator.poll_status("j-done")
        self.assertEqual(result["status"], "COMPLETED")
        self.assertEqual(result["output"]["p50"], [0.5, 0.6, 0.7])

    async def test_poll_status_failed(self):
        registry = DeepSimJobRegistry()
        job = DeepSimJob(
            job_id="j-fail",
            provider_job_id="rp-fail",
            status="FAILED",
            error="OOM",
        )
        registry.register(job)
        orchestrator = RunPodOrchestrator(registry=registry)
        result = await orchestrator.poll_status("j-fail")
        self.assertEqual(result["status"], "FAILED")
        self.assertEqual(result["error"], "OOM")

    async def test_poll_status_in_progress_queries_runpod(self):
        with patch("runpod.Endpoint") as mock_endpoint_class:
            mock_endpoint = MagicMock()
            mock_endpoint_class.return_value = mock_endpoint
            mock_endpoint.jobs.return_value = [{"status": "IN_PROGRESS"}]

            registry = DeepSimJobRegistry()
            job = DeepSimJob(
                job_id="j-poll",
                provider_job_id="rp-poll",
                status="IN_PROGRESS",
            )
            registry.register(job)
            orchestrator = RunPodOrchestrator(registry=registry)
            orchestrator.endpoint_id = "test_endpoint_id"

            result = await orchestrator.poll_status("j-poll")
            self.assertEqual(result["status"], "IN_PROGRESS")

    async def test_poll_status_transition_to_completed(self):
        with patch("runpod.Endpoint") as mock_endpoint_class:
            mock_endpoint = MagicMock()
            mock_endpoint_class.return_value = mock_endpoint
            mock_endpoint.jobs.return_value = [{
                "status": "COMPLETED",
                "output": {"p50": [0.8, 0.75], "trust_score": 0.9},
            }]

            registry = DeepSimJobRegistry()
            job = DeepSimJob(
                job_id="j-trans",
                provider_job_id="rp-trans",
                status="IN_PROGRESS",
            )
            registry.register(job)
            orchestrator = RunPodOrchestrator(registry=registry)
            orchestrator.endpoint_id = "test_endpoint_id"

            result = await orchestrator.poll_status("j-trans")
            self.assertEqual(result["status"], "COMPLETED")
            self.assertIn("output", result)
            self.assertEqual(result["output"]["p50"], [0.8, 0.75])


class TestDeepSimStatusEndpoint(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        from fastapi.testclient import TestClient
        from api.main import app
        self.client = TestClient(app)
        self.theater = {
            "timestamp": "2026-04-25T00:00:00Z",
            "trackCount": 6,
            "avgVelocity": 420.0,
            "clusterDensity": 0.42,
            "baseReadinessMean": 0.81,
            "jammerIntensity": 0.18,
            "policyDeltas": {"safety": 0.12, "sustainability": -0.08},
            "scenarioName": "Boreal Sentinel I",
            "phase": "Pre-Engagement",
        }
        self.assets = [
            {
                "id": "ASSET-A",
                "label": "Test Radar",
                "unitType": "SENSOR_PLATFORM",
                "side": "BLUE",
                "readiness": 0.88,
                "speed": 0.22,
                "waypointComplexity": 0.12,
                "inventoryDepth": 0.72,
                "sensorQuality": 0.96,
                "exposedRisk": 0.22,
                "mobility": 0.26,
                "endurance": 0.82,
                "source": "catalog",
            },
        ]

    def test_deep_sim_status_not_found(self):
        resp = self.client.get("/api/ml/deep-sim/nonexistent-job/status")
        self.assertEqual(resp.status_code, 404)

    def test_deep_sim_local_fallback_poll(self):
        from api.main import deep_sim_registry
        from api.ml.runpod_client import DeepSimJob

        job = DeepSimJob(
            job_id="local-test-job",
            status="IN_PROGRESS",
            context_payload={
                "theater": self.theater,
                "assets": self.assets,
                "selectedAssetId": "ASSET-A",
            },
        )
        deep_sim_registry.register(job)

        resp = self.client.get("/api/ml/deep-sim/local-test-job/status")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "COMPLETED")
        self.assertIn("output", data)
        self.assertIn("p50", data["output"])

    def test_ml_status_endpoint(self):
        resp = self.client.get("/api/ml/status")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("provider", data)
        self.assertIn("rf_model_loaded", data)
        self.assertTrue(data["rf_model_loaded"])

    def test_ml_enable_without_api_key_returns_400(self):
        resp = self.client.post("/api/ml/enable", json={})
        self.assertIn(resp.status_code, [400, 500])

    async def test_provision_endpoint_creates_template_and_endpoint(self):
        with patch("runpod.create_template") as mock_create_template, \
             patch("runpod.create_endpoint") as mock_create_endpoint:
            mock_create_template.return_value = {"id": "tpl-123"}
            mock_create_endpoint.return_value = {"id": "ep-456"}

            orchestrator = RunPodOrchestrator()
            orchestrator.endpoint_id = None

            result = await orchestrator.provision_endpoint(docker_image="test-image:latest")

            self.assertEqual(result["endpoint_id"], "ep-456")
            self.assertEqual(result["template_id"], "tpl-123")
            self.assertEqual(result["image"], "test-image:latest")
            self.assertEqual(result["status"], "provisioned")
            self.assertEqual(orchestrator.endpoint_id, "ep-456")


if __name__ == "__main__":
    unittest.main()