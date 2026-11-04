"""Cinematic shot planning for Motor Video Studio Beta 0.6."""
from __future__ import annotations
import re
from typing import Any

WORD_RE = re.compile(r"\S+")
SENTENCE_RE = re.compile(r"(?<=[.!?…])\s+")
ACTION_KEYS = ("acao", "ação", "movimento", "animacao", "animação")
FIELD_ALIASES = {"ação":"acao", "animação":"animacao", "duração":"duracao",
                 "expressão":"expressao", "posição":"posicao", "objeto":"objetos"}

def words(text: str) -> int:
    return len(WORD_RE.findall(text or ""))

def split_sentences(text: str) -> list[str]:
    chunks = [p.strip() for p in SENTENCE_RE.split((text or "").strip()) if p.strip()]
    return chunks or ([text.strip()] if text and text.strip() else [])

def build_director_plan(scenes: list[dict[str, Any]], audio_duration: float) -> dict[str, Any]:
    """Preserve narration and create a sentence-level shot plan.

    Timing is estimated by word count. It is deliberately not labelled as
    forced alignment or word-level synchronization.
    """
    shot_rows = []
    scene_rows = []
    for scene_index, scene in enumerate(scenes, 1):
        fields = scene.get("directives", {})
        local = []
        for shot_index, sentence in enumerate(split_sentences(scene.get("narration", "")), 1):
            action = next((fields[k][-1] for k in ACTION_KEYS if fields.get(k)), "")
            shot = {
                "id": f"S{scene_index:03d}-P{shot_index:02d}",
                "scene_id": scene_index, "shot_number": shot_index,
                "scene_type": scene.get("type", ""), "scene_name": scene.get("name", ""),
                "narration": sentence, "word_count": words(sentence),
                "action": action,
                "expression": (fields.get("expressao") or [""])[-1],
                "camera": (fields.get("camera") or [""])[-1],
                "environment": (fields.get("ambiente") or [""])[-1],
                "lighting": (fields.get("luz") or [""])[-1],
                "objects": fields.get("elementos", []) + fields.get("objetos", []),
                "position": (fields.get("posicoes") or fields.get("posicao") or [""])[-1],
                "animation": (fields.get("animacao") or [""])[-1],
                "sound_effects": fields.get("sfx", []),
                "visual_notes": fields.get("visual", []),
                "timing": {"start": 0.0, "end": 0.0, "duration": 0.0},
                "direction_status": "directed" if action else "needs_action_detail"
            }
            local.append(shot)
            shot_rows.append(shot)
        scene_rows.append({"id":scene_index, "name":scene.get("name",""),
                           "type":scene.get("type",""), "narration":scene.get("narration",""),
                           "shots":[s["id"] for s in local]})
    total_words = sum(s["word_count"] for s in shot_rows)
    cursor = 0.0
    for i, shot in enumerate(shot_rows):
        end = (float(audio_duration) if i == len(shot_rows)-1 else
               cursor + (float(audio_duration)*shot["word_count"]/total_words if total_words else 0))
        shot["timing"] = {"start":round(cursor,3), "end":round(end,3),
                          "duration":round(end-cursor,3)}
        cursor = end
    return {
        "schema_version":"0.6", "visual_direction":"cinematic_stylized_3d",
        "timing_method":"estimated_by_word_count", "timing_is_word_aligned":False,
        "audio_duration":round(float(audio_duration),3), "total_words":total_words,
        "scene_count":len(scene_rows), "shot_count":len(shot_rows),
        "shots_missing_explicit_action":sum(1 for s in shot_rows if s["direction_status"]!="directed"),
        "scenes":scene_rows, "shots":shot_rows,
        "notice":"Timestamps are estimates, not forced alignment. Current FFmpeg renderer does not execute 3D actions or per-shot camera direction."
    }
