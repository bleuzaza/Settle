#!/usr/bin/env python3
"""Applique la signature manuelle uniquement sur la cible app (pas les Pods)."""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path


def main() -> int:
    profile_uuid = os.environ.get("IOS_APP_PROFILE_UUID", "").strip()
    team_id = os.environ.get("DEVELOPMENT_TEAM", "4N92TKQ397").strip()
    target_name = os.environ.get("XCODE_TARGET", "Settle").strip()

    if not profile_uuid:
        print("::error::IOS_APP_PROFILE_UUID manquant", file=sys.stderr)
        return 1

    root = Path(os.environ.get("GITHUB_WORKSPACE", ".")).resolve()
    projects = list((root / "ios").glob("*.xcodeproj/project.pbxproj"))
    if not projects:
        print("::error::Aucun ios/*.xcodeproj/project.pbxproj", file=sys.stderr)
        return 1

    pbxproj = projects[0]
    text = pbxproj.read_text(encoding="utf-8")

    target_pattern = re.compile(
        rf"/\* {re.escape(target_name)} \*/ = \{{[^}}]*?buildConfigurationList = ([A-F0-9]+)",
        re.DOTALL,
    )
    target_match = target_pattern.search(text)
    if not target_match:
        print(f"::error::Cible Xcode '{target_name}' introuvable dans {pbxproj}", file=sys.stderr)
        return 1

    config_list_id = target_match.group(1)
    list_pattern = re.compile(
        rf"{config_list_id} /\* Build configuration list[^*]+\*/ = \{{[^}}]*?buildConfigurations = \(([^)]+)\)",
        re.DOTALL,
    )
    list_match = list_pattern.search(text)
    if not list_match:
        print(f"::error::buildConfigurationList introuvable pour {target_name}", file=sys.stderr)
        return 1

    config_ids = re.findall(r"([A-F0-9]+)", list_match.group(1))
    patched = 0

    for config_id in config_ids:
        config_pattern = re.compile(
            rf"{config_id} /\* ([^*]+) \*/ = \{{[^}}]*?buildSettings = \{{([^}}]*)\}};",
            re.DOTALL,
        )
        config_match = config_pattern.search(text)
        if not config_match:
            continue
        config_name = config_match.group(1).strip()
        if config_name != "Release":
            continue

        old_settings = config_match.group(2)
        cleaned = re.sub(r"\n\s*CODE_SIGN_STYLE = [^;]+;", "", old_settings)
        cleaned = re.sub(r"\n\s*CODE_SIGN_IDENTITY = [^;]+;", "", cleaned)
        cleaned = re.sub(r'\n\s*"CODE_SIGN_IDENTITY\[sdk=iphoneos\*\]" = [^;]+;', "", cleaned)
        cleaned = re.sub(r"\n\s*DEVELOPMENT_TEAM = [^;]+;", "", cleaned)
        cleaned = re.sub(r"\n\s*PROVISIONING_PROFILE_SPECIFIER = [^;]+;", "", cleaned)
        cleaned = re.sub(r'\n\s*"PROVISIONING_PROFILE_SPECIFIER\[sdk=iphoneos\*\]" = [^;]+;', "", cleaned)

        signing = (
            f"\n\t\t\t\tCODE_SIGN_STYLE = Manual;"
            f'\n\t\t\t\t"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "Apple Distribution";'
            f"\n\t\t\t\tDEVELOPMENT_TEAM = {team_id};"
            f'\n\t\t\t\t"PROVISIONING_PROFILE_SPECIFIER[sdk=iphoneos*]" = {profile_uuid};'
        )
        new_settings = cleaned.rstrip() + signing
        text = text.replace(old_settings, new_settings, 1)
        patched += 1

    if patched == 0:
        print(f"::error::Configuration Release introuvable pour {target_name}", file=sys.stderr)
        return 1

    pbxproj.write_text(text, encoding="utf-8")
    print(f"Signature manuelle appliquée sur {target_name} (Release) — profil {profile_uuid}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
