import unittest
from unittest.mock import patch, MagicMock
import os
import sys

# Ensure the project root is in sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import the orchestrator. Since runpod might not be installed in the environment,
# we use a persistent patch for the module if it fails.
try:
    import runpod
except ImportError:
    runpod = MagicMock()
    sys.modules["runpod"] = runpod

from api.ml.runpod_client import RunPodOrchestrator

class TestRunPodOrchestrator(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        # Setup environment variables for testing
        self.env_patcher = patch.dict(os.environ, {
            "RUNPOD_API_KEY": "test_rpa_key",
            "RUNPOD_ENDPOINT_ID": "test_endpoint_id"
        })
        self.env_patcher.start()

    def tearDown(self):
        self.env_patcher.stop()

    async def test_trigger_deep_sim_success(self):
        # Patch the Endpoint class specifically within the runpod module
        with patch("runpod.Endpoint") as mock_endpoint_class:
            # Mock the endpoint instance
            mock_endpoint = MagicMock()
            mock_endpoint_class.return_value = mock_endpoint
            
            # Mock the job object returned by endpoint.run()
            mock_job = MagicMock()
            mock_job.id = "job_test_12345"
            mock_endpoint.run.return_value = mock_job
            
            # Create orchestrator
            orchestrator = RunPodOrchestrator()
            orchestrator.endpoint_id = "test_endpoint_id"
            
            # Scenario data to test
            scenario_data = {"theater": "Boreal", "intensity": "high"}
            
            # Call the method
            job_id = await orchestrator.trigger_deep_sim(scenario_data)
            
            # Assertions
            self.assertEqual(job_id, "job_test_12345")
            mock_endpoint_class.assert_called_once_with("test_endpoint_id")
            mock_endpoint.run.assert_called_once_with(scenario_data)

    async def test_trigger_deep_sim_no_endpoint(self):
        # Test behavior when endpoint ID is missing
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
            
            # Call the new training trigger method
            job_id = await orchestrator.trigger_training_job()
            
            self.assertEqual(job_id, "train_job_123")
            # Verify we explicitly pass cost-control parameters
            mock_endpoint.run.assert_called_once()
            call_args = mock_endpoint.run.call_args[0][0]
            self.assertEqual(call_args["execution_timeout"], 900) # 15 minutes max
            self.assertEqual(call_args["gpu_type"], "RTX 3090") # Force low-tier GPU

if __name__ == "__main__":
    unittest.main()
