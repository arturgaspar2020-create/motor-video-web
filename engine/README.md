# Motor Video Studio — Renderização 3D

O fluxo principal da interface usa **Remotion + Three.js** para compor cenas 3D e exportar MP4. O antigo `engine/render.py` continua disponível como renderizador 2D legado.

## Renderização pela interface (recomendado)

1. Instale Node.js 20.19+ ou 22.12+.
2. Na pasta do projeto, execute `npm install`.
3. Execute `npm run dev` e abra o endereço local do Vite.
4. Insira o roteiro com marcadores `[cena: tipo | nome]`.
5. Carregue o áudio. Opcionalmente carregue um personagem `.glb` com rig e animações.
6. Clique em **GERAR MP4**.

A primeira renderização pode baixar o Chromium Headless Shell do Remotion. O motor tenta ANGLE/WebGL e usa SWANGLE/software como fallback, com concorrência limitada para reduzir a pressão de memória.

## Personagens GLB

- O arquivo precisa ser .glb.
- Prefira um modelo humanoide rigado, com animações embutidas (por exemplo, Idle, Walk, Run).
- O motor ajusta automaticamente a altura do modelo para caber na cena.
- Se não enviar GLB, o vídeo usa o personagem procedural estilizado.
- O nome das animações ajuda a selecionar o clipe: Idle/Stand, Walk ou Run.

## Diretivas de roteiro

```text
@idioma pt-BR
@titulo Exemplo

[cena: ambiente | Floresta]
[ambiente: floresta com neblina ao amanhecer]
[luz: luz dourada atravessando as árvores]
[elementos: mapa, lanterna, mochila]
[acao: o explorador caminha e aponta para o mapa]
[camera: plano aberto com aproximação]
A narração desta cena aparece aqui.
```

Diretivas reconhecidas: `[acao:]`, `[movimento:]`, `[animacao:]`, `[ambiente:]`, `[luz:]`, `[camera:]`, `[elementos:]`, `[objetos:]`, `[posicao:]`, `[posicoes:]` e `[duracao:]`.

Os ambientes procedurais reconhecem palavras comuns em português, inglês e alemão para floresta, cidade, interior, deserto, neve, guerra e água. Objetos reconhecidos incluem mapa/livro, lanterna, espada/faca, chave, porta e caixa.

## Sincronização de áudio

Por padrão, a duração de cada plano é estimada pela quantidade de palavras na cena. Não é sincronização exata.

Para tentar timestamps de palavras com faster-whisper:

```bash
python -m pip install -r engine/requirements-alignment.txt
```

Depois marque a opção de alinhamento na interface. O modelo `base` roda em CPU int8. A primeira execução baixa os pesos. O script compara as palavras reconhecidas com o texto do roteiro e calcula a cobertura. Se a cobertura for baixa ou o pacote não estiver disponível, o renderizador mantém a estimativa e registra um aviso.

Esse recurso é reconhecimento de fala com timestamps, não forced alignment perfeito. Roteiro diferente do áudio, nomes próprios ou pronúncias incomuns podem reduzir a precisão.

## Renderizador Python 2D legado

O arquivo `render.py` não é chamado pelo botão principal de exportação 3D. Ele permanece para projetos antigos com imagens/vídeos e animação procedural 2D.

```bash
python -m pip install -r engine/requirements.txt
python engine/render.py --project projeto-motor-video.json --audio narracao.mp3 --output video-2d.mp4
```

## Diagnóstico

O MP4 e o arquivo `*-director-plan.json` são salvos no diretório temporário do trabalho durante a sessão do servidor; baixe o MP4 pela área **Vídeos gerados**. Em caso de falha, use **COPIAR RELATÓRIO** para trazer o log completo.

O build e a primeira renderização precisam ser testados no Windows de destino. Drivers WebGL, permissões de execução e disponibilidade do Chromium podem variar entre computadores.
