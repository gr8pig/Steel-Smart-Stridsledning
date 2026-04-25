import unittest
from unittest.mock import patch, MagicMock, mock_open
import os
import sys

# Ensure the project root is in sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Mock google.cloud.storage before it's imported in cleanup_preempted
mock_storage = MagicMock()
sys.modules["google.cloud"] = MagicMock()
sys.modules["google.cloud.storage"] = mock_storage

# Import the manager
from scripts.ml.cleanup_preempted import CleanupManager

class TestCleanupManager(unittest.TestCase):
    @patch("scripts.ml.cleanup_preempted.httpx.get")
    @patch("scripts.ml.cleanup_preempted.glob.glob")
    @patch("builtins.open", new_callable=mock_open)
    def test_perform_cleanup(self, mock_file, mock_glob, mock_httpx):
        # Setup mocks
        mock_httpx.return_value = MagicMock(status_code=200)
        mock_httpx.return_value.json.return_value = {"status": "mock_state"}
        
        mock_glob.return_value = ["test_result.json", "data.csv"]
        
        # Mock the GCS client inside the class
        with patch("scripts.ml.cleanup_preempted.storage.Client") as mock_storage_client:
            mock_client_instance = MagicMock()
            mock_storage_client.return_value = mock_client_instance
            mock_bucket = MagicMock()
            mock_client_instance.bucket.return_value = mock_bucket
            mock_blob = MagicMock()
            mock_bucket.blob.return_value = mock_blob

            # Initialize and run cleanup
            manager = CleanupManager()
            # We manually trigger perform_cleanup to avoid the signal loop
            manager.perform_cleanup()

            # Assertions
            # 1. Verify SSS API call
            mock_httpx.assert_called_once()
            
            # 2. Verify local file write (checkpoint)
            mock_file.assert_called()

            # 3. Verify GCS uploads
            # Just verify it was called at least once per file
            mock_bucket.blob.assert_any_call("checkpoint/test_result.json")
            mock_bucket.blob.assert_any_call("checkpoint/data.csv")
            self.assertTrue(mock_blob.upload_from_filename.called)

    def test_handle_signal(self):
        manager = CleanupManager()
        with patch.object(manager, 'perform_cleanup') as mock_cleanup:
            with patch("sys.exit") as mock_exit:
                manager._handle_signal(15, None)
                mock_cleanup.assert_called_once()
                mock_exit.assert_called_once_with(0)
                self.assertTrue(manager.terminated)

if __name__ == "__main__":
    unittest.main()
