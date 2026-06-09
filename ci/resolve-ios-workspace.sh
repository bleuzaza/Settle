#!/usr/bin/env bash
# Retourne le .xcworkspace CocoaPods (pas project.xcworkspace interne).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SCHEME="${XCODE_SCHEME:-Settle}"

if [ -d "ios/${SCHEME}.xcworkspace" ]; then
  echo "ios/${SCHEME}.xcworkspace"
  exit 0
fi

# Workspace au niveau ios/ uniquement (évite ios/Settle.xcodeproj/project.xcworkspace)
mapfile -t workspaces < <(find ios -maxdepth 1 -name "*.xcworkspace" -print 2>/dev/null || true)
if [ "${#workspaces[@]}" -eq 1 ]; then
  echo "${workspaces[0]}"
  exit 0
fi

if [ "${#workspaces[@]}" -gt 1 ]; then
  for ws in "${workspaces[@]}"; do
    case "$ws" in
      *".xcodeproj/project.xcworkspace") continue ;;
      *) echo "$ws"; exit 0 ;;
    esac
  done
fi

echo "::error::Aucun workspace CocoaPods dans ios/ (lance pod install)" >&2
exit 1
