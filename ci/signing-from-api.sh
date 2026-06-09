#!/usr/bin/env bash
# Bootstrap uniquement — crée un NOUVEAU certificat Apple (limite 2 par compte).
# Ne pas utiliser à chaque build TestFlight : préférer install_signing.py + refresh-profiles-api.sh
set -euo pipefail

: "${ASC_KEY_ID:?}"
: "${ASC_ISSUER_ID:?}"
: "${ASC_PRIVATE_KEY:?}"

REPO_ROOT="${GITHUB_WORKSPACE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
KEYCHAIN_PATH="${RUNNER_TEMP:-/tmp}/ci-signing-api.keychain-db"
KEYCHAIN_PASSWORD="${KEYCHAIN_PASSWORD:-$(openssl rand -hex 16)}"
CERTS_PATH="${RUNNER_TEMP:-/tmp}/certs-api"
PROFILES_PATH="${RUNNER_TEMP:-/tmp}/profiles-api"
FASTLANE_LOG="${RUNNER_TEMP:-/tmp}/fastlane-ci-signing.log"

export KEYCHAIN_PATH KEYCHAIN_PASSWORD CERTS_PATH PROFILES_PATH
export FASTLANE_OPT_OUT_USAGE=YES FASTLANE_SKIP_UPDATE_CHECK=YES FASTLANE_DISABLE_ANIMATION=YES

echo "=== Trousseau CI ==="
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security list-keychains -d user -s "$KEYCHAIN_PATH" $(security list-keychains -d user | sed 's/^[[:space:]]*"\(.*\)";/\1/')

WWDR="${RUNNER_TEMP:-/tmp}/AppleWWDRCAG3.cer"
curl -fsSL -o "$WWDR" "https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer"
security import "$WWDR" -k "$KEYCHAIN_PATH" -T /usr/bin/codesign -T /usr/bin/security -A

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export HOMEBREW_NO_PATH_SHADOW_CHECK=1
brew list fastlane >/dev/null 2>&1 || brew install fastlane
FASTLANE_BIN="$(command -v fastlane)"

has_distribution_identity() {
  security find-identity -v -p codesigning "$KEYCHAIN_PATH" 2>/dev/null | grep -q "Apple Distribution"
}

run_fastlane() {
  local force_flag="$1"
  set +e
  (
    cd "$REPO_ROOT"
    export CI=true FORCE_NEW_CERT="$force_flag"
    "$FASTLANE_BIN" ios ci_signing --verbose
  ) 2>&1 | tee "$FASTLANE_LOG"
  return "${PIPESTATUS[0]}"
}

echo "=== Fastlane ci_signing ==="
FORCE_FLAG="0"
if ! run_fastlane "$FORCE_FLAG"; then
  if grep -q "maximum number of available Distribution certificates" "$FASTLANE_LOG"; then
    echo "::error::Limite Apple : 2 certificats Distribution."
    exit 1
  fi
  if grep -qiE "can't be found on your local computer|revoked|expired|not valid|cert_id manquant" "$FASTLANE_LOG"; then
    echo "=== Nouvelle tentative avec FORCE_NEW_CERT=1 ==="
    run_fastlane "1" || {
      echo "::error::Impossible de créer un certificat Distribution valide"
      tail -80 "$FASTLANE_LOG" || true
      exit 1
    }
  else
    echo "::error::fastlane ci_signing a échoué"
    tail -80 "$FASTLANE_LOG" || true
    exit 1
  fi
fi

if ! security find-identity -v -p codesigning "$KEYCHAIN_PATH" | grep -q "Apple Distribution"; then
  echo "::error::Apple Distribution absent du trousseau après ci_signing"
  security find-identity -v -p codesigning "$KEYCHAIN_PATH" || true
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=keychain-unlock.sh
source "$SCRIPT_DIR/keychain-unlock.sh"

# Exclure le trousseau login du runner — évite qu'xcodebuild prenne Apple Development
security list-keychains -d user -s "$KEYCHAIN_PATH"
# shellcheck source=profile-utils.sh
source "$SCRIPT_DIR/profile-utils.sh"

APP_PROV="${PROFILES_PATH}/app.mobileprovision"
test -f "$APP_PROV" || (echo "::error::Profil non généré" && exit 1)
profile_verify_bundle_id "$APP_PROV" >/dev/null
bash "$SCRIPT_DIR/verify-profile-cert.sh" "$APP_PROV"

APP_UUID=$(profile_install_uuid_only "$APP_PROV")
write_release_xcconfig "$APP_UUID"

if [ -n "${GITHUB_ENV:-}" ]; then
  echo "KEYCHAIN_PATH=$KEYCHAIN_PATH" >> "$GITHUB_ENV"
  echo "IOS_APP_PROFILE_UUID=$APP_UUID" >> "$GITHUB_ENV"
fi

echo "Signing API OK — profil $APP_UUID"
