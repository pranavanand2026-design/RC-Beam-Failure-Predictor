#!/usr/bin/env bash
# Deploy the prediction API to Google Cloud Run.
#
# One-time setup (in your own terminal):
#   gcloud auth login
#   gcloud config set project YOUR_PROJECT_ID      # a project with billing enabled
#
# Then, from anywhere in the repo:
#   deploy/cloudrun/deploy.sh
#
# Cloud Build builds the root Dockerfile remotely, so Docker isn't needed locally.
# The service scales to zero when idle, so at portfolio traffic it stays within the free tier.
set -euo pipefail

SERVICE="${SERVICE:-rcbeam-api}"
REGION="${REGION:-australia-southeast1}"
PROJECT="${PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ -z "$PROJECT" ]]; then
  echo "No Google Cloud project set. Run: gcloud config set project YOUR_PROJECT_ID" >&2
  exit 1
fi

echo "Deploying $SERVICE to $PROJECT ($REGION)…"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  --project "$PROJECT"

cd "$ROOT"
gcloud run deploy "$SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --source . \
  --port 8000 \
  --memory 2Gi \
  --cpu 1 \
  --cpu-boost \
  --min-instances 0 \
  --max-instances 2 \
  --timeout 120 \
  --allow-unauthenticated

URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format 'value(status.url)')"
echo
echo "API URL: $URL"
echo "Check:   curl $URL/health"
