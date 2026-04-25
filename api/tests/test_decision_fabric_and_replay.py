import os
import sys
import time
import unittest

from fastapi.testclient import TestClient

# Ensure the project root is in sys.path.
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from api.decision_fabric import decision_fabric_state
from api.main import app
from api.replay import replay_registry
from api.scenario_seed import seed
from api.solver import is_reachable
from api.twin_engine import campaign_twin


class TestDecisionFabricAndReplay(unittest.TestCase):
    def setUp(self):
        campaign_twin.reset()
        seed()
        decision_fabric_state.reset()
        replay_registry.reset()
        self.client = TestClient(app)

    def test_decision_fabric_endpoint_returns_authoritative_metrics(self):
        for base in campaign_twin.bases:
            base.fuel = 0.15
            base.maintenance_backlog = 0.45
        campaign_twin.policy.engagement_authority = "MANUAL"
        campaign_twin.inject_tracks(10, "MIXED")
        decision_fabric_state.set_latest_failure_probability(0.4)
        decision_fabric_state.previous_score = 1.0
        decision_fabric_state.previous_timestamp = time.time() - 12.0

        response = self.client.get("/api/twins/decision-fabric")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], "C2-TWIN-01")
        self.assertEqual(data["simTime"], 0.0)
        self.assertEqual(data["failureProbability"], 0.4)
        self.assertGreater(data["trustEntropy"], 0.4)
        self.assertGreater(data["authorityFriction"], 0.9)
        self.assertGreater(data["operatorLoad"], 0.6)
        self.assertLess(data["auditCompleteness"], 0.7)
        self.assertIsNotNone(data["projectedCollapseSec"])
        self.assertIn(data["status"], {"STRESSED", "COLLAPSED"})

    def test_policy_update_replays_by_client_action_id(self):
        response = self.client.post(
            "/api/twins/policy",
            json={
                "policyWeights": {
                    "safety": 0.61,
                    "sustainability": 0.42,
                    "resilience": 0.73,
                },
                "clientActionId": "policy-123",
                "deviceId": "steel-tablet-1",
                "queuedAt": "2026-04-25T10:00:00Z",
            },
        )
        replay = self.client.post(
            "/api/twins/policy",
            json={
                "policyWeights": {
                    "safety": 0.10,
                    "sustainability": 0.10,
                    "resilience": 0.10,
                },
                "clientActionId": "policy-123",
                "deviceId": "steel-tablet-1",
                "queuedAt": "2026-04-25T10:00:05Z",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(replay.status_code, 200)
        data = response.json()
        replay_data = replay.json()
        self.assertTrue(data["accepted"])
        self.assertFalse(data["replayed"])
        self.assertEqual(data["clientActionId"], "policy-123")
        self.assertEqual(data["weights"]["safety"], 0.61)
        self.assertTrue(replay_data["replayed"])
        self.assertEqual(replay_data["weights"]["safety"], 0.61)
        self.assertEqual(campaign_twin.policy.safety_weight, 0.61)

    def test_engage_replays_without_double_spending_inventory(self):
        base, threat, effector_type = self._find_reachable_engagement()
        initial_inventory = base.get_inventory(effector_type)

        response = self.client.post(
            "/api/twins/engage",
            json={
                "trackId": threat.id,
                "baseId": base.id,
                "effectorType": effector_type,
                "clientActionId": "engage-1",
                "deviceId": "steel-tablet-1",
                "queuedAt": "2026-04-25T10:05:00Z",
            },
        )
        replay = self.client.post(
            "/api/twins/engage",
            json={
                "trackId": threat.id,
                "baseId": base.id,
                "effectorType": effector_type,
                "clientActionId": "engage-1",
                "deviceId": "steel-tablet-1",
                "queuedAt": "2026-04-25T10:05:03Z",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(replay.status_code, 200)
        data = response.json()
        replay_data = replay.json()
        self.assertTrue(data["accepted"])
        self.assertFalse(data["replayed"])
        self.assertEqual(data["trackId"], threat.id)
        self.assertEqual(base.get_inventory(effector_type), initial_inventory - 1)
        self.assertTrue(replay_data["replayed"])
        self.assertEqual(replay_data["inventoryRemaining"], data["inventoryRemaining"])
        self.assertEqual(base.get_inventory(effector_type), initial_inventory - 1)

    def _find_reachable_engagement(self):
        for threat in campaign_twin.threats:
            for base in campaign_twin.bases:
                for effector_type in (
                    "interceptor_short",
                    "interceptor_mid",
                    "interceptor_long",
                ):
                    if base.get_inventory(effector_type) <= 0:
                        continue
                    if is_reachable(base, effector_type, threat):
                        return base, threat, effector_type
        self.fail("No reachable engagement found in seeded scenario")


if __name__ == "__main__":
    unittest.main()
