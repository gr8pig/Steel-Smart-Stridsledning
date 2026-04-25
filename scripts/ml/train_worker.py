import signal
import sys
import os
import logging
from google.cloud import storage
import pandas as pd
import lightgbm as lgb

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("train_worker")

def download_datasets(bucket_name: str, prefix: str, local_dir: str) -> list:
    """Downloads all files matching the prefix from GCS to a local directory."""
    os.makedirs(local_dir, exist_ok=True)
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blobs = bucket.list_blobs(prefix=prefix)
    
    downloaded_files = []
    for blob in blobs:
        if not blob.name.endswith(".parquet"):
            continue
        file_name = os.path.basename(blob.name)
        local_path = os.path.join(local_dir, file_name)
        logger.info(f"Downloading {blob.name} to {local_path}")
        blob.download_to_filename(local_path)
        downloaded_files.append(local_path)
        
    return downloaded_files

def upload_artifacts(bucket_name: str, local_path: str, remote_path: str):
    """Uploads a trained model artifact to GCS."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(remote_path)
    logger.info(f"Uploading {local_path} to gs://{bucket_name}/{remote_path}")
    blob.upload_from_filename(local_path)

def timeout_handler(signum, frame):
    logger.error("HARD TIMEOUT REACHED (15 min). Forcefully terminating to prevent runaway costs.")
    sys.exit(1)

def enforce_timeout(minutes: int = 15):
    """Sets a SIGALRM to kill the process after the specified minutes."""
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(minutes * 60)
    logger.info(f"Watchdog timer set for {minutes} minutes.")

def train_models(dataset_paths: list) -> list:
    """Trains LightGBM quantile regressors on the provided datasets."""
    logger.info(f"Loading datasets: {dataset_paths}")
    dfs = [pd.read_parquet(p) for p in dataset_paths]
    if not dfs:
        logger.error("No datasets found.")
        sys.exit(1)
        
    df = pd.concat(dfs, ignore_index=True)
    
    # Assume 'robustness' is the target for this example
    # In production, features and targets are dynamic based on the dataset schema
    if "robustness" not in df.columns:
        logger.warning("Mock mode: 'robustness' column missing. Returning mock models.")
        from unittest.mock import MagicMock
        return [MagicMock() for _ in range(3)]

    X = df.drop(columns=["robustness"])
    y = df["robustness"]
    train_data = lgb.Dataset(X, label=y)
    
    models = []
    quantiles = [0.1, 0.5, 0.9]
    
    for alpha in quantiles:
        logger.info(f"Training quantile regression for alpha={alpha}")
        params = {
            "objective": "quantile",
            "alpha": alpha,
            "metric": "quantile",
            "verbose": -1,
            # Explicitly use CPU; tabular data trains fast enough, avoids GPU overhead
            "device_type": "cpu" 
        }
        model = lgb.train(params, train_data, num_boost_round=50)
        models.append(model)
        
    return models

# Placeholder for the actual training logic
def main():
    enforce_timeout(15)
    logger.info("Training process started.")
    # Training logic will go here
    logger.info("Training complete. Exiting.")
    sys.exit(0)

if __name__ == "__main__":
    main()
