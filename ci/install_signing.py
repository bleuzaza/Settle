#!/usr/bin/env python3
"""Installe le certificat Apple Distribution depuis les secrets GitHub (CI macOS)."""
from __future__ import annotations

import base64
import os
import re
import subprocess
import sys
import urllib.request
from pathlib import Path


def eprint(msg: str) -> None:
    print(msg, flush=True)


def require_env(name: str) -> str:
    value = os.environ.get(name, "")
    if not value.strip():
        eprint(f"::error::Secret GitHub manquant ou vide : {name}")
        eprint(
            "Bootstrap signing → artifact signing-files → "
            "IOS_DISTRIBUTION_CERTIFICATE_BASE64.txt, "
            "IOS_DISTRIBUTION_CERTIFICATE_PASSWORD.txt, KEYCHAIN_PASSWORD.txt"
        )
        sys.exit(1)
    return value


def run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    eprint("+ " + " ".join(cmd))
    return subprocess.run(cmd, check=True, text=True, **kwargs)


def main() -> None:
    eprint("=== install_signing.py : démarrage ===")

    b64_raw = require_env("IOS_DISTRIBUTION_CERTIFICATE_BASE64")
    p12_password = require_env("IOS_DISTRIBUTION_CERTIFICATE_PASSWORD")
    keychain_password = require_env("KEYCHAIN_PASSWORD")

    slug = os.environ.get("CI_APP_SLUG", "app").strip().lower()
    slug = re.sub(r"[^a-z0-9-]+", "-", slug) or "app"

    eprint(
        f"Secrets présents — cert base64: {len(b64_raw)} car., "
        f"mot de passe p12: {len(p12_password)} car., app: {slug}"
    )

    runner_temp = Path(os.environ.get("RUNNER_TEMP", "/tmp"))
    run_id = os.environ.get("GITHUB_RUN_ID", "local")
    keychain_path = runner_temp / f"{slug}-ci-{run_id}.keychain-db"
    cert_path = runner_temp / "distribution.p12"
    wwdr_path = runner_temp / "AppleWWDRCAG3.cer"

    cleaned = re.sub(r"\s+", "", b64_raw)
    try:
        cert_bytes = base64.b64decode(cleaned)
    except Exception as exc:  # noqa: BLE001
        eprint(f"::error::Décodage base64 échoué : {exc}")
        eprint("Vérifie que IOS_DISTRIBUTION_CERTIFICATE_BASE64 contient le .p12 (pas le profil .mobileprovision)")
        sys.exit(1)

    if len(cert_bytes) < 100:
        eprint("::error::Fichier p12 trop petit après décodage — secret incorrect ?")
        sys.exit(1)

    cert_path.write_bytes(cert_bytes)
    eprint(f"p12 décodé — {len(cert_bytes)} octets")

    eprint("=== Trousseau CI ===")
    run(["security", "create-keychain", "-p", keychain_password, str(keychain_path)])
    run(["security", "set-keychain-settings", "-lut", "21600", str(keychain_path)])
    run(["security", "unlock-keychain", "-p", keychain_password, str(keychain_path)])

    eprint("=== Certificat intermédiaire Apple (WWDR) ===")
    urllib.request.urlretrieve(
        "https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer",
        wwdr_path,
    )
    run(
        [
            "security",
            "import",
            str(wwdr_path),
            "-k",
            str(keychain_path),
            "-T",
            "/usr/bin/codesign",
            "-T",
            "/usr/bin/security",
            "-A",
        ]
    )

    eprint("=== Import p12 Distribution ===")
    run(
        [
            "security",
            "import",
            str(cert_path),
            "-P",
            p12_password,
            "-A",
            "-T",
            "/usr/bin/codesign",
            "-T",
            "/usr/bin/security",
            "-t",
            "cert",
            "-f",
            "pkcs12",
            "-k",
            str(keychain_path),
        ]
    )

    run(["security", "unlock-keychain", "-p", keychain_password, str(keychain_path)])
    run(
        [
            "security",
            "set-key-partition-list",
            "-S",
            "apple-tool:,apple:,codesign:",
            "-s",
            "-k",
            keychain_password,
            str(keychain_path),
        ]
    )
    run(["security", "list-keychains", "-d", "user", "-s", str(keychain_path)])

    identities = subprocess.run(
        ["security", "find-identity", "-v", "-p", "codesigning", str(keychain_path)],
        check=False,
        capture_output=True,
        text=True,
    )
    eprint(identities.stdout)
    if "Apple Distribution" not in identities.stdout:
        eprint("::error::Apple Distribution introuvable après import — mot de passe p12 incorrect ou certificat révoqué")
        sys.exit(1)

    github_env = os.environ.get("GITHUB_ENV")
    if github_env:
        with open(github_env, "a", encoding="utf-8") as fh:
            fh.write(f"KEYCHAIN_PATH={keychain_path}\n")
            fh.write(f"KEYCHAIN_PASSWORD={keychain_password}\n")

    eprint("Certificat Distribution installé (réutilisé).")


if __name__ == "__main__":
    main()
