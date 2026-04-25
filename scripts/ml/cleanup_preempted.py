import os
import signal
import sys
import time
import json
import glob
import logging
from typing import Optional
import httpx
from google.cloud import storage

# Configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
GCP_BUCKET_NAME = os.getenv("GCP_BUCKET_NAME", "bdt-ml-data")
GCP_CHECKPOINT_PATH = os.getenv("GCP_CHECKPOINT_PATH", "checkpoint/")
LOCAL_RESULTS_DIR = os.getenv("LOCAL_RESULTS_DIR", ".")
BDT_API_URL = os.getenv("BDT_API_URL", "http://localhost:8000")
TERMINATION_CHECK_INTERVAL = int(os.getenv("TERMINATION_CHECK_INTERVAL", "5"))

# Logging setup
logging.basicConfig(
    level=LOG_LEVEL,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("cleanup_preempted")

class CleanupManager:
    def __init__(self):
        self.terminated = False
        self.gcs_client: Optional[storage.Client] = None
        
        # Register signal handlers
        signal.signal(signal.SIGTERM, self._handle_signal)
        signal.signal(signal.SIGINT, self._handle_signal)

    def _handle_signal(self, signum, frame):
        logger.info(f"Received signal {signum}. Starting cleanup process...")
        self.terminated = True
        self.perform_cleanup()
        sys.exit(0)

    def _get_gcs_client(self) -> storage.Client:
        if self.gcs_client is None:
            self.gcs_client = storage.Client()
        return self.gcs_client

    def flush_in_memory_results(self):
        """
        Attempts to trigger a data flush from the main BDT API.
        Saves the current campaign state to a local file.
        """
        logger.info("Attempting to flush in-memory results via BDT API...")
        try:
            # We try to get the full campaign snapshot
            response = httpx.get(f"{BDT_API_URL}/api/twins/campaign", timeout=2.0)
            if response.status_code == 200:
                snapshot = response.json()
                filename = f"preemption_checkpoint_{int(time.time())}.json"
                filepath = os.path.join(LOCAL_RESULTS_DIR, filename)
                with open(filepath, "w") as f:
                    json.dump(snapshot, f)
                logger.info(f"Successfully flushed state to {filepath}")
            else:
                logger.warning(f"Failed to fetch campaign state: {response.status_code}")
        except Exception as e:
            logger.error(f"Error during in-memory flush: {e}")

    def upload_results(self):
        """
        Scans for JSON and CSV files and uploads them to GCP Cloud Storage.
        """
        logger.info(f"Scanning {LOCAL_RESULTS_DIR} for results to upload...")
        files_to_upload = glob.glob(os.path.join(LOCAL_RESULTS_DIR, "*.json")) + \
                          glob.glob(os.path.join(LOCAL_RESULTS_DIR, "*.csv"))
        
        if not files_to_upload:
            logger.info("No files found to upload.")
            return

        try:
            client = self._get_gcs_client()
            bucket = client.bucket(GCP_BUCKET_NAME)
            
            for file_path in files_to_upload:
                file_name = os.path.basename(file_path)
                blob_path = os.path.join(GCP_CHECKPOINT_PATH, file_name)
                blob = bucket.blob(blob_path)
                
                logger.info(f"Uploading {file_name} to gs://{GCP_BUCKET_NAME}/{blob_path}...")
                blob.upload_from_filename(file_path)
                logger.info(f"Successfully uploaded {file_name}")
                
        except Exception as e:
            logger.error(f"Failed to upload results to GCS: {e}")

    def perform_cleanup(self):
        """
        Full cleanup sequence.
        """
        self.flush_in_memory_results()
        self.upload_results()
        logger.info("Cleanup sequence completed.")

    def run(self):
        """
        Main loop for periodic checks if needed.
        Note: RunPod usually relies on SIGTERM for spot preemption.
        """
        logger.info("Cleanup manager started. Monitoring for termination signals...")
        while not self.terminated:
            # Here we could also poll a metadata endpoint if RunPod ever adds one
            # For now, we just stay alive and wait for signals
            time.sleep(TERMINATION_CHECK_INTERVAL)

if __name__ == "__main__":
    manager = CleanupManager()
    manager.run()
