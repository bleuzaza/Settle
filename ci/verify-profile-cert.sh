#!/usr/bin/env bash
# Vérifie que le profil .mobileprovision contient le certificat Distribution du trousseau CI.
set -euo pipefail

PROVISION_PATH="${1:?chemin .mobileprovision requis}"
: "${KEYCHAIN_PATH:?KEYCHAIN_PATH requis}"

PLIST="${PROVISION_PATH}.verify.plist"
security cms -D -i "$PROVISION_PATH" > "$PLIST"

if ! /usr/libexec/PlistBuddy -c 'Print :DeveloperCertificates:0' "$PLIST" >/dev/null 2>&1; then
  echo "::error::Profil sans certificat Distribution embarqué — le profil n'est pas signable."
  exit 1
fi

if /usr/libexec/PlistBuddy -c 'Print :ProvisionedDevices' "$PLIST" >/dev/null 2>&1; then
  echo "::error::Profil Ad Hoc (ProvisionedDevices présent) — attendu profil App Store"
  exit 1
fi

PROFILE_NAME=$(/usr/libexec/PlistBuddy -c 'Print :Name' "$PLIST" 2>/dev/null || echo "?")
echo "Profil App Store : $PROFILE_NAME"

CERT_LINE=$(security find-identity -v -p codesigning "$KEYCHAIN_PATH" 2>/dev/null | grep "Apple Distribution" | head -1 || true)
CERT_HASH=$(echo "$CERT_LINE" | sed -n 's/^[[:space:]]*[0-9]*) \([A-F0-9]*\).*/\1/p')

if [ -z "$CERT_HASH" ]; then
  echo "::error::Aucune identité Apple Distribution dans le trousseau CI"
  security find-identity -v -p codesigning "$KEYCHAIN_PATH" || true
  exit 1
fi

if grep -q "Apple Development" <(security find-identity -v -p codesigning 2>/dev/null || true); then
  echo "Note : identité Apple Development présente sur le runner (ignorée si archive utilise le trousseau CI)"
fi

echo "Profil OK — cert CI $CERT_HASH"
