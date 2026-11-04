#!/usr/bin/env python3
"""Optional speech-timing assist using faster-whisper word timestamps.

This is ASR-assisted alignment, not a guaranteed forced aligner. It preserves the
script and reports match coverage so the renderer can fall back safely.
"""
from __future__ import annotations
import argparse, json, re, sys
from difflib import SequenceMatcher
from pathlib import Path

WORD = re.compile(r"\S+")
SENTENCE = re.compile(r"(?<=[.!?…])\s+")

def norm(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^\wÀ-ÿ]+", "", value, flags=re.UNICODE)
    return value

def script_sentences(source: str):
    scenes=[]; current=None
    for raw in source.replace("\r","").splitlines():
        line=raw.strip()
        if not line: continue
        match=re.match(r"^\[cena:\s*([^\]|]+)(?:\|\s*([^\]]+))?\]$",line,re.I)
        if match:
            if current: scenes.append(current)
            current={"name":(match.group(2) or match.group(1)).strip(),"lines":[]}
            continue
        if re.match(r"^\[[^\]]+\]$",line): continue
        if current: current["lines"].append(raw)
    if current: scenes.append(current)
    result=[]
    for scene in scenes:
        text="\n".join(scene["lines"]).strip()
        for sentence in SENTENCE.split(text):
            sentence=sentence.strip()
            if sentence: result.append(sentence)
    return result

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--audio",required=True)
    parser.add_argument("--project",required=True)
    parser.add_argument("--output",required=True)
    parser.add_argument("--model",default="base")
    args=parser.parse_args()
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("faster-whisper não instalado. Instale com: python -m pip install -r engine/requirements-alignment.txt",file=sys.stderr)
        return 3
    project=json.loads(Path(args.project).read_text(encoding="utf-8"))
    sentences=script_sentences(project.get("script",""))
    if not sentences: raise ValueError("Nenhuma frase encontrada para alinhar.")
    script_tokens=[]
    ranges=[]
    for sentence in sentences:
        start=len(script_tokens)
        script_tokens.extend(WORD.findall(sentence))
        ranges.append((start,len(script_tokens)))
    model=WhisperModel(args.model,device="cpu",compute_type="int8",cpu_threads=4)
    segments,_=model.transcribe(args.audio,word_timestamps=True,vad_filter=True)
    spoken=[]
    for segment in segments:
        for word in (segment.words or []):
            token=norm(word.word)
            if token: spoken.append({"token":token,"start":float(word.start),"end":float(word.end)})
    if not spoken: raise ValueError("O reconhecimento não retornou palavras com timestamps.")
    a=[norm(word) for word in script_tokens]
    b=[word["token"] for word in spoken]
    matcher=SequenceMatcher(None,a,b,autojunk=False)
    mapped={}
    for a0,b0,size in matcher.get_matching_blocks():
        for offset in range(size): mapped[a0+offset]=spoken[b0+offset]
    coverage=len(mapped)/max(1,len(a))
    if coverage < .45:
        raise ValueError(f"Correspondência baixa entre roteiro e áudio ({coverage:.0%}); usando estimativa.")
    # Fill unmatched script words by interpolation between the nearest matched words.
    for index in range(len(a)):
        if index in mapped: continue
        before=max((i for i in mapped if i<index),default=None)
        after=min((i for i in mapped if i>index),default=None)
        if before is not None and after is not None:
            left,right=mapped[before],mapped[after]
            ratio=(index-before)/(after-before)
            start=left["end"]+(right["start"]-left["end"])*ratio
            mapped[index]={"start":start,"end":max(start+.02,start+(right["start"]-left["end"])*.35),"token":a[index]}
        elif before is not None:
            last=mapped[before]; start=last["end"]+.02
            mapped[index]={"start":start,"end":start+.22,"token":a[index]}
        else:
            first=mapped[after]; end=first["start"]-.02
            mapped[index]={"start":max(0,end-.22),"end":max(.02,end),"token":a[index]}
    shots=[]
    for start,end in ranges:
        items=[mapped[i] for i in range(start,end)]
        shots.append({"start":max(0,min(x["start"] for x in items)),"end":max(x["end"] for x in items)})
    # Enforce monotonic non-overlap while retaining word-derived boundaries.
    previous=0.0
    for shot in shots:
        shot["start"]=max(previous,shot["start"])
        shot["end"]=max(shot["start"]+.04,shot["end"])
        previous=shot["end"]
    Path(args.output).write_text(json.dumps({"method":"faster_whisper_word_timestamps","coverage":coverage,"shots":shots},indent=2),encoding="utf-8")
    print(f"Alinhamento assistido concluído: cobertura de palavras {coverage:.0%}.")
    return 0

if __name__=="__main__":
    try: raise SystemExit(main())
    except Exception as exc:
        print("Falha no alinhamento: "+str(exc),file=sys.stderr)
        raise SystemExit(1)
