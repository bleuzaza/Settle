#!/usr/bin/env bash
# Bloque l'upload si l'IPA n'est pas signée Apple Distribution (évite ITMS-90035).
set -euo pipefail

IPA_PATH="${1:?chemin .ipa requis}"
WORK="${RUNNER_TEMP:-/tmp}/ipa-signature-check"
rm -rf "$WORK"
mkdir -p "$WORK"

unzip -q -o "$IPA_PATH" -d "$WORK"

APP_PATH=$(find "$WORK/Payload" -maxdepth 1 -name "*.app" -type d | head -1)
if [ -z "$APP_PATH" ]; then
  echo "::error::Aucun .app dans l'IPA"
  exit 1
fi

echo "=== codesign — $APP_PATH ==="
codesign -dvv "$APP_PATH" 2>&1 | tee "$WORK/codesign.txt"

if grep -qi "Apple Development" "$WORK/codesign.txt"; then
  echo "::error::IPA signée avec Apple Development — refus App Store (ITMS-90035)"
  exit 1
fi

if ! grep -qi "Apple Distribution" "$WORK/codesign.txt"; then
  echo "::error::Apple Distribution introuvable dans la signature"
  exit 1
fi

PROV="$APP_PATH/embedded.mobileprovision"
if [ ! -f "$PROV" ]; then
  echo "::error::embedded.mobileprovision manquant"
  exit 1
fi

PLIST="$WORK/embedded.plist"
security cms -D -i "$PROV" > "$PLIST"

if /usr/libexec/PlistBuddy -c 'Print :ProvisionedDevices' "$PLIST" >/dev/null 2>&1; then
  echo "::error::Profil Ad Hoc détecté (ProvisionedDevices) — pas App Store"
  exit 1
fi

GET_TASK_ALLOW=$(/usr/libexec/PlistBuddy -c 'Print :Entitlements:get-task-allow' "$PLIST" 2>/dev/null || echo "false")
if [ "$GET_TASK_ALLOW" = "true" ]; then
  echo "::error::get-task-allow=true — signature développement"
  exit 1
fi

echo "OK — IPA signée Apple Distribution, profil App Store"
