#!/usr/bin/env bash
set -euo pipefail

# ── Deploy the RunPod deep-sim worker ──────────────────────────────────────
#
# This script builds the worker Docker image, pushes it to a registry that
# RunPod can access, and optionally provisions the serverless endpoint.
#
# Prerequisites:
#   - RUNPOD_API_KEY set (for endpoint provisioning)
#   - gcloud authenticated (if using Artifact Registry)
#   - Docker installed only when using a custom REGISTRY
#
# Usage:
#   REGISTRY=your-registry ./deploy-worker.sh
#   REGISTRY=your-registry PROVISION=1 ./deploy-worker.sh   # also create endpoint

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

REGION="${REGION:-europe-north2}"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REPOSITORY="${REPOSITORY:-steel-api}"
IMAGE_NAME="${IMAGE_NAME:-steel-deep-sim}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY:-}"

if [[ -z "${PROJECT_ID}" && -z "${REGISTRY}" ]]; then
    echo "Set PROJECT_ID (for GCP Artifact Registry) or REGISTRY (custom registry URL)." >&2
    exit 1
fi

# ── Build the Docker image ──────────────────────────────────────────────────

echo "Building deep-sim worker image..."

if [[ -n "${REGISTRY}" ]]; then
    IMAGE_URI="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
else
    IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}:${IMAGE_TAG}"
fi

if [[ -n "${REGISTRY}" ]]; then
    docker build \
        -f "${APP_DIR}/api/ml/worker/Dockerfile" \
        -t "${IMAGE_URI}" \
        "${APP_DIR}/api"
else
    gcloud services enable \
        artifactregistry.googleapis.com \
        cloudbuild.googleapis.com \
        --project "${PROJECT_ID}"

    if ! gcloud artifacts repositories describe "${REPOSITORY}" --location "${REGION}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
        gcloud artifacts repositories create "${REPOSITORY}" \
            --repository-format=docker \
            --location="${REGION}" \
            --description="Steel API and worker images" \
            --project "${PROJECT_ID}"
    fi

    gcloud builds submit "${APP_DIR}/api" \
        --config="${APP_DIR}/api/cloudbuild.worker.yaml" \
        --substitutions=_IMAGE_URI="${IMAGE_URI}" \
        --project "${PROJECT_ID}"
fi

echo "Built image: ${IMAGE_URI}"

# ── Push to registry ────────────────────────────────────────────────────────

if [[ -n "${REGISTRY}" ]]; then
    echo "Pushing image to registry..."
    docker push "${IMAGE_URI}"
    echo "Pushed: ${IMAGE_URI}"
else
    echo "Image pushed by Cloud Build: ${IMAGE_URI}"
fi

# ── Optionally provision RunPod endpoint ─────────────────────────────────────

if [[ "${PROVISION:-0}" == "1" ]]; then
    if [[ -z "${RUNPOD_API_KEY}" ]]; then
        echo "RUNPOD_API_KEY must be set to provision a RunPod endpoint." >&2
        echo "Set PROVISION=0 to skip provisioning." >&2
        exit 1
    fi

    echo "Provisioning RunPod endpoint..."

    # Use the API to provision
    python3 -c "
import os, sys
sys.path.insert(0, '${APP_DIR}')
os.environ.setdefault('RUNPOD_API_KEY', '${RUNPOD_API_KEY}')
os.environ['RUNPOD_WORKER_IMAGE'] = '${IMAGE_URI}'
from api.ml.runpod_client import RunPodOrchestrator
import asyncio
orch = RunPodOrchestrator()
result = asyncio.run(orch.provision_endpoint())
print(f'Endpoint ID: {result[\"endpoint_id\"]}')
print(f'Template ID: {result[\"template_id\"]}')
print(f'Status: {result[\"status\"]}')
"
else
    echo ""
    echo "Image pushed. To provision the RunPod endpoint, either:"
    echo "  1. Run this script with PROVISION=1"
    echo "  2. Click 'Enable Machine Learning' in the dashboard"
    echo "  3. Set RUNPOD_ENDPOINT_ID=<endpoint-id> and RUNPOD_WORKER_IMAGE=${IMAGE_URI}"
fi

echo ""
echo "Done. Worker image: ${IMAGE_URI}"
