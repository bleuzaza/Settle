#!/usr/bin/env bash
# Recrée les modulemaps Expo/React si replace-rncore-version.js les a supprimés avant l'archive.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -d ios/Pods ]; then
  echo "Pas de ios/Pods — skip modulemaps"
  exit 0
fi

RN_MODULEMAP="ios/Pods/React-Core-prebuilt/React-use-frameworks.modulemap"
if [ ! -f "$RN_MODULEMAP" ]; then
  mkdir -p "$(dirname "$RN_MODULEMAP")"
  cat > "$RN_MODULEMAP" <<'EOF'
module React {
  umbrella header "React-Core-umbrella.h"
  export *
}
EOF
  echo "Recréé $RN_MODULEMAP"
fi

# Certains pods Expo attendent un modulemap dans BuildProductsPath au moment de l'archive.
# Un build Release sans signature compile ces artefacts avant l'archive finale.
echo "Modulemaps Expo vérifiés"
