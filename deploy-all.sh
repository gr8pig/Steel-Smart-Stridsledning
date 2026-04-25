#!/usr/bin/env bash
# ── Steel Smart Stridsledning Deployment Root ──────────────────────────────────
#
# This script deploys both the API and Web services to Google Cloud Run.

set -euo pipefail

# Configuration
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Error: GCP PROJECT_ID is not set." >&2
  echo "Please run: gcloud config set project <your-project-id>" >&2
  exit 1
fi

echo "🚀 Starting full deployment for Steel Smart Stridsledning to ${PROJECT_ID}..."

# 1. Deploy API first
echo "📡 Deploying API service..."
./deploy/gcp/deploy-api.sh

# 2. Deploy Web second (it will fetch the API URL)
echo "🌐 Deploying Web service..."
./deploy/gcp/deploy-web.sh

echo "🌐 Deploying Firebase Hosting configuration..."
# Note: Firebase might need to be installed or authenticated in the environment
if command -v firebase &> /dev/null; then
  firebase deploy --only hosting --project "${PROJECT_ID}"
else
  echo "Warning: firebase-tools not found. Skipping Firebase Hosting deployment."
fi

echo "✅ Full deployment complete."
