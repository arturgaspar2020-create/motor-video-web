import type { Plugin } from "vite";

const OLLAMA_URL = "http://127.0.0.1:11434";
const MODEL = "qwen3:4b";

type SceneInput = { id: number; type: string; name: string; directives: string[]; narration: string; sentences: string[] };
type ShotPlan = { action: string; camera: string; objects: string[]; environment: string; character: string; emotion: string };

function parseScenes(script: string): SceneInput[] {
  const scenes: SceneInput[] = [];
  let current: SceneInput | null = null;
  const flush = () => {
    if (!current) return;
    current.narration = current.narration.trim();
    current.sentences = current.narration.split(/(?<=[.!?…])\s+/).map(value => value.trim()).filter(Boolean);
    scenes.push(current);
    current = null;
  };
  for (const line of script.replace(/\r/g, "").split("\n")) {
    const value = line.trim();
    const match = value.match(/^\[cena:\s*([^\]|]+)(?:\|\s*([^\]]+))?\]$/i);
    if (match) {
      flush();
      current = { id: scenes.length + 1, type: match[1].trim(), name: (match[2] || match[1]).trim(), directives: [], narration: "", sentences: [] };
      continue;
    }
    if (!current || !value) continue;
    if (/^\[shot:\s*\{/i.test(value)) continue;
    if (/^\[[^\]]+\]$/.test(value)) current.directives.push(value);
    else current.narration += (current.narration ? "\n" : "") + value;
  }
  flush();
  return scenes;
}

function applyShotMarkers(script: string, scenes: SceneInput[], plans: ShotPlan[][]): string {
  const lines = script.replace(/\r/g, "").split("\n");
  const output: string[] = [];
  let sceneIndex = -1;
  let sentenceIndex = 0;
  let narrationLines: string[] = [];
  const flushNarration = () => {
    if (!narrationLines.length || sceneIndex < 0) return;
    const raw = narrationLines.join(" ").trim();
    const sentences = raw.split(/(?<=[.!?…])\s+/).map(value => value.trim()).filter(Boolean);
    for (const sentence of sentences) {
      const plan = plans[sceneIndex]?.[sentenceIndex];
      if (plan) output.push("[shot: " + JSON.stringify(plan) + "]");
      output.push(sentence);
      sentenceIndex++;
    }
    narrationLines = [];
  };
  for (const line of lines) {
    const value = line.trim();
    const header = value.match(/^\[cena:\s*([^\]|]+)(?:\|\s*([^\]]+))?\]$/i);
    if (header) {
      flushNarration();
      sceneIndex++;
      sentenceIndex = 0;
      output.push(line);
      continue;
    }
    if (sceneIndex >= 0 && /^\[shot:\s*\{/i.test(value)) { flushNarration(); continue; }
    if (sceneIndex >= 0 && /^\[[^\]]+\]$/.test(value)) {
      flushNarration();
      if (!/^\[shot:/i.test(value)) output.push(line);
      continue;
    }
    if (sceneIndex >= 0 && value) narrationLines.push(value);
    else {
      flushNarration();
      output.push(line);
    }
  }
  flushNarration();
  return output.join("\n");
}

async function readJsonBody(req: any): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export function localAiApi(): Plugin {
  return {
    name: "motor-video-local-ai",
    configureServer(server) {
      server.middlewares.use("/api/ai", (req, res) => {
        const send = (code: number, data: unknown) => {
          res.statusCode = code;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          res.end(JSON.stringify(data));
        };
        const route = (req.url || "/").split("?")[0];
        if (req.method === "GET" && route === "/status") {
          void (async () => {
            try {
              const response = await fetch(OLLAMA_URL + "/api/tags", { signal: AbortSignal.timeout(3500) });
              if (!response.ok) throw new Error("Ollama não respondeu corretamente.");
              const data = await response.json() as { models?: { name: string }[] };
              const models = (data.models || []).map(item => item.name);
              const installed = models.some(name => name === MODEL || name.startsWith(MODEL + ":"));
              send(200, { online: true, model: MODEL, installed, models });
            } catch {
              send(200, { online: false, model: MODEL, installed: false, models: [] });
            }
          })();
          return;
        }
        if (req.method !== "POST" || route !== "/analyze") {
          send(404, { error: "Rota de IA não encontrada." });
          return;
        }
        void (async () => {
          try {
            const body = await readJsonBody(req);
            const script = typeof body.script === "string" ? body.script : "";
            if (!script.trim()) { send(400, { error: "Cole um roteiro antes de analisar." }); return; }
            if (script.length > 50000) { send(413, { error: "O roteiro ultrapassa 50 mil caracteres. Divida em partes menores." }); return; }
            const scenes = parseScenes(script);
            if (!scenes.length) { send(400, { error: "Não encontrei cenas. Use [cena: tipo | nome] antes de cada cena." }); return; }
            const missing = scenes.filter(scene => !scene.sentences.length);
            if (missing.length) { send(400, { error: "A cena " + missing[0].id + " não tem narração para analisar." }); return; }
            const status = await fetch(OLLAMA_URL + "/api/tags", { signal: AbortSignal.timeout(3500) }).catch(() => null);
            if (!status?.ok) { send(503, { error: "Ollama não está aberto. Instale e inicie o Ollama; depois clique em Verificar IA." }); return; }
            const tags = await status.json() as { models?: { name: string }[] };
            if (!(tags.models || []).some(item => item.name === MODEL || item.name.startsWith(MODEL + ":"))) {
              send(409, { error: "O modelo " + MODEL + " ainda não foi baixado. Execute o arquivo instalar-ia-local.bat na pasta do projeto." });
              return;
            }
            const input = scenes.map(scene => ({
              id: scene.id, scene_type: scene.type, scene_name: scene.name,
              existing_directives: scene.directives, shots: scene.sentences.map((text, index) => ({ index, narration: text }))
            }));
            const system = [
              "Você é o diretor de animação 3D do Motor Video Studio.",
              "Analise as cenas e cada frase de narração. Responda SOMENTE JSON válido, sem markdown.",
              "Retorne exatamente um item por cena e exatamente um shot por frase, na mesma ordem.",
              "Não reescreva, resuma ou traduza a narração. Não invente acontecimentos que não estejam implicados no texto.",
              "Para action use apenas: idle, walking, running, opening, closing, picking up, dropping, sitting, standing, jumping, turning, looking, reacting, pointing, waving, fighting, climbing, swimming, hiding, driving, riding, talking, searching, crawling, kneeling, pushing, pulling, carrying, aiming, shooting, none.",
              "Escolha a ação principal visível da frase. Use none se não houver ação humana clara.",
              "camera deve ser uma instrução curta em inglês: wide shot, medium shot, close-up, tracking shot, over-the-shoulder, low angle, aerial shot, point-of-view, reaction close-up ou uma combinação simples.",
              "objects deve conter apenas objetos concretos mencionados ou claramente necessários na frase, com nomes simples em inglês.",
              "environment deve ser uma descrição curta em inglês apenas se o local estiver explícito; caso contrário string vazia.",
              "character deve ser uma descrição curta em inglês se houver personagem identificável; caso contrário string vazia.",
              "emotion deve ser uma emoção visual curta em inglês ou string vazia.",
              "Não crie personagens, objetos ou cenas sem base na narração.",
              'Formato: {"scenes":[{"id":1,"shots":[{"action":"walking","camera":"tracking shot","objects":["flashlight"],"environment":"","character":"explorer","emotion":"alert"}]}]}'
            ].join(" ");
            const response = await fetch(OLLAMA_URL + "/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model: MODEL, stream: false, format: "json", think: false, keep_alive: "10m",
                options: { temperature: 0.15, num_ctx: 8192 },
                messages: [
                  { role: "system", content: system },
                  { role: "user", content: JSON.stringify(input) }
                ]
              }),
              signal: AbortSignal.timeout(15 * 60 * 1000)
            });
            if (!response.ok) {
              const detail = await response.text();
              throw new Error("Ollama retornou erro: " + detail.slice(0, 500));
            }
            const result = await response.json() as { message?: { content?: string } };
            const parsed = JSON.parse(result.message?.content || "{}") as { scenes?: { id?: number; shots?: Partial<ShotPlan>[] }[] };
            if (!Array.isArray(parsed.scenes) || parsed.scenes.length !== scenes.length) {
              throw new Error("A IA retornou uma quantidade de cenas diferente do roteiro. Tente novamente.");
            }
            const plans: ShotPlan[][] = scenes.map((scene, index) => {
              const returned = parsed.scenes![index];
              if (!Array.isArray(returned.shots) || returned.shots.length !== scene.sentences.length) {
                throw new Error("A IA não retornou uma análise para cada frase da cena " + scene.id + ". Tente novamente.");
              }
              return returned.shots.map(item => ({
                action: String(item.action || "none").slice(0, 40),
                camera: String(item.camera || "medium shot").slice(0, 120),
                objects: Array.isArray(item.objects) ? item.objects.map(value => String(value).slice(0, 60)).slice(0, 12) : [],
                environment: String(item.environment || "").slice(0, 120),
                character: String(item.character || "").slice(0, 100),
                emotion: String(item.emotion || "").slice(0, 60)
              }));
            });
            const enhancedScript = applyShotMarkers(script, scenes, plans);
            const actionCount = plans.flat().filter(item => item.action !== "none" && item.action !== "idle").length;
            const objectCount = new Set(plans.flat().flatMap(item => item.objects)).size;
            send(200, {
              ok: true, model: MODEL, enhancedScript,
              summary: { scenes: scenes.length, shots: plans.reduce((sum, item) => sum + item.length, 0), actions: actionCount, objects: objectCount },
              plan: scenes.map((scene, index) => ({ id: scene.id, name: scene.name, shots: scene.sentences.map((narration, shotIndex) => ({ narration, ...plans[index][shotIndex] })) }))
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Falha ao analisar o roteiro.";
            send(500, { error: message });
          }
        })();
      });
    }
  };
}
