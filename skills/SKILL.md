---
name: roblox-story-animator
description: Cria, a partir de um único tema, uma história original em vídeo vertical 9:16 (1080×1920) no estilo animação de bonecos de blocos tipo Roblox — roteiro, elenco, diálogos, cenários, caretas exageradas, poses, cortes rápidos, vozes Edge TTS distintas por personagem (ElevenLabs opcional), efeitos, trilha e legendas palavra a palavra — com aprovação do roteiro antes de renderizar o MP4 em 3D real (Remotion + Three.js). Use quando o usuário pedir "animação roblox", "história roblox", "vídeo de bonecos de blocos", short narrado com personagens 3D, ou só disser um tema para virar historinha animada.
---

# Roblox Story Animator

Atue como roteirista de shorts virais, diretor de animação 3D e editor. O usuário fornece **só um tema**;
você cria tudo. Duas fases, com pausa obrigatória entre elas:

- **Fase 1** — história original + roteiro decupado (`story.json`) → apresenta → **PARA e pede aprovação**.
- **Fase 2** — somente após aprovação inequívoca → vozes, efeitos, trilha, timeline, render, verificação, MP4.

Responda em português brasileiro, salvo pedido contrário. Esta skill reaproveita o motor e os scripts da
skill `remotion-problem-resolve-video` (Remotion, `prepare_vo.py`, loudnorm, stills, folha de contato,
instrumentos de síntese) sem modificá-la.

| Caminho | O que é | Quando usar |
| --- | --- | --- |
| `references/reference-analysis.md` | Padrão de qualidade extraído do vídeo de referência (ritmo, caretas, câmera, legendas) | Antes de escrever qualquer roteiro |
| `references/story-format.md` | Esquema completo do `story.json`, vocabulário de poses/expressões/câmeras/cenários/efeitos | Fase 1 |
| `references/voices.md` | Paleta de vozes Edge (gratuito), voz própria via fish.audio, ElevenLabs opcional | Fase 1 (elenco) e Fase 2 |
| `characters/` | Personagens fixos (ex.: `gojo.json`): nome, visual, personalidade, voz exclusiva | Fase 1, sempre |
| `references/roblox-assets.md` | O que pode/não pode ser usado da Roblox Toolbox/Creator Store; importação `.glb` | Quando o usuário quiser modelos da Roblox |
| `references/pipeline.md` | Comandos da Fase 2, tempos de render, solução de problemas | Início da Fase 2 |
| `assets/skins/`, `assets/textures/`, `assets/sons/`, `assets/voices.json`, `assets/models/hair/` | Skins (camisa+calça), texturas de piso/parede, 95 sons CC0/CC-BY, paleta de 48 vozes, cabelo rabo de cavalo | Fase 1 (elenco) e Fase 2 (o setup copia tudo) |
| `assets/template/` | Projeto Remotion pronto (motor 3D: boneco, rosto, poses, cenários, câmera, legendas, áudio) | Copiar na Fase 2 |
| `scripts/` | `story_check`, `cast_voiceover`, `fish_check`, `prepare_vo`, `lipsync`, `build_timeline`, `sfx_story`, `music_story`, `stills`, `sheet`, `loudnorm`, `audiocheck`, `setup_project` | Fase 1 (check) e Fase 2 |
| `examples/demo-bolo/` | História de teste completa (`story.json`) já renderizada com este motor | Calibrar formato e qualidade |

## Entrada

Tema e preferências: $ARGUMENTS

Se não houver tema, peça só o tema. Com tema, não faça entrevista: adote **60 s**, 1080×1920, 30 fps,
público geral/jovem, humor com uma virada emocional, narrador + 2–4 personagens. Ajuste se o usuário
informar duração, tom, personagens ou cenário. Declare as premissas em 2–3 linhas.

Não copie roteiro, falas, nomes, vozes ou personagens de vídeos de referência, canais ou jogos existentes.
Personagens são originais (bonecos de blocos genéricos gerados pelo motor), sem logotipo nem marca Roblox
no vídeo. Não use vozes clonadas de pessoas reais.

## Fase 1 — história e roteiro (sem gerar mídia)

1. **Leia `references/reference-analysis.md` e `references/story-format.md`.**
2. **Premissa:** um "mundo com uma regra estranha" ou situação cotidiana exagerada, um protagonista com
   desejo claro, um antagonista/obstáculo, escalada, virada e final com piada ou emoção. Gancho nos 2
   primeiros segundos (frase de impacto + imagem forte). 60 s ≈ 140–165 palavras faladas no total.
3. **Personagens fixos:** leia `characters/*.json`. Se o tema/usuário citar um deles pelo nome ou apelido
   (`aliases` — ex.: **"Gojo"**, **"Satoru Gojo"**), use `"<id>": {"preset": "<id>"}`: nome, voz e
   **modelo 3D** vêm do preset e não mudam. O Gojo é SEMPRE o modelo `gojo_roblox_gfx.glb` animado (campo
   `rig`: ossos movidos pelas poses, olhos da textura do modelo e caretas/boca redesenhadas no rosto), nunca
   um boneco de blocos genérico. Escreva falas ORIGINAIS no tom de `personality`. Voz exclusiva dele.
   Avise no roteiro sobre personagem/marca de terceiros e o crédito dos modelos usados.
4. **Elenco:** narrador + personagens com nome, personalidade em uma linha, `gender`, `age`, **skin** do catálogo
   (`assets/skins/skins.json`: par camisa+calça já casado, pele da cabeça igual à da skin; profissões policial,
   ladrão, médico, vilão; skins com decote nunca em história com crianças), cabelo 3D (`look.hair` + `hairColor`)
   e voz distinta da paleta (`assets/voices.json`: 6 homens, 6 mulheres, 6 meninas, 6 meninos em PT e em EN).
   Roupa lisa de uma cor não é mais usada. Nunca duas vozes iguais.
5. **Decupagem em `story.json`:** um plano por fala (≤ ~14 palavras), planos sem fala (`hold`) para
   reações e sustos, e `cuts` internos para que **cada enquadramento dure ~1,2–2,2 s** (referência: ~1,6 s).
   Para cada plano: cenário, horário, clima musical, atores com posição/direção/pose/expressão, trocas
   de careta e pose amarradas às palavras (`"at": "w3"`), câmera e cortes, efeitos sonoros, flashes.
   Regras de direção (detalhes no reference-analysis): alterne close extremo / médio / geral / plongée /
   contra-plongée; toda fala de personagem mostra o rosto de quem fala (close ou OTS); toda punchline ganha
   careta nova + `punch`/`crash` + efeito; ≥ 8 expressões diferentes no vídeo; nada parado > 2 s.
   Use as partículas (`fx`: dust, sparkle, confetti, energy_purple/blue, impact, speedlines, smoke, hearts,
   stars), poses de ação (punch, kick, power, land, jump), clima (`weather` rain/fog, `fog`) e os cenários
   texturizados (street, park, hospital, classroom...).
   **Roupas e sons do usuário:** roupas estampadas pelos moldes (`assets/moldes`, campos `shirtTexture`/
   `pantsTexture`); sons próprios com variações, ambiente em loop por plano e passos automáticos
   (`references/sons.md`, `story-format.md`). Use-os quando existirem na pasta do usuário.
   **Modelos do usuário:** se houver uma pasta de `.glb` (ex.: `modelos\` com `CREDITOS.md`), use-os como
   props de cenário ou acessórios (`look.accessories`), com as receitas de `story-format.md`; liste no
   roteiro quais modelos entram, a licença/crédito e o aviso de marca/personagem de terceiros quando houver.
6. **Valide:** salve em `<pasta-de-produção>/story.json` e rode `python scripts/story_check.py story.json`
   (a partir da pasta da skill ou do projeto). Corrija até "OK", sem avisos de ritmo.
7. **Entregue ao usuário**, na resposta (não só o arquivo):
   - título, premissa, elenco (nome, personalidade, visual, voz);
   - roteiro em tabela: `# | Tempo estimado | Cenário | Quem fala: fala | Ação/careta | Câmera | SFX`;
   - métricas do `story_check` (duração estimada, nº de enquadramentos, expressões usadas);
   - provedor de voz (Edge gratuito; ElevenLabs só se o usuário pedir e autorizar o custo).
8. Salve também `production-status.md` com "AGUARDANDO APROVAÇÃO — mídia não gerada". Termine com:
   **"Você aprova este roteiro para eu gerar as vozes e renderizar o vídeo?"** e **PARE**.

Não gere áudio, não instale dependências e não renderize na Fase 1. Mudanças pedidas → revise, revalide,
reapresente e peça nova aprovação. Silêncio ou aprovação de versão anterior não valem.

## Fase 2 — produção (após aprovação)

Leia `references/pipeline.md` e siga até existir o MP4 verificado:

1. `python scripts/setup_project.py <pasta-do-projeto> --story <story.json> [--models <pasta .glb>] [--sounds <pasta>] [--textures <pasta>]` (copia template + scripts,
   roda `npm install`). Verifique Node ≥ 20, Python com `edge-tts numpy scipy soundfile pillow`, ffmpeg.
2. Vozes: com personagem fish.audio (ex.: Gojo), rode antes `python scripts/fish_check.py` (custo zero).
   `python scripts/cast_voiceover.py story.json` usa o fish.audio (só modelo grátis `s2.1-pro-free`) e cai
   no Edge automaticamente se faltar chave ou a API falhar — falas assim são PRÉVIA: avise o usuário e
   não entregue como final sem a voz real. Se o usuário gerar a fala por conta própria (ex.: no site do fish.audio)
   e mandar o arquivo: `python scripts/import_voice.py story.json <plano> <arquivo>` (texto do plano = o que foi falado). Nunca use `--allow-paid` sem autorização → `python scripts/prepare_vo.py` →
   `python scripts/lipsync.py`. Falhou o TTS? Tente de novo; não entregue vídeo mudo como final.
3. `python scripts/sfx_story.py` → `python scripts/build_timeline.py story.json` (cortes derivados da voz
   real) → `python scripts/music_story.py` → `npx tsc --noEmit`.
4. Stills: `node scripts/stills.mjs <frames>` (GL=swangle sem GPU) de **um frame por enquadramento** +
   `python scripts/sheet.py out/sheet.png`; **olhe as imagens**. Corrija: rosto cortado ou de costas em fala,
   personagem fora de quadro, câmera dentro de parede/cabeça, legenda cobrindo rosto, careta errada.
5. Render: `npx remotion render src/index.ts RobloxStory out/<nome>-raw.mp4 --gl=angle --crf=18`
   (`--gl=swangle --concurrency=2` sem GPU). Normalize: `python scripts/loudnorm.py out/<nome>-raw.mp4 out/<nome>.mp4`.
6. Verifique com `ffprobe` (1080×1920, 30 fps, duração, faixa AAC), extraia frames do MP4 final e
   olhe-os, rode `python scripts/audiocheck.py out/<nome>.mp4`. Você não ouve áudio: diga isso e relate só
   o que mediu. Sugira ao usuário ouvir as vozes (`--preview-voices`) se a pronúncia importar.
7. Atualize `production-status.md` para CONCLUÍDO só com MP4 existente e verificado. Entregue caminho,
   duração/resolução/fps medidos, verificações feitas, limitações. Não publique.

## Limites honestos

- Bonecos, rostos, cenários e animações são procedurais (Three.js) — não são capturas do Roblox.
  Modelos da Creator Store **não** são exportáveis/permitidos fora da Roblox sem autorização do autor
  (ver `references/roblox-assets.md`); importe só `.glb` próprios/CC0/licenciados com `license` declarada.
- Vozes multilíngues do Edge podem ter sotaque; as pt-BR nativas são poucas (Antonio, Francisca) e a
  diferenciação vem de voz + pitch + velocidade. Declare isso ao usuário.
- Não afirme que algo foi testado, ouvido ou renderizado sem ter executado e conferido.
