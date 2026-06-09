#!/usr/bin/env bash
# Applique CFBundleVersion après expo prebuild.
set -euo pipefail

BUILD_NUMBER="${1:-}"
if [ -z "$BUILD_NUMBER" ]; then
  echo "::error::Usage: apply-ios-build-number.sh <build_number>"
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -d ios ]; then
  echo "::error::Dossier ios/ introuvable — lance expo prebuild d'abord"
  exit 1
fi

INFO_PLIST=$(find ios -path "*/Info.plist" -not -path "*/Pods/*" -not -path "*/Tests/*" | head -1)
if [ -z "$INFO_PLIST" ]; then
  echo "::error::Info.plist introuvable dans ios/"
  exit 1
fi

/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$INFO_PLIST"
echo "CFBundleVersion=$BUILD_NUMBER → $INFO_PLIST"
