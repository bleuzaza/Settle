#!/usr/bin/env bash
# Bootstrap signing Panium — cert + profil App Store via Fastlane + API Apple
set -euo pipefail

: "${ASC_KEY_ID:?}"
: "${ASC_ISSUER_ID:?}"
: "${ASC_PRIVATE_KEY:?}"

BUNDLE_APP="${BUNDLE_ID_APP:-com.cashthetrain.panium}"
OUT_DIR="${GITHUB_WORKSPACE}/output/signing-bundle"
API_JSON="${RUNNER_TEMP}/asc_api_key.json"
KEYCHAIN_PATH="${RUNNER_TEMP}/panium-bootstrap.keychain-db"
CERTS_PATH="${RUNNER_TEMP}/certs"
PROFILES_PATH="${RUNNER_TEMP}/profiles"
P12_PASSWORD="${KEYCHAIN_PASSWORD:-$(openssl rand -hex 16)}"
FASTLANE_LOG="${RUNNER_TEMP}/fastlane-bootstrap.log"
REPO_ROOT="${GITHUB_WORKSPACE}"

export FASTLANE_OPT_OUT_USAGE=YES
export FASTLANE_SKIP_UPDATE_CHECK=YES
export FASTLANE_DISABLE_ANIMATION=YES

mkdir -p "$OUT_DIR" "$CERTS_PATH" "$PROFILES_PATH"

export API_JSON ASC_KEY_ID ASC_ISSUER_ID ASC_PRIVATE_KEY
export KEYCHAIN_PATH KEYCHAIN_PASSWORD="$P12_PASSWORD"
export CERTS_PATH PROFILES_PATH
export BUNDLE_ID_APP="$BUNDLE_APP"

python3 <<'PY'
import json, os, pathlib
key = os.environ["ASC_PRIVATE_KEY"].strip()
path = pathlib.Path(os.environ["API_JSON"])
path.write_text(json.dumps({
    "key_id": os.environ["ASC_KEY_ID"],
    "issuer_id": os.environ["ASC_ISSUER_ID"],
    "key": key,
    "in_house": False,
}, indent=2), encoding="utf-8")
PY

brew install fastlane
fastlane --version

echo "=== Trousseau CI + certificat intermédiaire Apple (WWDR) ==="
security create-keychain -p "$P12_PASSWORD" "$KEYCHAIN_PATH"
security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
security unlock-keychain -p "$P12_PASSWORD" "$KEYCHAIN_PATH"
security list-keychains -d user -s "$KEYCHAIN_PATH" $(security list-keychains -d user | sed 's/^[[:space:]]*"\(.*\)";/\1/')

WWDR="${RUNNER_TEMP}/AppleWWDRCAG3.cer"
curl -fsSL -o "$WWDR" "https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer"
security import "$WWDR" -k "$KEYCHAIN_PATH" -T /usr/bin/codesign -T /usr/bin/security -A

has_distribution_identity() {
  /usr/bin/security find-identity -v -p codesigning "$KEYCHAIN_PATH" 2>/dev/null | grep -q "Apple Distribution"
}

echo "=== Fastlane : cert + sigh ==="
test -f "${REPO_ROOT}/fastlane/Fastfile" || (echo "::error::fastlane/Fastfile introuvable" && exit 1)
set +e
(
  cd "$REPO_ROOT"
  export CI=true
  fastlane ios bootstrap_signing --verbose
) 2>&1 | tee "$FASTLANE_LOG"
FL_EXIT=${PIPESTATUS[0]}
set -e

if [ "$FL_EXIT" -ne 0 ]; then
  if grep -q "maximum number of available Distribution certificates" "$FASTLANE_LOG"; then
    echo "::error::Limite Apple : 2 certificats Distribution actifs max."
  else
    echo "::error::Fastlane bootstrap_signing a échoué (exit $FL_EXIT)"
  fi
  tail -80 "$FASTLANE_LOG" || true
  exit 1
fi

P12_PATH="${OUT_DIR}/distribution.p12"
if ! has_distribution_identity; then
  echo "::error::Apple Distribution absent du trousseau après Fastlane"
  exit 1
fi

# shellcheck source=keychain-unlock.sh
source "${REPO_ROOT}/ci/keychain-unlock.sh"

/usr/bin/security export -k "$KEYCHAIN_PATH" -t identities -f pkcs12 -o "$P12_PATH" -P "$P12_PASSWORD"
test -s "$P12_PATH" || (echo "::error::Export distribution.p12 échoué" && exit 1)

# shellcheck source=profile-utils.sh
source "${REPO_ROOT}/ci/profile-utils.sh"

APP_SRC="${PROFILES_PATH}/app.mobileprovision"
test -f "$APP_SRC" || (echo "::error::Profil manquant : $APP_SRC" && exit 1)
profile_verify_bundle_id "$APP_SRC" >/dev/null
cp "$APP_SRC" "${OUT_DIR}/app.mobileprovision"

B64_P12=$(base64 -i "$P12_PATH" | tr -d '\n')
B64_APP=$(base64 -i "${OUT_DIR}/app.mobileprovision" | tr -d '\n')

CERT_APPLE_ID=""
if [ -f "$FASTLANE_LOG" ]; then
  CERT_APPLE_ID=$(grep "Certificat Apple ID:" "$FASTLANE_LOG" | tail -1 | sed -E 's/.*Certificat Apple ID: *//')
fi

cat > "${OUT_DIR}/GITHUB_SECRETS.txt" <<EOF
# Secrets GitHub (Settings → Actions → Secrets)

IOS_DISTRIBUTION_CERTIFICATE_PASSWORD=$P12_PASSWORD
KEYCHAIN_PASSWORD=$P12_PASSWORD

IOS_DISTRIBUTION_CERTIFICATE_BASE64 → IOS_DISTRIBUTION_CERTIFICATE_BASE64.txt
IOS_DISTRIBUTION_CERTIFICATE_ID → IOS_DISTRIBUTION_CERTIFICATE_ID.txt (optionnel, partagé entre apps)
IOS_PROFILE_APP_BASE64 → IOS_PROFILE_APP_BASE64.txt
EOF

printf '%s' "$B64_P12" > "${OUT_DIR}/IOS_DISTRIBUTION_CERTIFICATE_BASE64.txt"
printf '%s' "$B64_APP" > "${OUT_DIR}/IOS_PROFILE_APP_BASE64.txt"
printf '%s' "$P12_PASSWORD" > "${OUT_DIR}/IOS_DISTRIBUTION_CERTIFICATE_PASSWORD.txt"
printf '%s' "$P12_PASSWORD" > "${OUT_DIR}/KEYCHAIN_PASSWORD.txt"
if [ -n "$CERT_APPLE_ID" ]; then
  printf '%s' "$CERT_APPLE_ID" > "${OUT_DIR}/IOS_DISTRIBUTION_CERTIFICATE_ID.txt"
fi

echo "Bootstrap Panium terminé — artifact signing-files"
