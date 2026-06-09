#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== Vérification entitlements Settle ==="

if [ -d ios ]; then
  while IFS= read -r ent; do
    if grep -q "critical-alerts" "$ent" 2>/dev/null; then
      echo "::error::Critical Alerts non requis — retire l'entitlement dans $ent"
      exit 1
    fi
  done < <(find ios -name "*.entitlements" 2>/dev/null || true)
fi

echo "OK — pas d'entitlement problématique."
