import { useEffect, useMemo, useRef, useState } from "react";
import { parseScript, countWords } from "./parser";
import Scene3DPreview from "./Scene3DPreview";

const initial = "@idioma de\n@titulo Die vergessene Expedition\n\n[cena: ambiente | Nebeliger Wald]\n[ambiente: dichter Wald bei Sonnenaufgang]\n[elementos: alte Karte, Rucksack, Taschenlampe]\n[animacao: langsame Kamerafahrt nach vorne]\nNiemand wusste, was sich hinter den Bergen verbarg. Doch an diesem Morgen sollte sich alles verändern.\n\n[cena: personagem | Der Entdecker]\n[posicoes: Figur in der Bildmitte]\n[animacao: Figur hebt die Karte und schaut nach links]\nEr hatte nur eine Karte und drei Tage Zeit, um die Wahrheit zu finden.";

type Ratio = "16:9" | "9:16" | "1:1";
type Job = {
  id: string; status: "preparing" | "rendering" | "completed" | "error" | "canceled";
  progress: number; currentScene: number; totalScenes: number; message: string;
  log: string; createdAt: string; audioName: string; width: number; height: number; fps: number;
};
const dimensions: Record<Ratio, [number, number]> = {
  "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080]
};

export default function App() {
  const [script, setScript] = useState(initial);
  const [audio, setAudio] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [model, setModel] = useState<File | null>(null);
  const [modelUrl, setModelUrl] = useState("");
  const [alignAudio, setAlignAudio] = useState(false);
  const [selected, setSelected] = useState(0);
  const [ratio, setRatio] = useState<Ratio>("16:9");
  const [fps, setFps] = useState("30");
  const [status, setStatus] = useState("Projeto pronto");
  const [rendering, setRendering] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJobId, setActiveJobId] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiStatus, setAiStatus] = useState("Verificando IA local...");
  const [aiReady, setAiReady] = useState(false);
  const [aiSummary, setAiSummary] = useState<{scenes:number;shots:number;actions:number;objects:number}|null>(null);
  const [scriptBeforeAi, setScriptBeforeAi] = useState("");
  const audioInput = useRef<HTMLInputElement>(null);
  const modelInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const project = useMemo(() => parseScript(script), [script]);
  const scene = project.scenes[selected];
  const activeJob = jobs.find(job => job.id === activeJobId) || jobs[0];

  useEffect(() => { void checkAi(); }, []);

  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function save() {
    download(new Blob([JSON.stringify({ script, settings: { ratio, fps } }, null, 2)], { type: "application/json" }), "projeto-motor-video.json");
    setStatus("Projeto salvo");
  }
  function open(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const value = JSON.parse(String(reader.result));
        setScript(value.script || initial); setRatio(value.settings?.ratio || "16:9");
        setFps(value.settings?.fps || "30"); setStatus("Projeto carregado");
      } catch { setStatus("Arquivo JSON inválido"); }
    };
    reader.readAsText(file);
  }
  function upload(file?: File) {
    if (!file) return;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudio(file); setAudioUrl(URL.createObjectURL(file)); setStatus("Áudio carregado");
  }
  function uploadModel(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".glb")) { setStatus("O modelo precisa estar no formato .glb"); return; }
    if (modelUrl) URL.revokeObjectURL(modelUrl);
    setModel(file); setModelUrl(URL.createObjectURL(file)); setStatus("Modelo 3D carregado");
  }
  async function checkAi() {
    setAiStatus("Verificando conexão com Ollama...");
    try {
      const response = await fetch("/api/ai/status");
      const data = await response.json();
      const ready = Boolean(data.online && data.installed);
      setAiReady(ready);
      setAiStatus(!data.online ? "Ollama não está aberto" : ready ? "IA local pronta · Qwen3 4B" : "Ollama conectado · falta baixar Qwen3 4B");
    } catch {
      setAiReady(false);
      setAiStatus("Não foi possível verificar a IA local");
    }
  }

  async function analyzeScriptWithAi() {
    if (!script.trim()) { setStatus("Cole um roteiro antes de analisar"); return; }
    setAiBusy(true);
    setAiSummary(null);
    setStatus("IA local analisando roteiro...");
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha na análise da IA.");
      setScriptBeforeAi(script);
      setScript(data.enhancedScript);
      setAiSummary(data.summary);
      setStatus("Análise concluída · plano de animação aplicado ao roteiro");
      await checkAi();
    } catch (error) {
      setStatus("Não foi possível analisar o roteiro");
      window.alert(error instanceof Error ? error.message : "Erro desconhecido na IA local.");
      await checkAi();
    } finally {
      setAiBusy(false);
    }
  }

  function updateJob(updated: Job) {
    setJobs(previous => {
      const exists = previous.some(item => item.id === updated.id);
      return exists ? previous.map(item => item.id === updated.id ? updated : item) : [updated, ...previous];
    });
  }
  async function render() {
    if (!audio) { setStatus("Envie a narração antes de renderizar"); return; }
    if (!project.scenes.length) { setStatus("Adicione uma narração ao roteiro"); return; }\n    if (!/\\[shot:\\s*\\{/i.test(script)) { setStatus("Analise o roteiro com a IA antes de gerar o MP4"); window.alert("Primeiro clique em ANALISAR ROTEIRO COM IA. O motor vai criar as cenas e os planos automaticamente."); return; }
    setRendering(true); setStatus("Preparando renderização...");
    const [width, height] = dimensions[ratio];
    const data = new FormData();
    data.append("project", JSON.stringify({ script, settings: { ratio, fps } }));
    data.append("audio", audio, audio.name);
    if (model) data.append("model", model, model.name);
    data.append("align", alignAudio ? "true" : "false");
    data.append("width", String(width));
    data.append("height", String(height)); data.append("fps", fps);
    let jobId = "";
    try {
      const response = await fetch("/api/render", { method: "POST", body: data });
      const started = await response.json();
      if (!response.ok) throw new Error(started.error || "Não foi possível iniciar a renderização.");
      jobId = started.id; setActiveJobId(jobId); updateJob(started);
      setStatus("Renderizando vídeo no computador...");
      let current: Job = started;
      while (current.status === "rendering" || current.status === "preparing") {
        await new Promise(resolve => window.setTimeout(resolve, 1000));
        const check = await fetch(`/api/render/${jobId}`);
        if (!check.ok) throw new Error("Não foi possível consultar o progresso do trabalho.");
        current = await check.json(); updateJob(current);
      }
      if (current.status === "completed") setStatus("Vídeo concluído! Baixe na área Vídeos gerados.");
      else if (current.status === "canceled") setStatus("Renderização interrompida.");
      else setStatus("Erro na renderização. Abra os detalhes para ver o relatório.");
    } catch (error) {
      setStatus("Erro na renderização");
      if (jobId) {
        const found = jobs.find(item => item.id === jobId);
        if (found) updateJob({ ...found, status: "error", message: error instanceof Error ? error.message : "Erro desconhecido." });
      }
      else window.alert(error instanceof Error ? error.message : "Erro desconhecido ao iniciar renderização.");
    } finally { setRendering(false); }
  }
  async function stopRender() {
    if (!activeJobId) return;
    try {
      const response = await fetch(`/api/render/${activeJobId}/cancel`, { method: "POST" });
      const updated = await response.json(); updateJob(updated); setStatus("Interrupção solicitada...");
    } catch { setStatus("Não foi possível solicitar a interrupção."); }
  }
  function copyReport(job: Job) {
    const report = [
      "MOTOR VIDEO STUDIO — RELATÓRIO DE DIAGNÓSTICO",
      `ID: ${job.id}`, `Data: ${job.createdAt}`, `Status: ${job.status}`,
      `Mensagem: ${job.message}`, `Progresso: ${job.progress}%`,
      `Cena: ${job.currentScene}/${job.totalScenes}`, `Áudio: ${job.audioName}`,
      `Formato: ${job.width}x${job.height} @ ${job.fps} FPS`,
      "", "LOG COMPLETO:", job.log || "(nenhum log registrado)"
    ].join("\n");
    navigator.clipboard.writeText(report).then(() => setStatus("Relatório copiado! Cole aqui na conversa."))
      .catch(() => window.prompt("Copie o relatório abaixo:", report));
  }
  function downloadJob(job: Job) {
    const a = document.createElement("a"); a.href = `/api/render/${job.id}/download`;
    a.download = "motor-video-final.mp4"; a.click();
  }

  return <div className="app">
    <header>
      <div className="logo">🎬 <span>MOTOR VIDEO <small>STUDIO · BETA 0.8 · 3D RENDER</small></span></div>
      <div className="actions">
        <span className="status">● {status}</span>
        <button onClick={() => projectInput.current?.click()}>Abrir projeto</button>
        <input ref={projectInput} hidden type="file" accept=".json" onChange={e => open(e.target.files?.[0])} />
        <button onClick={save}>Salvar projeto</button>
        <button className="primary" onClick={render} disabled={rendering || !audio}>{rendering ? "Renderizando..." : "▶ GERAR MP4"}</button>
      </div>
    </header>
    <main>
      <div className="intro">
        <div><label>ESTÚDIO DE PRODUÇÃO AUTOMÁTICA</label><h1>Transforme seu roteiro<br/><em>em uma produção visual.</em></h1><p>Crie cenas, visualize ambientes e personagens 3D em tempo real, adicione narração e exporte MP4 localmente.</p></div>
        <div className="stats"><b>{project.scenes.length}<small>CENAS</small></b><b>{project.scenes.reduce((n, s) => n + countWords(s.narration), 0)}<small>PALAVRAS</small></b><b>{project.scenes.filter(s => s.narration).length}<small>COM NARRAÇÃO</small></b></div>
      </div>
      <div className="grid">
        <section className="panel"><h2>✎ ROTEIRO</h2>
          <div className="ai-box">
            <div className="ai-top"><div><b>✦ DIRETOR DE IA LOCAL</b><small>{aiStatus}</small></div><button onClick={checkAi} disabled={aiBusy}>Verificar IA</button></div>
            <p>Cole somente a narração. A IA local interpreta a história, divide em cenas e cria planos, ações, personagens, objetos e enquadramentos sem exigir comandos no texto.</p>
            <button className="primary ai-analyze" onClick={analyzeScriptWithAi} disabled={aiBusy}>{aiBusy ? "✦ ANALISANDO ROTEIRO..." : "✦ CRIAR CENAS AUTOMATICAMENTE"}</button>
            {aiSummary && <div className="ai-result"><b>PLANO APLICADO AO ROTEIRO</b><span>{aiSummary.scenes} cenas · {aiSummary.shots} planos · {aiSummary.actions} ações · {aiSummary.objects} tipos de objetos</span>{scriptBeforeAi && <button onClick={() => {setScript(scriptBeforeAi);setScriptBeforeAi("");setAiSummary(null);setStatus("Roteiro anterior restaurado");}}>Desfazer análise</button>}</div>}
            {!aiReady && <small className="ai-help">Para ativar: instale o Ollama e execute instalar-ia-local.bat na pasta do projeto. Depois clique em Verificar IA.</small>}
          </div>
          <textarea value={script} onChange={e => setScript(e.target.value)} spellCheck={false}/>
          <div className="muted">Escreva ou cole seu roteiro normalmente, sem colchetes ou instruções. Clique em CRIAR CENAS AUTOMATICAMENTE para a IA montar a estrutura visual sem alterar a narração.</div>
        </section>
        <section className="panel">
          <h2>▣ PRÉ-VISUALIZAÇÃO <span className="live">THREE.JS · 3D</span></h2>
          {scene ? <Scene3DPreview name={scene.name} type={scene.type} directives={scene.directives} ratio={ratio} modelUrl={modelUrl || undefined}/> : <div className="preview"><div className="center"><b>Cole sua narração e crie as cenas com a IA</b><small>Aguardando conteúdo</small></div></div>}
          <p className="muted">Prévia 3D em tempo real; o MP4 final também é renderizado por Remotion + Three.js.</p>
        </section>
      </div>
      <div className="grid lower">
        <section className="panel"><h2>▤ LINHA DE CENAS <span className="muted">{project.scenes.length} cenas</span></h2>
          {project.scenes.map((item, index) => <button className={"scene " + (index === selected ? "chosen" : "")} key={item.id} onClick={() => setSelected(index)}><strong>{String(item.id).padStart(2, "0")}</strong><span><b>{item.name}</b><small>{item.type} · {countWords(item.narration)} palavras · {item.directives.length} marcadores</small></span>›</button>)}
          {project.scenes.length === 0 && <p className="muted">As cenas serão criadas automaticamente depois da análise com IA.</p>}
        </section>
        <section className="panel"><h2>♫ MÍDIA E CONFIGURAÇÃO</h2><label>ÁUDIO DA NARRAÇÃO</label>
          <div className="upload"><span>♫</span><div><b>{audio?.name || "Nenhum áudio carregado"}</b><small>MP3, WAV ou M4A</small></div><button onClick={() => audioInput.current?.click()}>Enviar áudio</button><input ref={audioInput} hidden type="file" accept="audio/*" onChange={e => upload(e.target.files?.[0])}/></div>
          {audioUrl && <audio controls src={audioUrl}/>}
          <label style={{display:"block",marginTop:15}}>PERSONAGEM 3D OPCIONAL (GLB)</label>
          <div className="upload"><span>♟</span><div><b>{model?.name || "Usar personagem procedural"}</b><small>Modelo .glb com rig/animações, se disponíveis</small></div><button onClick={() => modelInput.current?.click()}>Enviar GLB</button><input ref={modelInput} hidden type="file" accept=".glb,model/gltf-binary" onChange={e => uploadModel(e.target.files?.[0])}/></div>
          {model && <button style={{marginTop:7}} onClick={() => { if(modelUrl)URL.revokeObjectURL(modelUrl);setModel(null);setModelUrl("");setStatus("Personagem procedural selecionado"); }}>Remover modelo</button>}
          <label style={{display:"flex",alignItems:"center",gap:8,marginTop:14,cursor:"pointer"}}><input type="checkbox" checked={alignAudio} onChange={e=>setAlignAudio(e.target.checked)}/> Tentar alinhar as frases com a fala usando IA local</label>
          <p className="muted">Opcional: requer faster-whisper instalado e baixa o modelo de reconhecimento na primeira execução. Se falhar, o motor usa estimativa por palavras.</p>
          <div className="settings"><div><label>FORMATO</label><select value={ratio} onChange={e => setRatio(e.target.value as Ratio)}><option>16:9</option><option>9:16</option><option>1:1</option></select></div><div><label>FPS</label><select value={fps} onChange={e => setFps(e.target.value)}><option>24</option><option>30</option><option>60</option></select></div></div>
          <button className="primary render-wide" onClick={render} disabled={rendering || !audio}>{rendering ? "RENDERIZANDO NO COMPUTADOR..." : "▶ GERAR VÍDEO MP4"}</button>
          {rendering && <button className="stop-wide" onClick={stopRender}>■ PARAR RENDERIZAÇÃO</button>}
          <div className="muted">O processamento usa Python e FFmpeg instalados no seu computador. Não envia seu roteiro ou áudio para serviços externos.</div>
        </section>
      </div>

      <section className="panel jobs-panel">
        <h2>▣ VÍDEOS GERADOS <span className="muted">{jobs.filter(job => job.status === "completed").length} concluídos · {jobs.length} trabalhos</span></h2>
        {jobs.length === 0 && <p className="muted">Ainda não há vídeos nesta sessão. Quando uma renderização terminar, o MP4 aparecerá aqui para baixar.</p>}
        {jobs.map(job => <article className="job-card" key={job.id}>
          <div className="job-top"><div><b>{job.status === "completed" ? "Vídeo pronto" : job.status === "rendering" ? "Renderizando..." : job.status === "canceled" ? "Interrompido" : "Falha na renderização"}</b><small>{job.audioName} · {job.width}×{job.height} · {job.fps} FPS</small></div><strong className={"job-status " + job.status}>{job.status === "completed" ? "CONCLUÍDO" : job.status === "rendering" ? "EM ANDAMENTO" : job.status === "canceled" ? "CANCELADO" : "ERRO"}</strong></div>
          {(job.status === "rendering" || job.status === "completed") && <><div className="progress-track"><div className="progress-fill" style={{ width: job.progress + "%" }}/></div><div className="progress-label">{job.progress}% · {job.currentScene}/{job.totalScenes} cenas · {job.message}</div></>}
          <div className="job-actions">
            {job.status === "completed" && <button className="primary" onClick={() => downloadJob(job)}>⬇ BAIXAR MP4</button>}
            {job.status === "rendering" && <button className="stop-button" onClick={stopRender} disabled={job.id !== activeJobId}>■ Parar</button>}
            {(job.status === "error" || job.status === "canceled" || job.status === "completed") && <button onClick={() => copyReport(job)}>▣ COPIAR RELATÓRIO</button>}
            <button onClick={() => setActiveJobId(job.id)}>Ver detalhes</button>
          </div>
          {activeJobId === job.id && <div className="job-details"><b>DETALHES DO TRABALHO</b><p>{job.message}</p><pre className="render-log">{job.log || "Nenhum log disponível ainda."}</pre></div>}
        </article>)}
      </section>

      <section className="panel details"><h2>DETALHES DA CENA</h2>{scene ? <><h3>{scene.name}</h3><div className="chips">{scene.directives.map((directive, index) => <span key={index}>{directive}</span>)}</div><label>NARRAÇÃO</label><p>{scene.narration || "Nenhuma fala vinculada."}</p></> : <p className="muted">Selecione uma cena.</p>}{project.warnings.map((warning, index) => <p className="warning" key={index}>{warning}</p>)}</section>
      <footer>MOTOR VIDEO STUDIO · BETA 0.8 <span>Histórico de renderização · relatórios de diagnóstico · renderização local</span></footer>
    </main>
  </div>;
}
