#!/usr/bin/env bash
# Autorise codesign à utiliser la clé privée Distribution dans le trousseau CI.
set -euo pipefail

: "${KEYCHAIN_PATH:?KEYCHAIN_PATH requis}"
: "${KEYCHAIN_PASSWORD:?KEYCHAIN_PASSWORD requis}"

security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

echo "Trousseau CI déverrouillé pour codesign"
