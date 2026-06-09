#!/usr/bin/env bash
# Vérifie que scripts CI et workflow TestFlight restent alignés (évite push partiel).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

EXPECTED_VERSION="2"
VERSION_FILE="ci/testflight-pipeline-version"

fail() {
  echo "::error::$1" >&2
  exit 1
}

[[ -f "$VERSION_FILE" ]] || fail "Manquant: $VERSION_FILE"
actual_version="$(tr -d '[:space:]' < "$VERSION_FILE")"
[[ "$actual_version" == "$EXPECTED_VERSION" ]] || fail \
  "Version pipeline $actual_version != $EXPECTED_VERSION (mettre à jour ci/ + workflows ensemble)"

for required in ci/install_signing.py ci/refresh-profiles-api.sh ci/keychain-unlock.sh ci/verify-testflight-pipeline.sh; do
  [[ -f "$required" ]] || fail "Manquant: $required"
done

shopt -s nullglob
workflows=(.github/workflows/*-testflight.yml)
[[ ${#workflows[@]} -gt 0 ]] || fail "Aucun workflow .github/workflows/*-testflight.yml"

for wf in "${workflows[@]}"; do
  echo "=== Vérification $wf ==="
  if grep -qE 'run:\s*bash ci/install-signing\.sh' "$wf" || grep -q 'test -f ci/install-signing\.sh' "$wf"; then
    fail "$wf utilise encore install-signing.sh — appeler python3 ci/install_signing.py"
  fi
  grep -q 'python3 ci/install_signing.py' "$wf" || fail "$wf doit appeler python3 ci/install_signing.py"
  grep -q 'verify-testflight-pipeline.sh' "$wf" || fail "$wf doit exécuter ci/verify-testflight-pipeline.sh"
  grep -q 'Préparer scripts CI' "$wf" || fail "$wf doit normaliser les LF (étape Préparer scripts CI)"
  grep -q 'IOS_DISTRIBUTION_CERTIFICATE_ID' "$wf" || fail "$wf doit passer IOS_DISTRIBUTION_CERTIFICATE_ID"
  grep -q 'CI_APP_SLUG:' "$wf" || fail "$wf doit définir CI_APP_SLUG sur l'étape install certificat"
  keychain_pw_count="$(grep -c 'KEYCHAIN_PASSWORD: \${{ secrets.KEYCHAIN_PASSWORD }}' "$wf" || true)"
  if [[ "$keychain_pw_count" -lt 3 ]]; then
    fail "$wf doit exporter KEYCHAIN_PASSWORD sur install, archive et export (trouvé $keychain_pw_count, min 3)"
  fi
done

if [[ -f ci/install-signing.sh ]] && ! grep -q 'install_signing.py' ci/install-signing.sh; then
  fail "ci/install-signing.sh doit déléguer à install_signing.py"
fi

[[ -f .github/workflows/ci-pipeline-guard.yml ]] || fail "Manquant: .github/workflows/ci-pipeline-guard.yml"

echo "Pipeline TestFlight v$EXPECTED_VERSION — alignement OK ($(basename "$REPO_ROOT"))"
