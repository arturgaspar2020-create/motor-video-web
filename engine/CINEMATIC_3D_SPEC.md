# Motor Video Studio — Beta 0.6 cinematic 3D architecture

## Visual target
Cinematic stylized 3D: expressive original characters, detailed optimized sets, readable props, coherent lighting, depth, deliberate composition and film-like camera movement. Not flat 2D and not a promise of photorealism.

## Production stages
1. Narration lock: preserve the user's spoken text exactly.
2. Audio timing: align supplied narration to the script. Current fallback estimates timestamps from word counts; never claim exact word alignment until an aligner has actually run.
3. Shot director: split narration into short visual beats; every beat receives an ID, exact narration, timing, action, expression, camera, set, props, lighting and sound notes.
4. Asset resolver: select reusable, licensed GLB characters, props, materials and modular environments. Never silently download unknown assets.
5. 3D scene builder: assemble a Three.js scene from shot data.
6. Animation runner: execute character rigs, object interactions, facial expressions, camera moves and environmental effects against the timeline.
7. Render and QC: preview first, inspect a contact sheet, render final resolution, verify audio/video duration.

## Recommended runtime
- Three.js for 3D scenes and GLB loading.
- Remotion for deterministic frame-based video sequencing and final composition.
- Blender for optional asset preparation, rig cleanup and animation authoring.
- FFmpeg for audio muxing, normalization and final file checks.
- Quaternius for suitable stylized character/animation assets.
- Poly Haven for CC0 materials, HDRIs and environment props.

Support CPU/software-render fallback. Complex scenes must be budgeted with reusable assets, texture-size limits, instancing and level-of-detail.

## Shot direction contract
Each spoken sentence becomes a shot by default. Long sentences may be split into visual beats without changing, omitting or rewriting narration. Every shot should specify:
- exact narration substring and start/end seconds;
- observable physical action written as sequential verbs;
- actor IDs, screen position, facing, pose and expression;
- named props, positions and interaction (hold, open, drop, point, use);
- location, time, weather, set dressing and atmosphere;
- shot size, angle, lens intent, camera movement, focus target and transition;
- key/fill/rim lighting and motivated light sources;
- sound effects anchored to an action or time;
- continuity state carried from the previous shot.

## Script markers
- [cena: tipo | nome]
- [acao: ...], [expressao: ...], [camera: ...]
- [ambiente: ...], [luz: ...]
- [elementos: ...] / [objetos: ...]
- [posicao: ...] / [posicoes: ...]
- [animacao: ...], [sfx: ...]

Current director copies scene-level notes to sentence shots. For shot-specific direction, use a separate [cena:] marker for each distinct visual beat.

## Continuity rules
- Clothes, hair, body proportions and identity remain stable.
- Props persist until explicitly moved, used, removed or handed over.
- A door stays open after being opened unless another action closes it.
- Actor positions and facing carry across connected shots.
- The camera must show the object/person named by the narration.
- Never invent a visible event that contradicts spoken words.
- For abstract narration, use a relevant visual metaphor or environment insert, not an unrelated action.

## Honest implementation status
Beta 0.6 adds a machine-readable shot plan and documents the 3D renderer contract. It does not yet render 3D characters, perform exact forced alignment, or execute planned actions in the final MP4. Those require the Three.js/Remotion renderer, licensed model assets, rig/animation mappings and audio-alignment integration.
