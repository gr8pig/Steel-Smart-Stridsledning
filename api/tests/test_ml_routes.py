import os
import sys
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

# Ensure the project root is in sys.path.
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

try:
    import runpod  # type: ignore
except ImportError:
    runpod = MagicMock()
    sys.modules["runpod"] = runpod

from api.main import app, runpod_orchestrator


class TestMlRoutes(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.theater = {
            "timestamp": "2026-04-25T00:00:00Z",
            "trackCount": 6,
            "avgVelocity": 420.0,
            "clusterDensity": 0.42,
            "baseReadinessMean": 0.81,
            "jammerIntensity": 0.18,
            "policyDeltas": {
                "safety": 0.12,
                "sustainability": -0.08,
                "resilience": 0.05,
            },
            "scenarioName": "Boreal Sentinel I",
            "phase": "Pre-Engagement",
            "trackVelocitySpread": 65.0,
        }

        self.assets = [
            {
                "id": "ASSET-A",
                "label": "Northern Radar Node",
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
            {
                "id": "ASSET-B",
                "label": "Mobile Interceptor Cell",
                "unitType": "AIR_DEFENSE",
                "side": "BLUE",
                "platform": "SU_35",
                "readiness": 0.56,
                "speed": 0.67,
                "waypointComplexity": 0.36,
                "inventoryDepth": 0.44,
                "sensorQuality": 0.64,
                "exposedRisk": 0.54,
                "mobility": 0.74,
                "endurance": 0.58,
                "source": "catalog",
            },
        ]

    def test_predict_returns_rich_payload(self):
        response = self.client.post(
            "/api/ml/predict",
            json={
                "theater": self.theater,
                "assets": self.assets,
                "selectedAssetId": "ASSET-A",
            },
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("time_horizon", data)
        self.assertIn("metric_trajectories", data)
        self.assertIn("ensemble_members", data)
        self.assertIn("feature_importances", data)
        self.assertIn("asset_impacts", data)
        self.assertEqual(data["selected_asset_id"], "ASSET-A")
        self.assertGreater(len(data["metric_trajectories"]), 0)
        self.assertGreater(len(data["ensemble_members"]), 0)
        self.assertGreater(len(data["asset_impacts"]), 1)

    def test_predict_enriches_catalog_identity_fields(self):
        response = self.client.post(
            "/api/ml/predict",
            json={
                "theater": self.theater,
                "assets": self.assets,
                "selectedAssetId": "ASSET-B",
            },
        )

        self.assertEqual(response.status_code, 200)
        selected = response.json()["selected_asset"]
        self.assertEqual(selected["platform"], "SU_35")
        self.assertEqual(selected["origin_country"], "RUSSIA")
        self.assertEqual(selected["armament"], "KINETIC_STRIKE")
        self.assertIn("LONG_RANGE_AAM", selected["armaments"])

    def test_asset_properties_change_prediction(self):
        rich_a = self.client.post(
            "/api/ml/predict",
            json={
                "theater": self.theater,
                "assets": self.assets,
                "selectedAssetId": "ASSET-A",
            },
        ).json()

        rich_b = self.client.post(
            "/api/ml/predict",
            json={
                "theater": self.theater,
                "assets": self.assets,
                "selectedAssetId": "ASSET-B",
            },
        ).json()

        self.assertNotEqual(rich_a["p50"][-1], rich_b["p50"][-1])
        within_a = rich_a["asset_impacts"]
        self.assertNotEqual(within_a[0]["summary"], within_a[1]["summary"])

    def test_deep_sim_returns_stable_metadata(self):
        with patch("api.main.runpod_orchestrator.trigger_deep_sim", new=AsyncMock(side_effect=["provider-1", "provider-2"])), \
             patch.object(runpod_orchestrator, "endpoint_id", "test-endpoint"):
            response_a = self.client.post(
                "/api/ml/deep-sim",
                json={
                    "theater": self.theater,
                    "assets": self.assets,
                "selectedAssetId": "ASSET-A",
                "nRuns": 1200,
            },
            )
            response_b = self.client.post(
                "/api/ml/deep-sim",
                json={
                    "theater": self.theater,
                    "assets": self.assets,
                "selectedAssetId": "ASSET-A",
                "nRuns": 1200,
            },
            )

        self.assertEqual(response_a.status_code, 200)
        self.assertEqual(response_b.status_code, 200)

        data_a = response_a.json()
        data_b = response_b.json()
        self.assertEqual(data_a["job_id"], data_b["job_id"])
        self.assertEqual(data_a["scenario_digest"], data_b["scenario_digest"])
        self.assertEqual(data_a["selected_asset_id"], "ASSET-A")
        self.assertEqual(data_a["asset_count"], 2)
        self.assertEqual(data_a["provider_job_id"], "provider-1")
        self.assertEqual(data_b["provider_job_id"], "provider-2")


if __name__ == "__main__":
    unittest.main()
