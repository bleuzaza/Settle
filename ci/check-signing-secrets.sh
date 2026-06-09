#!/usr/bin/env bash
# Certificat Distribution réutilisé — ne pas recréer à chaque build.
set -euo pipefail

missing=()
check() { [ -z "${!1:-}" ] && missing+=("$1"); }

check IOS_DISTRIBUTION_CERTIFICATE_BASE64
check IOS_DISTRIBUTION_CERTIFICATE_PASSWORD
check KEYCHAIN_PASSWORD

if [ "${#missing[@]}" -gt 0 ]; then
  echo "::error::Secrets GitHub manquants : ${missing[*]}"
  echo ""
  echo "Un seul certificat Apple Distribution suffit pour TOUTES tes apps."
  echo "Ne le recrée pas à chaque build — Apple limite à 2 certificats actifs."
  echo ""
  echo "Une fois : Bootstrap signing (n'importe quel repo) → artifact signing-files"
  echo "Puis les 3 secrets dans CHAQUE repo : IOS_DISTRIBUTION_CERTIFICATE_BASE64,"
  echo "IOS_DISTRIBUTION_CERTIFICATE_PASSWORD, KEYCHAIN_PASSWORD (+ ASC_* pour les profils)."
  exit 1
fi

echo "Secrets certificat Distribution OK (réutilisation)."
