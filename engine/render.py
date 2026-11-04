#!/usr/bin/env python3
"""Local, free first-stage renderer for Motor Video Studio.

Supports still-image scenes and video scenes with FFmpeg. Scene durations may be
explicit ([duracao: 8]) or estimated from narration word counts and audio length.
The latter is always reported as an estimate, never as word-level synchronization.

3D/GLB rendering is intentionally not faked in this version.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

SCENE_RE = re.compile(r"^\[cena:\s*([^\]|]+)(?:\|\s*([^\]]+))?\]$", re.I)
MARKER_RE = re.compile(r"^\[([a-zA-ZÀ-ÿ_-]+)\s*:\s*(.*?)\]$")
WORD_RE = re.compile(r"\S+")


def run(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode:
        raise RuntimeError(proc.stderr[-5000:] or "FFmpeg command failed")


def probe_duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True
    )
    if result.returncode:
        raise RuntimeError("Não foi possível ler a duração do áudio. Verifique o arquivo e o FFprobe.")
    try:
        return float(result.stdout.strip())
    except ValueError as exc:
        raise RuntimeError("O FFprobe não retornou uma duração válida.") from exc


def parse_script(source: str) -> tuple[list[dict], list[str]]:
    scenes: list[dict] = []
    warnings: list[str] = []
    current: dict | None = None
    for line_no, raw in enumerate(source.replace("\r", "").splitlines(), 1):
        line = raw.strip()
        if not line:
            continue
        if line.startswith("@"):
            continue
        match = SCENE_RE.match(line)
        if match:
            if current:
                scenes.append(current)
            current = {
                "type": match.group(1).strip(),
                "name": (match.group(2) or match.group(1)).strip(),
                "directives": {},
                "narration": [],
                "line": line_no,
            }
            continue
        marker = MARKER_RE.match(line)
        if marker:
            if current is None:
                warnings.append(f"Linha {line_no}: marcador fora de uma cena: {line}")
            else:
                key, value = marker.group(1).lower(), marker.group(2).strip()
                # Accept both the documented ASCII spelling and Portuguese accents.
                if key == "duração":
                    key = "duracao"
                current["directives"].setdefault(key, []).append(value)
            continue
        if current is None:
            warnings.append(f"Linha {line_no}: texto antes da primeira cena.")
        else:
            current["narration"].append(raw)
    if current:
        scenes.append(current)
    for scene in scenes:
        scene["narration"] = "\n".join(scene["narration"]).strip()
    return scenes, warnings


def first(directives: dict, key: str, default: str = "") -> str:
    values = directives.get(key, [])
    return values[0] if values else default


def parse_seconds(value: str, label: str) -> float:
    try:
        result = float(value.replace(",", "."))
        if not math.isfinite(result) or result <= 0:
            raise ValueError
        return result
    except ValueError as exc:
        raise ValueError(f"Valor inválido em [{label}: {value}]. Use segundos maiores que zero.") from exc


def resolve_asset(raw: str, base: Path) -> Path | None:
    if not raw:
        return None
    candidate = Path(raw).expanduser()
    if not candidate.is_absolute():
        candidate = base / candidate
    candidate = candidate.resolve()
    if not candidate.is_file():
        raise FileNotFoundError(f"Asset não encontrado: {candidate}")
    return candidate


def main() -> int:
    parser = argparse.ArgumentParser(description="Renderizador local do Motor Video Studio")
    parser.add_argument("--project", required=True, help="JSON salvo pelo botão Salvar projeto")
    parser.add_argument("--audio", required=True, help="Arquivo de narração MP3/WAV/M4A")
    parser.add_argument("--output", default="video-final.mp4", help="Nome/caminho do MP4 de saída")
    parser.add_argument("--width", type=int, default=1920)
    parser.add_argument("--height", type=int, default=1080)
    parser.add_argument("--fps", type=int, default=30)
    args = parser.parse_args()

    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        print("ERRO: FFmpeg e FFprobe não foram encontrados no PATH do Windows.", file=sys.stderr)
        return 2

    project_path = Path(args.project).resolve()
    audio_path = Path(args.audio).resolve()
    output_path = Path(args.output).resolve()
    if not project_path.is_file():
        print(f"ERRO: projeto não encontrado: {project_path}", file=sys.stderr)
        return 2
    if not audio_path.is_file():
        print(f"ERRO: áudio não encontrado: {audio_path}", file=sys.stderr)
        return 2
    if args.width < 320 or args.height < 320 or args.fps not in (24, 25, 30, 50, 60):
        print("ERRO: resolução ou FPS inválido. FPS aceitos: 24, 25, 30, 50, 60.", file=sys.stderr)
        return 2

    try:
        project = json.loads(project_path.read_text(encoding="utf-8"))
        script = project.get("script", "")
        if not script.strip():
            raise ValueError("O projeto não contém roteiro.")
        scenes, warnings = parse_script(script)
        if not scenes:
            raise ValueError("Nenhuma cena [cena: tipo | nome] foi encontrada.")
        if warnings:
            print("AVISOS DO ROTEIRO:")
            for warning in warnings:
                print(" - " + warning)

        audio_duration = probe_duration(audio_path)
        explicit = []
        total_words = sum(len(WORD_RE.findall(s["narration"])) for s in scenes)
        for scene in scenes:
            raw_duration = first(scene["directives"], "duracao")
            explicit.append(parse_seconds(raw_duration, "duracao") if raw_duration else None)

        if all(value is not None for value in explicit):
            durations = [float(value) for value in explicit]
            duration_mode = "DURAÇÕES DEFINIDAS PELO USUÁRIO"
        elif any(value is not None for value in explicit):
            raise ValueError("Defina [duracao: segundos] em TODAS as cenas ou em NENHUMA. Misturar durações explícitas e estimadas não é permitido.")
        else:
            if total_words == 0:
                raise ValueError("As cenas não têm narração nem durações explícitas. Adicione fala ou [duracao: 8].")
            durations = [audio_duration * len(WORD_RE.findall(s["narration"])) / total_words for s in scenes]
            duration_mode = "ESTIMATIVA proporcional por palavras; NÃO é sincronização palavra por palavra"

        total_video = sum(durations)
        if total_video < audio_duration - 0.25:
            print(f"AVISO: vídeo ({total_video:.2f}s) é menor que o áudio ({audio_duration:.2f}s); o áudio será cortado no final.")
        if total_video > audio_duration + 0.25:
            print(f"AVISO: vídeo ({total_video:.2f}s) é maior que o áudio ({audio_duration:.2f}s); haverá silêncio após a narração.")

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix="motor_video_") as temp_name:
            temp = Path(temp_name)
            segment_files = []
            for index, (scene, duration) in enumerate(zip(scenes, durations), 1):
                asset = resolve_asset(first(scene["directives"], "asset"), project_path.parent)
                segment = temp / f"scene_{index:04d}.mp4"
                frames = max(1, round(duration * args.fps))
                if asset is None:
                    # A deliberate placeholder slate, not a fabricated scene.
                    # Keep the no-asset fallback independent of Fontconfig. Some
                    # Windows FFmpeg builds ship without a usable Fontconfig config,
                    # which makes drawtext fail before an MP4 can be produced.
                    run(["ffmpeg", "-y", "-f", "lavfi", "-i",
                         f"color=c=0x17263d:s={args.width}x{args.height}:r={args.fps}:d={duration:.4f}",
                         "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                         "-r", str(args.fps), str(segment)])
                    print(f"Cena {index}: cartão de identificação (sem asset visual).")
                else:
                    suffix = asset.suffix.lower()
                    if suffix in (".mp4", ".mov", ".mkv", ".webm", ".avi"):
                        vf = f"scale={args.width}:{args.height}:force_original_aspect_ratio=increase,crop={args.width}:{args.height},fps={args.fps}"
                        run(["ffmpeg", "-y", "-stream_loop", "-1", "-i", str(asset),
                             "-t", f"{duration:.4f}", "-vf", vf, "-an", "-c:v", "libx264",
                             "-pix_fmt", "yuv420p", "-r", str(args.fps), str(segment)])
                    else:
                        zoom = f"zoompan=z='min(zoom+0.0007,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={args.width}x{args.height}:fps={args.fps}"
                        vf = f"scale={args.width*2}:{args.height*2}:force_original_aspect_ratio=increase,crop={args.width*2}:{args.height*2},{zoom}"
                        run(["ffmpeg", "-y", "-loop", "1", "-i", str(asset), "-t",
                             f"{duration:.4f}", "-vf", vf, "-an", "-c:v", "libx264",
                             "-pix_fmt", "yuv420p", "-r", str(args.fps), str(segment)])
                    print(f"Cena {index}: asset {asset.name}")

                segment_files.append(segment)

            concat_file = temp / "concat.txt"
            concat_file.write_text("".join(f"file '{p.as_posix()}'\n" for p in segment_files), encoding="utf-8")
            joined = temp / "joined.mp4"
            run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file),
                 "-c", "copy", str(joined)])
            run(["ffmpeg", "-y", "-i", str(joined), "-i", str(audio_path),
                 "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac",
                 "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(output_path)])

        print("\nRENDER CONCLUÍDO")
        print(f"Arquivo: {output_path}")
        print(f"Cenas: {len(scenes)} | Resolução: {args.width}x{args.height} | FPS: {args.fps}")
        print(f"Áudio: {audio_duration:.2f}s | Soma das cenas: {total_video:.2f}s")
        print(f"Tempos: {duration_mode}")
        print("NOTA: renderizador inicial 2D/ vídeo. GLB/3D animado ainda não é renderizado nesta versão.")
        return 0
    except Exception as exc:
        print(f"\nFALHA NO RENDER: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
