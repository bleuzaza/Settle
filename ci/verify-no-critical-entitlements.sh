#!/usr/bin/env bash
# Vérifie qu'aucun entitlement critique non requis n'est présent.
set -euo pipefail

echo "=== Vérification entitlements Settle ==="

if [ -f Settle/Settle.entitlements ]; then
  if grep -q "critical-alerts" Settle/Settle.entitlements 2>/dev/null; then
    echo "::error::Critical Alerts non requis pour Settle — retire l'entitlement."
    exit 1
  fi
fi

echo "OK — pas d'entitlement critique bloquant"
