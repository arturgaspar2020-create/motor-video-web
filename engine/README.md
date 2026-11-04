# Renderizador local — Motor Video Studio

O renderizador cria MP4 localmente com FFmpeg. Quando uma cena não tem `[asset: ...]`, gera uma animação procedural 2D simples com bonecos blocados, cenário e movimentos básicos usando Pillow. Isso é um protótipo 2D, não animação 3D real.

## O que já faz
- Lê o JSON exportado pelo botão **Salvar projeto** da interface.
- Interpreta os blocos `[cena: tipo | nome]`.
- Aceita `[asset: caminho/arquivo]` dentro de cada cena.
- Aceita `[duracao: segundos]` dentro de cada cena.
- Usa imagens com movimento de câmera suave e vídeos como fundos.\n- Gera automaticamente cenas 2D procedurais quando não há asset: fundos, personagens blocados e movimentos básicos.\n- Mantém o áudio da narração no MP4.
- Concatena as cenas e adiciona a narração.
- Informa quando os tempos são estimados, em vez de sincronização real por palavra.

## O que ainda não faz
- Não gera imagens ou modelos 3D por conta própria.
- Não renderiza GLB nem executa animações 3D.
- Não faz alinhamento forçado palavra-áudio.
- Não cria trilha, efeitos sonoros ou legendas automáticas.
- Cena sem `[asset: ...]` vira um cartão com o nome da cena; isso é intencional e evita fingir que existe um visual.

## Requisitos gratuitos no Windows
1. Python 3.10 ou superior.
2. FFmpeg instalado e disponível no PATH (os comandos `ffmpeg` e `ffprobe` precisam funcionar no CMD).
3. O projeto JSON salvo pela interface.
4. O áudio e os assets visuais em arquivos locais.

## Exemplo de roteiro

```text
@idioma pt-BR
@titulo A ponte que decidiu uma guerra

[cena: imagem | ponte]
[asset: media/ponte.jpg]
[duracao: 8]
A ponte era o único caminho para atravessar o rio.

[cena: video | exercito]
[asset: media/exercito.mp4]
[duracao: 7]
O exército inimigo avançava em direção à passagem.
```

Os caminhos de `asset` são relativos à pasta onde está o arquivo JSON do projeto ou podem ser absolutos.

## Como renderizar pela interface (novo)

1. Atualize o repositório e instale as dependências com `npm install`.\n2. Instale Pillow com `python -m pip install -r engine/requirements.txt`.
2. Inicie com `npm run dev`.
3. Abra o endereço local, carregue o áudio e clique em **GERAR MP4**.
4. O servidor local recebe o roteiro e o áudio, executa o renderizador Python e devolve o MP4 para baixar.

O endpoint de renderização existe apenas no servidor local de desenvolvimento do Vite. O áudio e o roteiro não são enviados a serviços externos.

## Como renderizar pelo terminal

Abra o CMD na pasta do projeto e execute:

```bash
python engine/render.py --project projeto-motor-video.json --audio narracao.mp3 --output video-final.mp4
```

Para escolher outro formato:

```bash
python engine/render.py --project projeto-motor-video.json --audio narracao.mp3 --output video-vertical.mp4 --width 1080 --height 1920 --fps 30
```

Se não definir `[duracao: ...]` em nenhuma cena, o motor distribui a duração total do áudio proporcionalmente à quantidade de palavras de cada cena. **Isso é uma estimativa**, não sincronização precisa. Para evitar estimativas, informe a duração de cada cena ou aguarde a futura integração de alinhamento forçado.

## Formatos de asset
- Imagens: PNG, JPG, JPEG, WEBP (dependendo dos codecs instalados no FFmpeg).
- Vídeos: MP4, MOV, MKV, WEBM, AVI (dependendo dos codecs instalados).

## Próximas etapas
1. Alinhamento de áudio por frase/palavra e edição de timeline.
2. Legendas, títulos, transições, overlays e trilhas.
3. Integração Blender para renderização 3D/GLB em CPU quando possível.
4. Gerador assistido de cenas e biblioteca local de assets.
5. Testes automatizados e instalador Windows.

O renderizador não envia arquivos para serviços externos. O processamento acontece no computador.
