import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from api.scenario_seed import seed, seed_scenario_a
from api.scripts.generate_baseline_data import build_simulation_context, upload_outputs
from api.twin_engine import campaign_twin
from api.ml.worker.handler import handler


class TestGenerateBaselineData(unittest.TestCase):
    def tearDown(self):
        seed()
        campaign_twin.scenario_name = "Boreal Sentinel I"

    def test_build_simulation_context_contains_bases_and_threats(self):
        seed_scenario_a()
        context = build_simulation_context()

        self.assertEqual(context.theater.scenario_name, "Boreal Strike")
        self.assertEqual(len(context.assets), len(campaign_twin.bases) + len(campaign_twin.get_active_threats()))
        self.assertIsNotNone(context.selected_asset_id)
        self.assertTrue(context.theater.timestamp)

    def test_upload_outputs_is_noop_without_bucket(self):
        with tempfile.TemporaryDirectory() as tmp_dir, patch.dict(
            os.environ,
            {"BASELINE_GCS_BUCKET": "", "GCP_BUCKET_NAME": ""},
            clear=False,
        ):
            uploaded = upload_outputs(Path(tmp_dir))
        self.assertEqual(uploaded, [])

    def test_worker_can_generate_single_bundle_payload(self):
        mock_engine = MagicMock()
        mock_prediction = MagicMock()
        mock_prediction.model_dump.return_value = {"p50": [0.5], "trustScore": 0.8}
        mock_engine.predict_trajectory.return_value = mock_prediction

        with patch("api.ml.worker.handler._get_engine", return_value=mock_engine):
            result = handler({"input": {"task": "generate_baseline_bundle", "scenarioKeys": ["seed"]}})

        self.assertEqual(result["file_name"], "baseline-all.json")
        self.assertIn("content", result)
        self.assertIn("seed", result["content"]["scenarios"])


if __name__ == "__main__":
    unittest.main()
