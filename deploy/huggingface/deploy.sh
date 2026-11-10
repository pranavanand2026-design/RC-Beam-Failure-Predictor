#!/usr/bin/env bash
# Upload the prediction API to a Hugging Face Docker Space.
#
#   hf auth login                                   # once, with a write token
#   deploy/huggingface/deploy.sh                    # default Space below
#   deploy/huggingface/deploy.sh you/your-space     # or another Space
#   DRY_RUN=1 deploy/huggingface/deploy.sh          # stage files and list them, no upload
#
# Only what the API needs at runtime is uploaded (~16 MB).
set -euo pipefail

SPACE="${1:-pranavanand2026-design/rcbeam-api}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$STAGE/data/processed" "$STAGE/models"
cp "$ROOT/Dockerfile" "$ROOT/config.yaml" "$STAGE/"
cp "$ROOT/deploy/huggingface/README.md" "$STAGE/README.md"
cp -R "$ROOT/src" "$ROOT/api" "$STAGE/"
cp "$ROOT/data/processed/dataset.parquet" "$STAGE/data/processed/"
cp -R "$ROOT/models/checkpoints" "$STAGE/models/"
find "$STAGE" \( -name __pycache__ -o -name '*.egg-info' -o -name tests \) -prune -exec rm -rf {} +

if [[ -n "${DRY_RUN:-}" ]]; then
  (cd "$STAGE" && find . -type f | sort && du -sh .)
  exit 0
fi

hf upload "$SPACE" "$STAGE" . --repo-type space --commit-message "Deploy API"
echo
echo "Uploaded. Build logs: https://huggingface.co/spaces/$SPACE"
echo "API URL:             https://${SPACE//\//-}.hf.space"
