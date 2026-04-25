#!/usr/bin/env bash
# ── Steel Smart Stridsledning Deployment Root ──────────────────────────────────
#
# This script deploys the Steel frontend and API to Google Cloud Run.
# It ensures a single source of truth for the production environment.

set -euo pipefail

# Configuration
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="europe-west1"
SERVICE_NAME="steel-smart-stridsledning"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Error: GCP PROJECT_ID is not set." >&2
  echo "Please run: gcloud config set project <your-project-id>" >&2
  exit 1
fi

echo "🚀 Starting deployment for Steel Smart Stridsledning to ${PROJECT_ID}..."

# Verified Active Endpoints:
# 1. Primary (Firebase): https://steel-stridsledning-260424.web.app
# 2. Direct (Cloud Run): https://steel-smart-stridsledning-617342395970.europe-north2.run.app

# Execute the core deployment script (Cloud Run)
./deploy/gcp/deploy.sh

echo "🌐 Deploying Firebase Hosting configuration..."
firebase deploy --only hosting --project "${PROJECT_ID}"

echo "✅ Deployment complete."
