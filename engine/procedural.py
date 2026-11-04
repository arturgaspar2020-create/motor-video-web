"""Procedural 2D block-character scenes for the first automatic-visual prototype.

This is deliberately not presented as 3D. It creates simple animated block figures,
backgrounds and camera-like movement with Pillow, then encodes them with FFmpeg.
"""
from __future__ import annotations

import math
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

PREVIEW_FPS = 12
BASE_W = 540


def _run(command: list[str]) -> None:
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr[-4000:] or "Falha ao gerar animação procedural.")


def _gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    w, h = size
    image = Image.new("RGB", size)
    px = image.load()
    for y in range(h):
        t = y / max(1, h - 1)
        color = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        for x in range(w):
            px[x, y] = color
    return image


def _box(draw: ImageDraw.ImageDraw, xy, fill, outline=(15, 20, 30), width=2):
    draw.rectangle(xy, fill=fill, outline=outline, width=width)


def _character(draw: ImageDraw.ImageDraw, x: float, floor: float, scale: float,
               t: float, child: bool = False, scared: bool = False) -> None:
    s = scale
    bob = math.sin(t * 5.0) * 5 * s
    leg = math.sin(t * 6.0) * 13 * s
    head = 48 * s if not child else 37 * s
    body_w, body_h = (54 * s, 82 * s) if not child else (43 * s, 59 * s)
    y = floor - body_h - head - 12 * s + bob
    skin = (190, 139, 105)
    shirt = (30, 38, 55) if not child else (105, 48, 66)
    pants = (18, 23, 34)
    # Legs
    hip_y = y + head + body_h
    _box(draw, (x - 19*s, hip_y, x - 3*s + leg, floor), pants)
    _box(draw, (x + 4*s - leg, hip_y, x + 20*s, floor), pants)
    # Shoes
    _box(draw, (x - 24*s + leg, floor - 9*s, x - 1*s + leg, floor), (12, 14, 20))
    _box(draw, (x + 2*s - leg, floor - 9*s, x + 25*s - leg, floor), (12, 14, 20))
    # Torso and arms
    _box(draw, (x - body_w/2, y + head, x + body_w/2, hip_y), shirt)
    arm_swing = math.sin(t * 5.0) * 16 * s
    _box(draw, (x - body_w/2 - 15*s, y + head + 7*s + arm_swing,
                x - body_w/2, y + head + 58*s + arm_swing), skin)
    _box(draw, (x + body_w/2, y + head + 7*s - arm_swing,
                x + body_w/2 + 15*s, y + head + 58*s - arm_swing), skin)
    # Square head
    hx = x - head/2
    hy = y
    _box(draw, (hx, hy, hx + head, hy + head), skin)
    hair = (22, 20, 24)
    _box(draw, (hx, hy, hx + head, hy + 10*s), hair)
    eye_y = hy + head * .43
    eye_size = max(3, int(4*s))
    draw.rectangle((x - 11*s, eye_y, x - 11*s + eye_size, eye_y + eye_size), fill=(18, 20, 25))
    draw.rectangle((x + 7*s, eye_y, x + 7*s + eye_size, eye_y + eye_size), fill=(18, 20, 25))
    mouth_y = hy + head * .69
    if scared:
        draw.ellipse((x - 5*s, mouth_y - 4*s, x + 5*s, mouth_y + 8*s), fill=(45, 15, 20))
    else:
        draw.line((x - 7*s, mouth_y, x + 7*s, mouth_y), fill=(65, 25, 28), width=max(2, int(2*s)))


def _draw_scene(scene: dict, width: int, height: int, t: float, duration: float, index: int) -> Image.Image:
    text = (scene.get("name", "") + " " + scene.get("type", "") + " " +
            " ".join(v for values in scene.get("directives", {}).values() for v in values)).lower()
    vertical = height > width
    w = BASE_W
    h = int(BASE_W * height / width)
    # Keep a practical raster size while preserving the requested aspect ratio.
    if h > 960:
        h = 960
        w = int(h * width / height)
    progress = t / max(duration, .01)
    is_bedroom = any(k in text for k in ("quarto", "cama", "criança", "child", "bedroom"))
    is_hall = any(k in text for k in ("corredor", "escada", "hall", "stair", "porta do quarto"))
    is_outside = any(k in text for k in ("rua", "casa", "portão", "fachada", "outside", "street"))
    if is_bedroom:
        img = _gradient((w, h), (20, 27, 52), (48, 39, 56))
    elif is_hall:
        img = _gradient((w, h), (13, 19, 31), (62, 53, 48))
    elif is_outside:
        img = _gradient((w, h), (13, 24, 43), (45, 51, 63))
    else:
        img = _gradient((w, h), (20, 32, 52), (65, 65, 68))
    d = ImageDraw.Draw(img, "RGBA")
    floor = int(h * .83)
    # Background architecture and props
    if is_bedroom:
        _box(d, (int(w*.08), int(h*.18), int(w*.39), int(h*.48)), (30, 48, 73))
        d.line((w*.235, h*.18, w*.235, h*.48), fill=(95, 120, 145), width=4)
        _box(d, (int(w*.48), int(h*.62), int(w*.91), int(h*.79)), (82, 57, 64))
        _box(d, (int(w*.45), int(h*.59), int(w*.94), int(h*.66)), (125, 104, 112))
        _box(d, (int(w*.52), int(h*.55), int(w*.70), int(h*.64)), (205, 198, 183))
        _box(d, (int(w*.08), int(h*.84), int(w*.92), h), (34, 31, 42), outline=(34,31,42))
    elif is_hall:
        _box(d, (int(w*.08), int(h*.13), int(w*.34), int(h*.73)), (48, 49, 57))
        _box(d, (int(w*.65), int(h*.10), int(w*.91), int(h*.73)), (39, 42, 52))
        _box(d, (int(w*.40), int(h*.20), int(w*.64), int(h*.75)), (75, 48, 42))
        _box(d, (int(w*.43), int(h*.23), int(w*.61), int(h*.73)), (30, 25, 28))
        for step in range(5):
            y = int(h*(.65 + step*.055))
            d.line((w*.05, y, w*.42, y), fill=(110, 98, 86), width=5)
    else:
        _box(d, (int(w*.08), int(h*.38), int(w*.91), floor), (49, 57, 72))
        _box(d, (int(w*.17), int(h*.48), int(w*.36), int(h*.66)), (15, 25, 42))
        _box(d, (int(w*.62), int(h*.48), int(w*.81), int(h*.66)), (15, 25, 42))
        _box(d, (int(w*.43), int(h*.49), int(w*.58), floor), (78, 50, 42))
        d.ellipse((w*.75, h*.12, w*.84, h*.23), fill=(220, 220, 185, 190))
        # Ground plane
        _box(d, (0, floor, w, h), (28, 31, 39), outline=(28,31,39))
    # Subtle floor perspective
    for j in range(1, 6):
        yy = floor + int((h-floor)*j/6)
        d.line((0, yy, w, yy), fill=(95, 91, 88, 75), width=1)
    # Camera drift, character entrance and movement.
    center_x = w * (.34 + .30 * progress) if is_outside else w * (.50 + .06*math.sin(t*.7))
    if is_bedroom:
        # The intruder faces a seated child on the bed.
        _character(d, w*.34, floor, .76 if vertical else .68, t, scared=True)
        _character(d, w*.72, int(h*.72), .58 if vertical else .52, t*.25, child=True, scared=False)
        # Photograph held by child
        _box(d, (int(w*.77), int(h*.50), int(w*.86), int(h*.61)), (226, 218, 190))
        d.rectangle((int(w*.79), int(h*.52), int(w*.84), int(h*.57)), fill=(35, 40, 52))
    else:
        scale = .95 if vertical else .78
        if is_hall:
            center_x = w * (.48 + .12 * math.sin(progress * math.pi))
        _character(d, center_x, floor, scale, t, scared=("assust" in text or "medo" in text or "batida" in text))
        # Flashlight beam
        if any(k in text for k in ("lanterna", "flashlight", "escuro", "dark")):
            overlay = Image.new("RGBA", (w, h), (0,0,0,0))
            od = ImageDraw.Draw(overlay)
            ox, oy = int(center_x + 20), int(h*.58)
            od.polygon([(ox, oy), (w*.92, h*.18), (w*.98, h*.64)], fill=(255, 238, 165, 38))
            img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    # Scene-specific emphasis: pulse light and slight camera shake on scare scenes.
    if any(k in text for k in ("assust", "susto", "batidas", "sorrindo", "estranho")):
        pulse = int(18 + 12 * (0.5 + 0.5 * math.sin(t*8)))
        d.rectangle((0, 0, w, h), fill=(pulse, 4, 10, 18))
    # Very small moving camera-like crop shift, then upscale in FFmpeg.
    shift = int(math.sin(t*0.55) * 4)
    if shift:
        img = img.crop((max(0, shift), 0, w, h)).resize((w, h))
    return img.convert("RGB")


def render_procedural_scene(scene: dict, output: Path, duration: float,
                            width: int, height: int, fps: int, temp_dir: Path,
                            index: int) -> None:
    frames_dir = temp_dir / f"procedural_{index:04d}"
    frames_dir.mkdir(parents=True, exist_ok=True)
    count = max(2, math.ceil(duration * PREVIEW_FPS))
    for frame in range(count):
        t = frame / PREVIEW_FPS
        image = _draw_scene(scene, width, height, t, duration, index)
        image.save(frames_dir / f"frame_{frame:05d}.jpg", quality=82, optimize=False)
    pattern = str(frames_dir / "frame_%05d.jpg")
    _run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-framerate", str(PREVIEW_FPS), "-i", pattern, "-t", f"{duration:.4f}",
        "-vf", f"fps={fps},scale={width}:{height}:flags=bilinear,format=yuv420p",
        "-an", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "25",
        "-r", str(fps), str(output)
    ])
