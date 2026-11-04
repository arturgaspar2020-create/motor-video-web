# Motor Video Studio

Editor local para transformar roteiro + narração em vídeo 3D cinematográfico estilizado.

## Estado atual — Beta 0.8

### Prévia 3D e renderização MP4
- Three.js na prévia interativa da interface.
- Remotion + Three.js para gerar o MP4 final usando Chromium/WebGL.
- Cenas procedurais com terreno, montanhas, floresta, cidade, interiores, áreas de guerra e água.
- Personagem procedural com movimentos básicos: caminhada, corrida, salto, aceno, apontar e agachar.
- Objetos procedurais por nome: mapas/livros, lanternas, espadas/facas, chaves, portas e caixas.
- Câmera com enquadramento e movimento simples guiados por [camera:] e [animacao:].
- Áudio original incluído na composição.
- Upload opcional de personagem .glb; se o arquivo tiver animações incorporadas, o motor seleciona clipes por nome e os executa no tempo da composição.
- Saída 16:9, 9:16 ou 1:1, 24/30/60 FPS conforme a interface.

### Sincronização da narração
- Por padrão, os tempos são estimados pela contagem de palavras. Isso não é alinhamento palavra por palavra.
- Há opção de alinhamento local assistido por faster-whisper, usando timestamps de palavras reconhecidas.
- O alinhamento assistido depende da transcrição reconhecer o roteiro; a cobertura é medida e, se for baixa ou o pacote não estiver instalado, o motor mantém a estimativa.
- Mesmo com faster-whisper, o método é ASR com timestamps de palavras, não um alinhador forçado perfeito. Confira o arquivo director-plan.

### Limites que continuam explícitos
- O personagem procedural é estilizado e blocado, não um humano realista.
- Para personagem profissional, envie um .glb rigado com animações incorporadas. O motor não modela automaticamente um personagem novo a partir do texto.
- Objetos e cenários são montados proceduralmente por regras; nem todo objeto ou ação de linguagem natural é reconhecido.
- O motor não cria automaticamente trilha musical, efeitos sonoros, legendas ou imagens de arquivo.
- Não há garantia de aceleração GPU em todos os drivers; Chromium tenta ANGLE/GPU e troca automaticamente para SWANGLE/software se necessário, com concorrência limitada para equilibrar a GTX 1060 de 6 GB e 16 GB de RAM.

## Instalação no Windows

Requisitos:
- Node.js 20.19+ ou 22.12+.
- Python 3.10+ (necessário para a opção de alinhamento).
- FFmpeg e FFprobe no PATH (usados para ler a duração do áudio).
- Driver NVIDIA atualizado para melhor compatibilidade WebGL/ANGLE.

Na pasta do projeto, execute:

```bash
npm install
npm run dev
```

Abra o endereço local exibido pelo Vite. Na primeira renderização, Remotion pode baixar o Chromium Headless Shell necessário.

## Como gerar

1. Cole o roteiro usando blocos `[cena: tipo | nome]`.
2. Adicione diretivas, por exemplo `[acao: o explorador caminha pela floresta]`, `[ambiente: floresta com neblina]`, `[elementos: mapa, lanterna, mochila]`, `[camera: plano aberto com aproximação]`.
3. Envie a narração.
4. Opcionalmente envie um personagem .glb rigado.
5. Opcionalmente marque **Tentar alinhar as frases com a fala usando IA local**.
6. Escolha formato/FPS e clique em **GERAR MP4**.

Exemplo:

```text
@idioma pt-BR
@titulo A expedição perdida

[cena: ambiente | Floresta com neblina]
[ambiente: floresta densa ao amanhecer]
[luz: luz dourada atravessando a neblina]
[elementos: mapa antigo, lanterna, mochila]
[acao: o explorador caminha lentamente e observa o mapa]
[camera: plano aberto com movimento de aproximação]
O explorador entrou na floresta sem saber o que encontraria.

[cena: ação | A porta esquecida]
[ambiente: interior de uma cabana abandonada]
[elementos: porta de madeira, chave, caixa]
[acao: ele pega a chave e abre a porta]
A chave girou lentamente, e a porta se abriu.
```

## Alinhamento local opcional

Para habilitar a caixa de alinhamento com IA, instale:

```bash
python -m pip install -r engine/requirements-alignment.txt
```

Na primeira execução, faster-whisper baixa o modelo `base`. O modelo roda em CPU int8 para evitar depender de CUDA; a primeira transcrição pode demorar. Se a instalação não existir ou a cobertura da transcrição for baixa, o render continua com estimativa por palavras.

## Arquivos de saída

Ao lado do MP4, o renderizador salva `*-director-plan.json`, contendo cada plano, narração, ação, objeto, câmera e timestamps usados.

## Estrutura técnica

- `src/Scene3DPreview.tsx`: prévia Three.js no editor.
- `src/remotion/`: composição Remotion, cena 3D e personagens.
- `engine/render-3d.mjs`: bundle e render MP4 com Remotion.
- `engine/align_audio.py`: alinhamento assistido opcional por faster-whisper.
- `engine/director.py`: diretor de cenas legado/planejamento Python.
- `engine/render.py`: renderizador FFmpeg 2D legado, mantido como alternativa manual.

**Importante:** o repositório recebeu a implementação, mas o build e a primeira renderização ainda precisam ser executados no Windows do usuário para confirmar compatibilidade real de dependências, driver e Chromium.
