#!/usr/bin/env bash
# Compatibilité : délègue à install_signing.py (les workflows doivent appeler le .py directement).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec python3 "$SCRIPT_DIR/install_signing.py"
