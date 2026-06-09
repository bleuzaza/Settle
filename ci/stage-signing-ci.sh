#!/usr/bin/env bash
# Stage les fichiers CI signing + workflows ensemble avant commit (évite push partiel).
set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

git add \
  ci/testflight-pipeline-version \
  ci/install_signing.py \
  ci/install-signing.sh \
  ci/refresh-profiles-api.sh \
  ci/keychain-unlock.sh \
  ci/verify-testflight-pipeline.sh \
  ci/stage-signing-ci.sh \
  fastlane/Fastfile \
  .github/workflows/ci-pipeline-guard.yml \
  .github/workflows/*-testflight.yml 2>/dev/null || true

bash ci/verify-testflight-pipeline.sh
echo "Fichiers prêts — git status :"
git status --short
