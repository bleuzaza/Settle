#!/usr/bin/env bash
# Crée ci/Release-App.xcconfig si absent (build simulateur / XcodeGen).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -f ci/Release-App.xcconfig ]; then
  cp ci/Release-App.xcconfig.example ci/Release-App.xcconfig
  echo "Créé ci/Release-App.xcconfig (stub)"
fi
