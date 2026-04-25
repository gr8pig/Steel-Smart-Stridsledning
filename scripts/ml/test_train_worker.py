import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add project root to sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Create a dummy init file so scripts.ml is importable during tests if it doesn't exist
init_file = os.path.join(project_root, "scripts", "ml", "__init__.py")
if not os.path.exists(init_file):
    os.makedirs(os.path.dirname(init_file), exist_ok=True)
    open(init_file, "w").close()

# Mock google.cloud.storage before it's imported in train_worker
mock_storage = MagicMock()
sys.modules["google"] = MagicMock()
sys.modules["google.cloud"] = MagicMock()
sys.modules["google.cloud.storage"] = mock_storage

# Mock lightgbm
sys.modules["lightgbm"] = MagicMock()

from scripts.ml.train_worker import enforce_timeout, timeout_handler

class TestTrainWorker(unittest.TestCase):
    @patch("sys.exit")
    def test_timeout_handler_exits(self, mock_exit):
        timeout_handler(None, None)
        mock_exit.assert_called_once_with(1)

    @patch("scripts.ml.train_worker.storage.Client")
    def test_download_datasets(self, mock_storage_client):
        from unittest.mock import MagicMock
        mock_client_instance = MagicMock()
        mock_storage_client.return_value = mock_client_instance
        mock_bucket = MagicMock()
        mock_client_instance.bucket.return_value = mock_bucket
        
        # Mock blobs
        mock_blob1 = MagicMock()
        mock_blob1.name = "training_data/seed.parquet"
        mock_blob2 = MagicMock()
        mock_blob2.name = "training_data/expansion_1.parquet"
        mock_bucket.list_blobs.return_value = [mock_blob1, mock_blob2]
        
        from scripts.ml.train_worker import download_datasets
        downloaded_files = download_datasets("bdt-ml-data", "training_data/", "/tmp/bdt_data")
        
        self.assertEqual(len(downloaded_files), 2)
        mock_blob1.download_to_filename.assert_called_once_with("/tmp/bdt_data/seed.parquet")

    @patch("scripts.ml.train_worker.lgb.train")
    @patch("scripts.ml.train_worker.pd.read_parquet")
    def test_train_models(self, mock_read_parquet, mock_lgb_train):
        from unittest.mock import MagicMock
        import pandas as pd
        # Create a tiny dummy dataframe
        df = pd.DataFrame({
            "track_count": [10, 20],
            "robustness": [0.8, 0.4]
        })
        mock_read_parquet.return_value = df
        mock_model = MagicMock()
        mock_lgb_train.return_value = mock_model
        
        from scripts.ml.train_worker import train_models
        models = train_models(["/tmp/bdt_data/seed.parquet"])
        
        self.assertEqual(len(models), 3) # Expect 3 quantile models (p10, p50, p90)
        mock_lgb_train.assert_called()

if __name__ == "__main__":
    unittest.main()
