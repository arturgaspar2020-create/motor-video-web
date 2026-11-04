# Motor Video Studio

Editor e motor local de produção audiovisual, com objetivo de automatizar vídeos híbridos 2D/3D a partir de roteiro e narração.

## Estado atual — Beta 0.5 (protótipo visual 2D)

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
