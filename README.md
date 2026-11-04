# Motor Video Studio

Editor e motor local de produção audiovisual, com objetivo de automatizar vídeos híbridos 2D/3D a partir de roteiro e narração.

## Estado atual — Beta 0.7 (prévia 3D em tempo real)

### Interface web
- Editor de roteiro e parser inicial de cenas.
- Lista de cenas e detalhes dos marcadores.
- Upload e reprodução local do áudio.
- Configuração de proporção e FPS.
- Salvar e abrir projeto JSON.

### Renderizador local inicial
- Script Python em `engine/render.py`.
- Renderiza cenas com imagens ou vídeos usando FFmpeg.
- Aplica movimento suave de zoom em imagens.
- Concatena as cenas e adiciona áudio.
- Durações explícitas por cena ou estimativa proporcional por palavras (sempre identificada como estimativa).


## Beta 0.6 — direção de cenas

- Adiciona `engine/director.py`, que transforma cada frase narrada em um plano identificável.
- Preserva o texto da narração e gera tempos estimados por contagem de palavras.
- Exporta um arquivo `*-director-plan.json` ao lado do MP4, com ação, expressão, câmera, ambiente, luz, objetos e efeitos indicados pelos marcadores.
- Consulte [engine/CINEMATIC_3D_SPEC.md](engine/CINEMATIC_3D_SPEC.md) para a arquitetura do futuro renderizador 3D cinematográfico.

**Importante:** esta etapa ainda não renderiza personagens 3D nem executa as ações do plano. O MP4 atual continua usando o renderizador anterior. Os tempos também são estimativas, não alinhamento palavra por palavra.


## Beta 0.7 — viewport 3D Three.js

- Adiciona Three.js ao aplicativo e uma prévia WebGL em tempo real na interface.
- A prévia constrói uma cena procedural com terreno, montanhas, árvores, iluminação, sombras, câmera, personagem blocado 3D, mochila e objeto de mapa quando indicado no roteiro.
- A animação básica reage a instruções de caminhada/corrida e mantém movimento contínuo por frame.
- O viewport limita o pixel ratio para equilibrar qualidade e desempenho em GPUs como a GTX 1060 6 GB.

**Limite desta etapa:** esta é uma cena 3D procedural de protótipo, não personagens realistas com malha/rig profissional. O MP4 continua sendo renderizado pelo pipeline FFmpeg 2D anterior; ainda não exporta esta cena Three.js para vídeo. A prévia também ainda não interpreta todas as diretivas do roteiro.

## Instalação da interface
Requer Node.js LTS:

```bash
npm install
npm run dev
```

Abra o endereço local exibido pelo Vite.

## Renderização MP4
Requer Python 3.10+, FFmpeg/FFprobe no PATH e Pillow. Instale Pillow com `python -m pip install -r engine/requirements.txt`. Consulte [engine/README.md](engine/README.md).

Comando básico:

```bash
python engine/render.py --project projeto-motor-video.json --audio narracao.mp3 --output video-final.mp4
```

## Limitações honestas desta versão
- A interface agora possui botão integrado que chama o renderizador local pelo servidor Vite.
- O renderizador inicial usa assets locais fornecidos pelo usuário; não gera imagens sozinho.
- GLB/3D, personagens animados, geração automática de assets e sincronização palavra por palavra ainda não estão implementados.
- Pré-visualização web é estrutural, não representa o MP4 final.

Veja [SPEC.md](SPEC.md) para a especificação técnica e [engine/README.md](engine/README.md) para os comandos de renderização.
