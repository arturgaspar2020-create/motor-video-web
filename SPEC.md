# Especificação técnica — Motor Video Studio
**Versão:** 1.0  
**Status:** especificação de implementação (não confundir com funcionalidades já prontas)  
**Objetivo:** transformar roteiro + áudio + instruções visuais explícitas em um vídeo final consistente, sem inventar cenas, perder falas ou alterar a narração.

---

## 1. Princípios inegociáveis

1. **O roteiro é a fonte da verdade.** O motor não pode criar, apagar, resumir, reordenar ou reescrever falas.
2. **Nenhuma cena fantasma.** Só existe uma cena quando ela foi declarada no roteiro ou criada explicitamente pelo usuário na interface.
3. **Nenhuma fala perdida.** Todo trecho de narração deve pertencer a uma cena ou ser sinalizado como erro bloqueante; nunca descartado silenciosamente.
4. **Instruções explícitas prevalecem.** Posição, ação, objeto, ambiente, câmera e duração definidos pelo usuário não podem ser substituídos por presets automáticos.
5. **Automação não significa adivinhação.** Quando faltar informação necessária, o sistema deve pedir uma decisão ou aplicar somente um padrão documentado e visível.
6. **Prévia não é render final.** A interface deve indicar claramente o que é simulação e o que já foi efetivamente renderizado.
7. **Falha segura.** Se houver erro de parsing, asset ausente, sincronização inválida ou cena incompleta, o sistema deve apontar o trecho exato e impedir uma exportação enganosa.
8. **Reprodutibilidade.** O mesmo projeto, assets, versões e configurações devem produzir o mesmo plano de edição, salvo recursos explicitamente aleatórios com seed registrada.

## 2. Resultado esperado

Entrada:
- roteiro em texto UTF-8;
- áudio de narração (MP3, WAV ou M4A, conforme suporte do decodificador);
- assets visuais locais ou referências de biblioteca;
- configurações do projeto.

Saída:
- vídeo MP4 H.264, 1920×1080 (16:9) ou resolução correspondente ao formato escolhido;
- áudio sincronizado, sem cortes involuntários;
- taxa de quadros configurada (padrão 30 FPS);
- relatório de validação;
- projeto editável com roteiro, cenas, assets, tempos, configurações e versão do motor.

**Importante:** esta especificação descreve o comportamento que deverá ser implementado. O beta atual ainda não entrega renderização MP4, sincronização palavra por palavra nem animação 3D completa.

## 3. Formatos de projeto

O projeto deve armazenar:
- `schemaVersion`: versão do formato de projeto;
- `engineVersion`: versão do motor;
- `projectName`;
- `language`;
- `canvas`: largura, altura, proporção e FPS;
- `scriptOriginal`: texto original integral;
- `scenes`: cenas na ordem do roteiro;
- `audio`: arquivo, duração, codec e metadados;
- `assets`: arquivos usados, tipo, origem, licença quando aplicável e hash;
- `timeline`: intervalos de áudio, cenas, ações e efeitos;
- `renderSettings`;
- `validationReport`.

Salvar e reabrir deve preservar todos os campos. Projetos de versões antigas devem passar por migração explícita; nunca descartar campos desconhecidos silenciosamente.

## 4. Gramática do roteiro

### 4.1 Diretivas globais

Exemplo:
```text
@idioma pt
@titulo Como uma ponte pode decidir o destino de uma guerra
@formato 16:9
@fps 30
```

Regras:
- Diretivas globais só valem antes da primeira cena, salvo se uma diretiva for documentada como local.
- Diretiva desconhecida gera aviso; diretiva inválida gera erro.
- O motor não deve interpretar uma palavra comum da narração como diretiva.
- Idioma deve aceitar códigos documentados (ex.: `pt-BR`, `en-US`, `de-DE`, `es-ES`, `ru-RU`).

### 4.2 Declaração de cena

Forma:
```text
[cena: tipo | nome]
```

Exemplo:
```text
[cena: 3d | ponte_medieval]
A ponte era o único caminho para atravessar o rio...
```

Regras:
- Cada declaração inicia exatamente uma cena.
- `tipo` deve pertencer ao catálogo de tipos implementados (por exemplo: `3d`, `2d`, `arquivo`, `imagem`, `video`). Tipos não implementados devem ser marcados como indisponíveis, não convertidos silenciosamente.
- `nome` é um identificador estável, único no projeto, sem espaços ambíguos; o nome visível pode ser separado do identificador.
- O nome não autoriza o motor a inventar conteúdo. Ele serve para localizar a cena/asset configurado.
- Ordem das cenas no arquivo é a ordem da timeline, exceto quando o usuário inserir uma diretiva explícita de ordenação.

### 4.3 Blocos de narração

- O texto depois do marcador de cena e antes do próximo marcador pertence àquela cena.
- Linhas em branco podem separar parágrafos, mas não criam cenas.
- Preservar pontuação, acentos, maiúsculas, números, contrações e palavras exatamente.
- Remover apenas espaços técnicos no início/fim de linhas quando isso não alterar a fala; preservar o texto original em `scriptOriginal`.
- Texto antes da primeira cena deve ser reportado como conteúdo órfão. Nunca ignorar.
- Cena sem narração é permitida somente se marcada como visual sem fala; caso contrário, avisar.
- Toda palavra falada no áudio deve ser conciliada com o texto; diferenças são reportadas.

### 4.4 Marcadores locais

Marcadores locais afetam somente a cena/bloco em que aparecem, até serem substituídos ou encerrados conforme a regra de cada marcador.

**Ambiente**
```text
[ambiente: ponte de pedra sobre rio largo, muralhas ao fundo]
```

**Elementos/objetos**
```text
[elementos: ponte de pedra; rio; estandartes; soldados]
```

**Posições**
```text
[posicoes: comandante=esquerda_frente; soldados=centro; ponte=centro_fundo]
```

**Ação**
```text
[acao: comandante aponta para a ponte]
[acao: soldados atravessam em formação]
```

**Animação**
```text
[animacao: soldados | andar | velocidade: 1.0]
[animacao: comandante | apontar | intensidade: 1.0]
```

**Câmera**
```text
[zoom: ponte | em: 2 | forca: 1.6]
[afasta: alvo=ponte | duracao: 2.0]
[panoramica: esquerda_para_direita | duracao: 4.0]
[tremor: intensidade=0.3 | duracao=0.5]
```

**Efeitos/elementos gráficos**
```text
[flash: branco | duracao: 0.2]
[seta: de=texto | para=ponte]
[aponta: ponte]
[holofote: ponte]
[cartela: A ÚNICA PASSAGEM]
[contador: 3]
[destaque: ponte]
```

Regras gerais:
- O parser deve reconhecer apenas marcadores documentados.
- Cada marcador tem esquema, tipos, limites, unidade e comportamento definidos em catálogo versionado.
- Parâmetros duplicados ou incompatíveis geram erro de validação.
- Valores fora dos limites devem ser rejeitados ou limitados com aviso explícito; nunca corrigidos sem registro.
- Marcador desconhecido deve aparecer na lista de erros com linha e conteúdo original.
- Um marcador não pode consumir ou apagar texto de narração adjacente.

## 5. Catálogo de ações e animações

Cada ação precisa ter:
- nome interno;
- aliases aceitos;
- tipos de personagem/objeto compatíveis;
- duração padrão e intervalo permitido;
- pose inicial e final;
- transições;
- dependências de rig/armature;
- comportamento se o asset não suportar a ação.

Ações iniciais recomendadas:
- idle/respirar;
- andar;
- correr;
- virar;
- apontar;
- olhar para alvo;
- levantar objeto;
- soltar objeto;
- sentar/levantar;
- lutar/atacar/defender (somente quando houver animações apropriadas);
- cair;
- entrar/sair do quadro.

Não inventar animação inexistente. Se o modelo GLB não possuir rig ou animação compatível, mostrar erro e oferecer substituição por asset compatível ou animação procedural aprovada. Não simular luta com um modelo parado.

## 6. Biblioteca de assets 2D e 3D

Cada asset deve ter:
- ID único;
- nome;
- tipo (GLB, imagem, vídeo, áudio, textura, fonte);
- caminho local ou URL validada;
- hash/checksum;
- dimensões e metadados;
- licença/origem quando aplicável;
- tags;
- compatibilidade (rig, ações, materiais);
- status (disponível, ausente, inválido).

### 6.1 Modelos GLB
- Validar se o arquivo abre, escala, materiais e texturas.
- Detectar armature/skeleton e animações disponíveis.
- Mostrar lista de animações reais presentes no GLB.
- Permitir mapear nomes de animação do roteiro para clipes reais.
- Não presumir que todo GLB é animável.
- Guardar escala, rotação, posição, ponto de origem e correções por projeto.

### 6.2 Objetos e cenários
- Objetos devem ser instanciados somente quando declarados no roteiro ou adicionados pelo usuário.
- Objetos repetidos devem ter IDs individuais quando suas ações/posições forem diferentes.
- Cenários devem ter dimensões e pontos de colisão/apoio quando necessários.
- Ausência de objeto obrigatório deve bloquear render ou pedir substituição.

### 6.3 Imagens e vídeos
- Preservar proporção; não esticar.
- Aplicar crop/letterbox/pan conforme configuração explícita.
- Guardar origem e licença.
- Vídeo de arquivo deve ter faixa de entrada/saída validada.
- Não usar asset remoto sem confirmar que está acessível; baixar e registrar cópia/hash quando permitido.

## 7. Posições, espaço e continuidade

- Sistema de coordenadas documentado: X horizontal, Y profundidade, Z vertical (ou outro padrão único, nunca misturar).
- Unidades padrão em metros.
- Posições relativas devem ser resolvidas para coordenadas finais antes do render.
- Alvos de câmera devem apontar para IDs existentes.
- O motor deve validar colisões óbvias, objetos fora do quadro e personagens ocultos.
- Continuidade entre cenas não é presumida. Se um personagem/objeto precisa continuar, isso deve estar indicado ou ser configurado pelo usuário.
- Não mover personagem de um lado para outro sem instrução, salvo transição automática claramente identificada e configurável.

## 8. Câmera e movimento

Cada comando de câmera deve gerar uma faixa temporal com:
- tipo de movimento;
- alvo;
- início/fim;
- duração;
- intensidade;
- curva de easing;
- estado inicial/final.

Movimentos suportados na primeira etapa:
- zoom in/out;
- pan horizontal/vertical;
- tilt;
- dolly in/out;
- orbit simples;
- shake controlado;
- foco/destaque de alvo.

Regras:
- Não executar dois movimentos incompatíveis simultaneamente sem uma composição definida.
- Movimento deve ser suave, sem saltos de posição.
- Respeitar limites de câmera e manter o alvo visível quando possível.
- Efeitos devem ter intensidade limitada e ser editáveis na timeline.
- Movimento automático de câmera só pode ser aplicado por preset visível, desligável e registrado no projeto.

## 9. Sincronização da narração

A sincronização é uma parte crítica e não pode ser estimada somente dividindo a duração total do áudio pelo número de cenas.

### 9.1 Hierarquia de precisão
1. Timestamps de palavras/frases fornecidos pelo usuário ou por alinhador forçado.
2. Alinhamento automático texto-áudio (forced alignment) com idioma correto.
3. Segmentação por frases com detecção de silêncio, com confiança reportada.
4. Distribuição aproximada apenas como último recurso, marcada como estimativa e nunca apresentada como sincronização exata.

### 9.2 Procedimento
- Ler duração, sample rate, canais e codec.
- Normalizar uma cópia de trabalho sem alterar o arquivo original.
- Comparar transcrição com texto do roteiro.
- Alinhar palavras/frases e produzir timestamps.
- Detectar palavras não alinhadas, texto extra, trechos inaudíveis e baixa confiança.
- Associar cada intervalo ao bloco/cena correspondente.
- Permitir ajuste manual de início/fim na timeline.
- Manter o áudio contínuo por padrão; não cortar pausas naturais sem autorização.
- Ao renderizar, usar timestamps reais e garantir que o áudio não acelere nem desacelere.

### 9.3 Relatório de sincronização
Exibir:
- duração total do áudio;
- quantidade de palavras do roteiro;
- palavras alinhadas/não alinhadas;
- cenas sem faixa de áudio;
- trechos com confiança baixa;
- diferenças entre transcrição e roteiro;
- origem dos tempos (manual, alinhador, estimativa).

Se o alinhamento não for confiável, a exportação deve exigir confirmação.

## 10. Timeline

A timeline deve conter faixas separadas:
- narração;
- vídeo/imagem de fundo;
- personagens;
- objetos;
- câmera;
- efeitos;
- títulos/legendas;
- música e efeitos sonoros (se adicionados pelo usuário).

Cada item tem início, fim, camada, origem e parâmetros. Não permitir duração negativa, sobreposição inválida ou item fora do tempo do projeto sem aviso.

O usuário deve poder:
- arrastar e ajustar início/fim;
- dividir/mesclar clipes;
- substituir asset;
- bloquear faixas;
- silenciar faixas;
- visualizar forma de onda;
- desfazer/refazer;
- voltar à versão anterior.

## 11. Renderização

### 11.1 Perfil padrão
- MP4;
- vídeo H.264;
- áudio AAC;
- 1920×1080;
- 30 FPS;
- pixel aspect ratio 1:1;
- áudio estéreo quando a fonte for estéreo;
- preservar duração original da narração;
- sem watermark do aplicativo.

### 11.2 Perfis alternativos
- 9:16: 1080×1920;
- 1:1: 1080×1080;
- FPS selecionável, validando compatibilidade dos assets.

### 11.3 Arquitetura sugerida
- Editor web: React/TypeScript.
- Prévia: renderização leve no navegador, com limite de qualidade/complexidade.
- Render final: processo separado, preferencialmente FFmpeg para composição 2D e pipeline 3D dedicado (ex.: Blender headless) para cenas 3D.
- Orquestração por fila de tarefas, com progresso, cancelamento e logs.
- Nunca prometer render final dentro do navegador se o processo não estiver implementado.

### 11.4 Robustez
- Render em arquivo temporário.
- Validar saída com ffprobe.
- Conferir resolução, FPS, duração, codec e presença de áudio.
- Só marcar como concluído depois da validação.
- Em falha, manter logs e permitir repetir sem perder o projeto.
- Não substituir um MP4 anterior até o novo arquivo passar na validação.

## 12. Validação antes de exportar

Erros bloqueantes:
- roteiro com texto órfão;
- marcador desconhecido ou inválido;
- ID de cena duplicado;
- asset obrigatório ausente;
- alvo de câmera inexistente;
- ação não suportada pelo modelo;
- timestamps inválidos;
- áudio ausente quando obrigatório;
- divergência de narração não confirmada;
- configuração de render incompatível.

Avisos:
- cena sem movimento;
- baixa confiança de alinhamento;
- objeto possivelmente fora do quadro;
- asset de baixa resolução;
- transição abrupta;
- cena muito curta para a ação solicitada.

O relatório deve indicar arquivo, linha, cena e correção sugerida. Não corrigir automaticamente erros bloqueantes.

## 13. Interface do usuário

Telas essenciais:
1. **Projeto:** nome, idioma, formato, FPS e assets.
2. **Roteiro:** editor com números de linha, realce de marcadores e erros inline.
3. **Cenas:** lista na ordem original, sem cenas inventadas.
4. **Assets:** biblioteca com busca, preview, compatibilidade e estado.
5. **Timeline:** faixas de áudio, cenas, personagens, câmera e efeitos.
6. **Prévia:** aviso visível quando for apenas simulação.
7. **Exportação:** perfil, progresso, logs, cancelamento e validação.
8. **Relatório:** checklist completo e exportável.

Toda ação importante deve ter feedback. Botões desabilitados devem explicar o motivo.

## 14. Testes obrigatórios

### 14.1 Integridade do roteiro
- roteiro com uma cena;
- várias cenas;
- parágrafos e linhas em branco;
- acentos e caracteres especiais;
- texto antes da primeira cena;
- marcador desconhecido;
- cena sem fala;
- nome de cena repetido;
- roteiro vazio.

Critério: a concatenação dos blocos de narração deve corresponder exatamente ao texto falado extraído, sem perda nem duplicação.

### 14.2 Sincronização
- áudio mais curto que o texto;
- áudio mais longo que o texto;
- silêncio inicial/final;
- pausas longas;
- fala rápida;
- números, datas e nomes próprios;
- diferentes idiomas;
- trecho repetido;
- texto não pronunciado.

Critério: nenhuma estimativa deve ser rotulada como exata; divergências precisam ser visíveis.

### 14.3 Assets e animação
- GLB válido com rig;
- GLB sem rig;
- GLB com várias animações;
- animação solicitada inexistente;
- textura ausente;
- asset corrompido;
- objeto inexistente;
- personagem fora da câmera.

Critério: o motor nunca finge que uma ação foi executada se o asset não a suporta.

### 14.4 Render
- 16:9, 9:16 e 1:1;
- 24/30/60 FPS;
- áudio mono e estéreo;
- render cancelado;
- falta de espaço;
- arquivo final corrompido;
- render repetido;
- projeto reaberto.

Critério: validar o arquivo final tecnicamente antes de exibir sucesso.

## 15. Etapas de implementação

A implementação deve seguir esta ordem para evitar construir animações sobre um parser instável:

**Fase 1 — Parser e integridade**
- gramática formal;
- preservação exata do texto;
- IDs e ordem das cenas;
- validação com mensagens por linha;
- testes automatizados.

**Fase 2 — Projeto e timeline**
- schema versionado;
- salvar/abrir;
- faixas e timestamps;
- desfazer/refazer.

**Fase 3 — Áudio e sincronização**
- leitura de metadados;
- alinhamento por idioma;
- waveform;
- relatório de confiança;
- ajuste manual.

**Fase 4 — Assets 2D e composição**
- biblioteca;
- imagens/vídeos;
- movimentos de câmera;
- títulos e overlays;
- exportação MP4 via FFmpeg.

**Fase 5 — 3D**
- importação GLB;
- validação de rig/animações;
- cena, luzes, materiais, câmera e posicionamento;
- animações e transições;
- render 3D.

**Fase 6 — Automação e qualidade**
- presets configuráveis;
- validação de continuidade;
- render em fila;
- recuperação de falhas;
- relatório final.

Não avançar para a fase seguinte enquanto os critérios de aceitação da fase atual não passarem.

## 16. Critérios finais de aceitação

O motor só pode ser considerado pronto quando:
- importa roteiro e áudio sem perder conteúdo;
- lista exatamente as cenas declaradas;
- não cria cenas extras;
- sinaliza todo texto não associado;
- alinha narração com timestamps confiáveis ou identifica claramente estimativas;
- executa somente ações suportadas pelos assets;
- respeita posições, ambiente, objetos e câmera;
- gera MP4 real e validado;
- mantém áudio sincronizado;
- permite salvar, fechar e reabrir sem perda;
- passa pelos testes obrigatórios;
- documenta claramente limitações e formatos suportados.

## 17. Regra de honestidade do produto

A interface deve distinguir estes estados:
- **Implementado:** funcionalidade executada e testada.
- **Parcial:** funciona apenas em condições documentadas.
- **Simulado:** apenas representação visual, sem render real.
- **Planejado:** ainda não implementado.
- **Erro:** não foi possível executar.

Nunca exibir “vídeo pronto”, “3D animado” ou “sincronizado” se apenas uma prévia ou estimativa foi produzida.

---

## 18. Próxima entrega técnica

A primeira entrega após esta especificação deve ser a **Fase 1 completa**: parser formal, preservação integral da narração, validação linha a linha e testes automatizados. Só depois disso o motor deve receber timeline, áudio e renderização. Essa ordem reduz o risco de repetir problemas como cenas fantasmas, falas zeradas e tempos distribuídos artificialmente.
