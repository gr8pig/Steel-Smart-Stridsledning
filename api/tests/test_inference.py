import unittest
from unittest.mock import MagicMock
import numpy as np
import os
import sys

# Ensure the project root is in sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from api.ml.inference import EnsembleInference
from api.ml.models import TheaterStateVector
from api.ml.types import PolicyDeltas

class TestEnsembleInference(unittest.TestCase):
    """
    Tests for EnsembleInference quantile and trust score calculations.
    """
    
    def setUp(self):
        # Common state vector for testing
        self.state = TheaterStateVector(
            timestamp="2024-01-01T00:00:00Z",
            track_count=5,
            avg_velocity=500.0,
            cluster_density=0.5,
            base_readiness_mean=0.8,
            jammer_intensity=0.1,
            policy_deltas=PolicyDeltas(safety=0.0, sustainability=0.0)
        )

    def test_predict_trajectory_calculations(self):
        # Setup 3 models with fixed, different predictions
        # Values chosen to have non-zero variance and clear percentiles
        preds_m1 = [10.0, 20.0, 30.0]
        preds_m2 = [15.0, 25.0, 35.0]
        preds_m3 = [5.0, 15.0, 25.0]
        
        m1 = MagicMock()
        m1.predict.return_value = preds_m1
        m2 = MagicMock()
        m2.predict.return_value = preds_m2
        m3 = MagicMock()
        m3.predict.return_value = preds_m3
        
        ensemble = EnsembleInference(models=[m1, m2, m3])
        
        # Execute prediction
        result = ensemble.predict_trajectory(self.state)
        
        # 1. Verify Time Horizon
        self.assertEqual(result.time_horizon, [0, 1, 2])
        
        # 2. Verify p50 (Median)
        # For [10, 15, 5] -> median is 10.0
        # For [20, 25, 15] -> median is 20.0
        # For [30, 35, 25] -> median is 30.0
        self.assertEqual(result.p50, [10.0, 20.0, 30.0])
        
        # 3. Verify p10 and p90 against numpy ground truth
        all_preds = np.array([preds_m1, preds_m2, preds_m3])
        expected_p10 = np.percentile(all_preds, 10, axis=0).tolist()
        expected_p90 = np.percentile(all_preds, 90, axis=0).tolist()
        
        self.assertEqual(result.p10, expected_p10)
        self.assertEqual(result.p90, expected_p90)
        
        # 4. Verify Trust Score
        # Variance of [10, 15, 5]: Mean=10, Var=((0^2 + 5^2 + (-5)^2) / 3) = 50 / 3 = 16.666...
        # All steps in this test data have same variance.
        expected_variance = float(np.mean(np.var(all_preds, axis=0)))
        expected_trust_score = 1.0 / (1.0 + expected_variance)
        
        self.assertAlmostEqual(result.trust_score, expected_trust_score)
        
        # 5. Verify Speculative Flag
        # trust_score is 1.0 / (1 + 16.66) approx 0.056, which is < 0.7
        self.assertTrue(result.is_speculative)

    def test_trust_score_zero_variance(self):
        # Case where all models agree perfectly
        preds = [100.0, 200.0]
        m1 = MagicMock()
        m1.predict.return_value = preds
        m2 = MagicMock()
        m2.predict.return_value = preds
        
        ensemble = EnsembleInference(models=[m1, m2])
        result = ensemble.predict_trajectory(self.state)
        
        # variance 0 -> trust score 1.0
        self.assertEqual(result.trust_score, 1.0)
        self.assertFalse(result.is_speculative)
        self.assertEqual(result.p50, preds)

    def test_empty_models_raises_error(self):
        ensemble = EnsembleInference(models=[])
        with self.assertRaises(ValueError):
            ensemble.predict_trajectory(self.state)

if __name__ == "__main__":
    unittest.main()
