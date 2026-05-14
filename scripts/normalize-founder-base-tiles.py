#!/usr/bin/env python3
"""Normalize generated founder base tiles into the in-engine iso hex shape."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image


HEX_RADIUS_M = 13
ISO_PIXELS_PER_M = 10
PADDING_PX = 8
SUPERSAMPLE = 2

TILES = [
    ("tile-cottage-yard", 0, 0),
    ("tile-forge-yard", 1, 0),
    ("tile-pasture", 2, 0),
    ("tile-road-straight", 0, 1),
    ("tile-road-bend", 1, 1),
    ("tile-yard-road", 2, 1),
]


def metres_to_iso(x_m: float, y_m: float, k: float = ISO_PIXELS_PER_M) -> tuple[float, float]:
    cos30 = math.cos(math.pi / 6)
    sin30 = math.sin(math.pi / 6)
    return ((x_m - y_m) * cos30 * k, (x_m + y_m) * sin30 * k)


def target_hex_points(width: int, height: int) -> list[tuple[float, float]]:
    corners = []
    for degrees in (0, 60, 120, 180, 240, 300):
        angle = math.radians(degrees)
        x_m = math.cos(angle) * HEX_RADIUS_M
        y_m = math.sin(angle) * HEX_RADIUS_M
        x, y = metres_to_iso(x_m, y_m)
        corners.append((x, y))

    # Reorder to match the generated sheet's point-up hex perimeter:
    # top, upper-right, lower-right, bottom, lower-left, upper-left.
    ordered = [corners[i] for i in (4, 5, 0, 1, 2, 3)]
    return [(x + width / 2, y + height / 2) for x, y in ordered]


def chroma_key_magenta(image: Image.Image) -> Image.Image:
    rgba = np.array(image.convert("RGBA"))
    r = rgba[:, :, 0].astype(np.int16)
    g = rgba[:, :, 1].astype(np.int16)
    b = rgba[:, :, 2].astype(np.int16)

    hard = (r > 190) & (b > 170) & (g < 105) & ((r - g) > 80) & ((b - g) > 70)
    fringe = (r > 135) & (b > 115) & (g < 140) & ((r - g) > 38) & ((b - g) > 30)

    rgba[hard, 3] = 0
    rgba[fringe, 3] = np.minimum(rgba[fringe, 3], 24)

    visible = rgba[:, :, 3] > 0
    rgba[visible, 0] = np.minimum(rgba[visible, 0], np.maximum(rgba[visible, 1] + 48, 0))
    rgba[visible, 2] = np.minimum(rgba[visible, 2], np.maximum(rgba[visible, 1] + 44, 0))
    return Image.fromarray(rgba, "RGBA")


def visible_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = np.array(image.getchannel("A"))
    ys, xs = np.where(alpha > 8)
    if len(xs) == 0 or len(ys) == 0:
        raise ValueError("tile crop has no visible pixels")
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def source_hex_points(image: Image.Image) -> list[tuple[float, float]]:
    x0, y0, x1, y1 = visible_bounds(image)
    width = x1 - x0
    height = y1 - y0
    cx = x0 + width / 2
    return [
        (cx, y0),
        (x1, y0 + height * 0.25),
        (x1, y0 + height * 0.75),
        (cx, y1),
        (x0, y0 + height * 0.75),
        (x0, y0 + height * 0.25),
    ]


def barycentric(
    px: float,
    py: float,
    tri: tuple[tuple[float, float], tuple[float, float], tuple[float, float]],
) -> tuple[float, float, float] | None:
    (x0, y0), (x1, y1), (x2, y2) = tri
    denom = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
    if abs(denom) < 1e-6:
        return None
    a = ((y1 - y2) * (px - x2) + (x2 - x1) * (py - y2)) / denom
    b = ((y2 - y0) * (px - x2) + (x0 - x2) * (py - y2)) / denom
    c = 1 - a - b
    if a < -0.001 or b < -0.001 or c < -0.001:
        return None
    return a, b, c


def bilinear_sample(source: np.ndarray, x: float, y: float) -> np.ndarray:
    height, width, _channels = source.shape
    x = min(max(x, 0), width - 1)
    y = min(max(y, 0), height - 1)
    x0 = int(math.floor(x))
    y0 = int(math.floor(y))
    x1 = min(x0 + 1, width - 1)
    y1 = min(y0 + 1, height - 1)
    dx = x - x0
    dy = y - y0
    top = source[y0, x0] * (1 - dx) + source[y0, x1] * dx
    bottom = source[y1, x0] * (1 - dx) + source[y1, x1] * dx
    return top * (1 - dy) + bottom * dy


def warp_tile(tile: Image.Image, width: int, height: int) -> Image.Image:
    src = np.array(tile.convert("RGBA")).astype(np.float32)
    dst_width = width * SUPERSAMPLE
    dst_height = height * SUPERSAMPLE
    out = np.zeros((dst_height, dst_width, 4), dtype=np.float32)

    src_points = source_hex_points(tile)
    src_center = (
        sum(x for x, _y in src_points) / len(src_points),
        sum(y for _x, y in src_points) / len(src_points),
    )
    dst_points = [(x * SUPERSAMPLE, y * SUPERSAMPLE) for x, y in target_hex_points(width, height)]
    dst_center = (width * SUPERSAMPLE / 2, height * SUPERSAMPLE / 2)

    for i in range(6):
        src_tri = (src_center, src_points[i], src_points[(i + 1) % 6])
        dst_tri = (dst_center, dst_points[i], dst_points[(i + 1) % 6])
        min_x = max(0, int(math.floor(min(x for x, _y in dst_tri))) - 1)
        max_x = min(dst_width - 1, int(math.ceil(max(x for x, _y in dst_tri))) + 1)
        min_y = max(0, int(math.floor(min(y for _x, y in dst_tri))) - 1)
        max_y = min(dst_height - 1, int(math.ceil(max(y for _x, y in dst_tri))) + 1)

        for y in range(min_y, max_y + 1):
            for x in range(min_x, max_x + 1):
                weights = barycentric(x + 0.5, y + 0.5, dst_tri)
                if weights is None:
                    continue
                a, b, c = weights
                sx = src_tri[0][0] * a + src_tri[1][0] * b + src_tri[2][0] * c
                sy = src_tri[0][1] * a + src_tri[1][1] * b + src_tri[2][1] * c
                sample = bilinear_sample(src, sx, sy)
                if sample[3] > out[y, x, 3]:
                    out[y, x] = sample

    image = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")
    return image.resize((width, height), Image.Resampling.LANCZOS)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sheet", required=True, type=Path)
    parser.add_argument("--out-dir", default=Path("public/sprite-map/generated/founder"), type=Path)
    parser.add_argument("--manifest", default=Path("public/sprite-map/generated/founder/terrain-base-tiles.manifest.json"), type=Path)
    args = parser.parse_args()

    sheet = Image.open(args.sheet).convert("RGBA")
    slot_w = sheet.width // 3
    slot_h = sheet.height // 2

    raw_target = target_hex_points(0, 0)
    # Width/height from the projected hex extents, padded to even pixels for stable centering.
    xs = [x for x, _y in raw_target]
    ys = [y for _x, y in raw_target]
    width = int(math.ceil(max(xs) - min(xs) + PADDING_PX * 2))
    height = int(math.ceil(max(ys) - min(ys) + PADDING_PX * 2))
    if width % 2:
        width += 1
    if height % 2:
        height += 1

    args.out_dir.mkdir(parents=True, exist_ok=True)
    outputs = []
    for name, col, row in TILES:
        crop = sheet.crop((col * slot_w, row * slot_h, (col + 1) * slot_w, (row + 1) * slot_h))
        keyed = chroma_key_magenta(crop)
        warped = warp_tile(keyed, width, height)
        out_path = args.out_dir / f"{name}.png"
        warped.save(out_path)
        outputs.append({"key": name, "file": str(out_path), "size": [width, height]})

    args.manifest.write_text(
        json.dumps(
            {
                "source": str(args.sheet),
                "canvas": [width, height],
                "anchor": [0.5, 0.5],
                "tiles": outputs,
            },
            indent=2,
        )
        + "\n"
    )


if __name__ == "__main__":
    main()
