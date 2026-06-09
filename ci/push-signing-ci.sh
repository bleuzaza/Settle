#!/usr/bin/env bash
# Commit + push scripts CI signing et workflows TestFlight ensemble (évite push partiel).
set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

bash ci/stage-signing-ci.sh

if [[ -f ci/_sync_pipeline_guard.py ]]; then
  git add ci/_sync_pipeline_guard.py 2>/dev/null || true
fi
if git diff --cached --quiet; then
  echo "Rien à committer."
  exit 0
fi

MSG="${1:-Garde-fou CI: alignement workflow + scripts TestFlight.}"
git commit -m "$MSG"
git push
echo "Push OK — $(basename "$REPO_ROOT")"
