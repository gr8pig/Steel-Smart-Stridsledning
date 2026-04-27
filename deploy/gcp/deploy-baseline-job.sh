#!/usr/bin/env bash
# Deploy and run baseline inference data generation job on Cloud Run Jobs
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-europe-north2}"
JOB_NAME="${JOB_NAME:-steel-baseline-generator}"
REPOSITORY="${REPOSITORY:-steel-api}"
IMAGE_TAG="${IMAGE_TAG:-baseline-$(date +%Y%m%d-%H%M%S)}"
BASELINE_OUTPUT_DIR="${BASELINE_OUTPUT_DIR:-/tmp/baseline-data}"
BASELINE_GCS_PREFIX="${BASELINE_GCS_PREFIX:-baseline-data}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Set PROJECT_ID or run 'gcloud config set project <project-id>' first." >&2
  exit 1
fi

echo "=== Steel Baseline Data Generator Deployment ==="
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Job: ${JOB_NAME}"
echo ""

# Enable required services
echo "Enabling required GCP services..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --project "${PROJECT_ID}"

if ! gcloud artifacts repositories describe "${REPOSITORY}" --location "${REGION}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  echo "Creating Artifact Registry repository ${REPOSITORY}..."
  gcloud artifacts repositories create "${REPOSITORY}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Steel baseline generator images" \
    --project "${PROJECT_ID}"
fi

# Build container image
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${JOB_NAME}:${IMAGE_TAG}"

echo ""
echo "Building container image..."
gcloud builds submit "${APP_DIR}" \
  --config="${APP_DIR}/cloudbuild.baseline.yaml" \
  --substitutions=_IMAGE_URI="${IMAGE_URI}" \
  --project "${PROJECT_ID}"

# Create or update Cloud Run Job
echo ""
echo "Deploying Cloud Run Job..."

# Check if job exists
if gcloud run jobs describe "${JOB_NAME}" --region "${REGION}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  echo "Updating existing job..."
  gcloud run jobs update "${JOB_NAME}" \
    --image "${IMAGE_URI}" \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --tasks 1 \
    --max-retries 2 \
    --task-timeout 3600 \
    --memory 2Gi \
    --cpu 2 \
    --set-env-vars="BASELINE_OUTPUT_DIR=${BASELINE_OUTPUT_DIR},BASELINE_GCS_BUCKET=${BASELINE_GCS_BUCKET:-},BASELINE_GCS_PREFIX=${BASELINE_GCS_PREFIX}" \
    --set-secrets="RUNPOD_API_KEY=RUNPOD_API_KEY:latest,RUNPOD_ENDPOINT_ID=RUNPOD_ENDPOINT_ID:latest"
else
  echo "Creating new job..."
  gcloud run jobs create "${JOB_NAME}" \
    --image "${IMAGE_URI}" \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --tasks 1 \
    --max-retries 2 \
    --task-timeout 3600 \
    --memory 2Gi \
    --cpu 2 \
    --set-env-vars="BASELINE_OUTPUT_DIR=${BASELINE_OUTPUT_DIR},BASELINE_GCS_BUCKET=${BASELINE_GCS_BUCKET:-},BASELINE_GCS_PREFIX=${BASELINE_GCS_PREFIX}" \
    --set-secrets="RUNPOD_API_KEY=RUNPOD_API_KEY:latest,RUNPOD_ENDPOINT_ID=RUNPOD_ENDPOINT_ID:latest"
fi

# Run the job
echo ""
echo "Triggering baseline generation job..."
gcloud run jobs execute "${JOB_NAME}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --wait

echo ""
echo "=== Job Complete ==="
echo "View logs:"
echo "  gcloud logging read 'resource.type=cloud_run_job' --limit=50"
