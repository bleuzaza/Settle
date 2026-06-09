#!/usr/bin/env python3
"""Génère AppIcon.appiconset pour Settle — fond noir + carré bleu accent."""
from __future__ import annotations

import json
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ICONSET = ROOT / "Settle" / "Resources" / "Assets.xcassets" / "AppIcon.appiconset"

BG_R, BG_G, BG_B = 13, 13, 13
ACCENT_R, ACCENT_G, ACCENT_B = 0, 47, 230

ICONS: list[tuple[str, int, str, str, str]] = [
    ("Icon-40.png", 40, "iphone", "20x20", "2x"),
    ("Icon-60.png", 60, "iphone", "20x20", "3x"),
    ("Icon-58.png", 58, "iphone", "29x29", "2x"),
    ("Icon-87.png", 87, "iphone", "29x29", "3x"),
    ("Icon-80.png", 80, "iphone", "40x40", "2x"),
    ("Icon-120-40.png", 120, "iphone", "40x40", "3x"),
    ("Icon-120.png", 120, "iphone", "60x60", "2x"),
    ("Icon-180.png", 180, "iphone", "60x60", "3x"),
    ("Icon-1024.png", 1024, "ios-marketing", "1024x1024", "1x"),
]


def _chunk(tag: bytes, payload: bytes) -> bytes:
    return (
        struct.pack(">I", len(payload))
        + tag
        + payload
        + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
    )


def rgba_png(size: int, pixels: bytes) -> bytes:
    rows = b"".join(b"\x00" + pixels[y * size * 3 : (y + 1) * size * 3] for y in range(size))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + _chunk(b"IHDR", ihdr) + _chunk(b"IDAT", zlib.compress(rows, 9)) + _chunk(b"IEND", b"")


def draw_icon(size: int) -> bytes:
    buf = bytearray(size * size * 3)
    cx, cy = size / 2, size / 2
    square_half = size * 0.22
    margin = size * 0.08
    corner_r = size * 0.18

    for y in range(size):
        for x in range(size):
            in_rounded_rect = True
            for corner_x, corner_y in (
                (margin, margin),
                (size - margin, margin),
                (margin, size - margin),
                (size - margin, size - margin),
            ):
                if (x < margin or x >= size - margin) and (y < margin or y >= size - margin):
                    dx, dy = x - corner_x, y - corner_y
                    if dx * dx + dy * dy > corner_r * corner_r:
                        in_rounded_rect = False
                        break

            if not in_rounded_rect:
                pr, pg, pb = 0, 0, 0
            elif abs(x - cx) <= square_half and abs(y - cy) <= square_half:
                pr, pg, pb = ACCENT_R, ACCENT_G, ACCENT_B
            else:
                pr, pg, pb = BG_R, BG_G, BG_B

            i = (y * size + x) * 3
            buf[i], buf[i + 1], buf[i + 2] = pr, pg, pb

    return rgba_png(size, bytes(buf))


def main() -> None:
    ICONSET.mkdir(parents=True, exist_ok=True)
    images = []
    for filename, px, idiom, size_str, scale in ICONS:
        (ICONSET / filename).write_bytes(draw_icon(px))
        images.append({
            "filename": filename,
            "idiom": idiom,
            "scale": scale,
            "size": size_str,
        })
    (ICONSET / "Contents.json").write_text(
        json.dumps({"images": images, "info": {"author": "xcodegen", "version": 1}}, indent=2),
        encoding="utf-8",
    )
    print(f"OK - {len(ICONS)} icons -> {ICONSET}")


if __name__ == "__main__":
    main()
