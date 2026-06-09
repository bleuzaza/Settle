#!/usr/bin/env bash
# Régénère le profil App Store (lié au certificat déjà dans le trousseau CI).
set -euo pipefail

: "${ASC_KEY_ID:?}"
: "${ASC_ISSUER_ID:?}"
: "${ASC_PRIVATE_KEY:?}"
: "${KEYCHAIN_PATH:?KEYCHAIN_PATH requis}"

REPO_ROOT="${GITHUB_WORKSPACE:?GITHUB_WORKSPACE requis}"
PROFILES_PATH="${RUNNER_TEMP:-/tmp}/profiles-refresh"
API_JSON="${RUNNER_TEMP:-/tmp}/asc_api.json"
CERTS_PATH="${RUNNER_TEMP:-/tmp}/certs-refresh"

export ASC_KEY_ID ASC_ISSUER_ID ASC_PRIVATE_KEY PROFILES_PATH API_JSON KEYCHAIN_PASSWORD CERTS_PATH

echo "=== Certificat Distribution dans le trousseau CI ==="
CERT_LINE=$(security find-identity -v -p codesigning "$KEYCHAIN_PATH" | grep "Apple Distribution" | head -1 || true)
[ -n "$CERT_LINE" ] || { echo "::error::Apple Distribution absent"; exit 1; }
echo "$CERT_LINE"

python3 <<'PY'
import json, os, pathlib
path = pathlib.Path(os.environ["API_JSON"])
path.write_text(json.dumps({
    "key_id": os.environ["ASC_KEY_ID"],
    "issuer_id": os.environ["ASC_ISSUER_ID"],
    "key": os.environ["ASC_PRIVATE_KEY"].strip(),
    "in_house": False,
}, indent=2), encoding="utf-8")
PY

mkdir -p "$PROFILES_PATH" "$CERTS_PATH"
export CI=true FASTLANE_OPT_OUT_USAGE=YES FASTLANE_SKIP_UPDATE_CHECK=YES
brew list fastlane >/dev/null 2>&1 || brew install fastlane
( cd "$REPO_ROOT" && fastlane ios refresh_profiles --verbose )

SCRIPT_DIR="${GITHUB_WORKSPACE}/ci"
# shellcheck source=profile-utils.sh
source "$SCRIPT_DIR/profile-utils.sh"

APP_PROV="${PROFILES_PATH}/app.mobileprovision"
test -f "$APP_PROV" || { echo "::error::Profil non généré"; exit 1; }
profile_verify_bundle_id "$APP_PROV" >/dev/null
bash "$SCRIPT_DIR/verify-profile-cert.sh" "$APP_PROV"

APP_UUID=$(profile_install_uuid_only "$APP_PROV")
write_release_xcconfig "$APP_UUID"

if [ -n "${GITHUB_ENV:-}" ]; then
  echo "IOS_APP_PROFILE_UUID=$APP_UUID" >> "$GITHUB_ENV"
fi

echo "Profil App Store régénéré — $APP_UUID"
