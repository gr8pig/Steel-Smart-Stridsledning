#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-europe-north2}"
SERVICE_NAME="${SERVICE_NAME:-steel-smart-stridsledning}"
REPOSITORY="${REPOSITORY:-steel-smart-stridsledning-web}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
MIN_INSTANCES="${MIN_INSTANCES:-0}"
MAX_INSTANCES="${MAX_INSTANCES:-1}"
CONCURRENCY="${CONCURRENCY:-20}"
CPU="${CPU:-1}"
MEMORY="${MEMORY:-512Mi}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Set PROJECT_ID or run 'gcloud config set project <project-id>' first." >&2
  exit 1
fi

gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --project "${PROJECT_ID}"

if ! gcloud artifacts repositories describe "${REPOSITORY}" --location "${REGION}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${REPOSITORY}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Steel Smart Stridsledning container images" \
    --project "${PROJECT_ID}"
fi

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE_NAME}:${IMAGE_TAG}"

gcloud builds submit "${APP_DIR}" \
  --tag "${IMAGE_URI}" \
  --project "${PROJECT_ID}"

gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_URI}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --execution-environment gen2 \
  --min-instances "${MIN_INSTANCES}" \
  --max-instances "${MAX_INSTANCES}" \
  --concurrency "${CONCURRENCY}" \
  --cpu "${CPU}" \
  --memory "${MEMORY}" \
  --timeout 3600 \
  --cpu-boost \
  --cpu-throttling \
  --port 8080 \
  --set-env-vars NODE_ENV=production \
  --project "${PROJECT_ID}"

echo "Deployed to Cloud Run in ${REGION}:"
gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --format='value(status.url)'
