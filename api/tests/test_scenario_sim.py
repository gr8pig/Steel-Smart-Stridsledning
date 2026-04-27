"""Tests for scenario simulation endpoints and engine."""
import unittest
from types import SimpleNamespace

from fastapi.testclient import TestClient


class TestScenarioSimEndpoint(unittest.TestCase):
    def setUp(self):
        from api.main import app
        self.client = TestClient(app)

    def test_scenario_sim_boreal_strike(self):
        resp = self.client.post("/api/ml/scenario-sim", json={
            "scenarioName": "boreal-strike",
            "nRuns": 100,
            "policySweep": {
                "safety": [0.3, 0.7],
                "sustainability": [0.5],
            },
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("scenario_name", data)
        self.assertIn("sweep_points", data)
        self.assertIn("aggregate", data)
        self.assertEqual(data["base_count"], 5)
        self.assertEqual(data["threat_count"], 5)
        self.assertEqual(data["sweep_count"], 2)
        self.assertIn("overall_robustness", data["aggregate"])
        self.assertIn("best_policy", data["aggregate"])
        self.assertIn("worst_policy", data["aggregate"])

    def test_scenario_sim_ghost_feint(self):
        resp = self.client.post("/api/ml/scenario-sim", json={
            "scenarioName": "ghost-feint",
            "nRuns": 100,
            "policySweep": {
                "safety": [0.5],
                "sustainability": [0.5],
            },
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["threat_count"], 10)
        self.assertEqual(data["sweep_count"], 1)

    def test_scenario_sim_default_sweep(self):
        resp = self.client.post("/api/ml/scenario-sim", json={
            "scenarioName": "boreal-strike",
            "nRuns": 50,
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertGreaterEqual(data["sweep_count"], 1)
        self.assertIn("asset_results", data["sweep_points"][0])

    def test_scenario_sim_unknown_scenario(self):
        resp = self.client.post("/api/ml/scenario-sim", json={
            "scenarioName": "unknown-scenario",
        })
        self.assertEqual(resp.status_code, 400)

    def test_scenario_sim_sweep_point_structure(self):
        resp = self.client.post("/api/ml/scenario-sim", json={
            "scenarioName": "boreal-strike",
            "nRuns": 50,
            "policySweep": {"safety": [0.5]},
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        point = data["sweep_points"][0]
        self.assertIn("policy", point)
        self.assertIn("jammer_intensity", point)
        self.assertIn("trust_score", point)
        self.assertIn("avg_blue_robustness", point)
        self.assertIn("avg_failure_probability", point)
        self.assertIn("asset_results", point)
        asset = point["asset_results"][0]
        self.assertIn("asset_id", asset)
        self.assertIn("robustness_score", asset)
        self.assertIn("failure_probability", asset)


class TestScenarioCompareEndpoint(unittest.TestCase):
    def setUp(self):
        from api.main import app
        self.client = TestClient(app)

    def test_compare_boreal_vs_ghost(self):
        resp = self.client.post("/api/ml/scenario-compare", json={
            "scenarioA": "boreal-strike",
            "scenarioB": "ghost-feint",
            "nRuns": 50,
            "policySweep": {"safety": [0.5]},
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("scenario_a", data)
        self.assertIn("scenario_b", data)
        self.assertIn("deltas", data)
        self.assertIn("paired_sweep", data)
        self.assertIn("robustness", data["deltas"])
        self.assertIn("verdict", data["deltas"])
        self.assertEqual(data["scenario_a"]["name"], "Boreal Strike")
        self.assertEqual(data["scenario_b"]["name"], "Ghost Feint")

    def test_compare_includes_best_policies(self):
        resp = self.client.post("/api/ml/scenario-compare", json={
            "scenarioA": "boreal-strike",
            "scenarioB": "ghost-feint",
            "nRuns": 50,
            "policySweep": {"safety": [0.3, 0.7]},
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("best_policy_a", data)
        self.assertIn("best_policy_b", data)
        self.assertIn("safety", data["best_policy_a"])
        self.assertIn("safety", data["best_policy_b"])

    def test_compare_paired_sweep(self):
        resp = self.client.post("/api/ml/scenario-compare", json={
            "scenarioA": "boreal-strike",
            "scenarioB": "ghost-feint",
            "nRuns": 50,
            "policySweep": {"safety": [0.5]},
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertGreaterEqual(len(data["paired_sweep"]), 1)
        point = data["paired_sweep"][0]
        self.assertIn("robustness_a", point)
        self.assertIn("robustness_b", point)
        self.assertIn("delta_robustness", point)


class TestScenarioSimEngine(unittest.TestCase):
    def test_sweep_grid_generation(self):
        from api.scenario_sim import _compute_sweep_grid
        grid = _compute_sweep_grid(
            {"safety": [0.3, 0.7], "sustainability": [0.5]},
            [0.0, 0.5],
        )
        self.assertEqual(len(grid), 2 * 1 * 1 * 2)

    def test_sweep_grid_defaults(self):
        from api.scenario_sim import _compute_sweep_grid
        grid = _compute_sweep_grid(None, None)
        self.assertEqual(len(grid), 1)

    def test_threat_asset_uses_catalog_profile(self):
        from api.scenario_sim import _threat_to_asset

        threat = SimpleNamespace(
            id="T-1001",
            threat_class="AIRCRAFT",
            velocity=2200.0,
            platform="SU_35",
            armaments=None,
            armament=None,
            origin_country=None,
            heading=185.0,
            sensor_quality=0.52,
            jamming_probability=0.2,
            intent_distribution={"strike": 0.7},
        )

        asset = _threat_to_asset(threat)

        self.assertEqual(asset.label, "Su-35S Flanker-E")
        self.assertEqual(asset.platform, "SU_35")
        self.assertEqual(asset.origin_country, "RUSSIA")
        self.assertEqual(asset.armament, "KINETIC_STRIKE")
        self.assertIn("CRUISE_MISSILE", asset.armaments)
        self.assertGreater(asset.sensor_quality, 0.52)


if __name__ == "__main__":
    unittest.main()
