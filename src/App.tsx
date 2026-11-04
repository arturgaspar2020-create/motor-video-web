import { useMemo, useRef, useState } from "react";
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
  const [selected, setSelected] = useState(0);
  const [ratio, setRatio] = useState<Ratio>("16:9");
  const [fps, setFps] = useState("30");
  const [status, setStatus] = useState("Projeto pronto");
  const [rendering, setRendering] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJobId, setActiveJobId] = useState("");
  const audioInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const project = useMemo(() => parseScript(script), [script]);
  const scene = project.scenes[selected];
  const activeJob = jobs.find(job => job.id === activeJobId) || jobs[0];

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
  function updateJob(updated: Job) {
    setJobs(previous => {
      const exists = previous.some(item => item.id === updated.id);
      return exists ? previous.map(item => item.id === updated.id ? updated : item) : [updated, ...previous];
    });
  }
  async function render() {
    if (!audio) { setStatus("Envie a narração antes de renderizar"); return; }
    if (!project.scenes.length) { setStatus("Adicione pelo menos uma cena ao roteiro"); return; }
    setRendering(true); setStatus("Preparando renderização...");
    const [width, height] = dimensions[ratio];
    const data = new FormData();
    data.append("project", JSON.stringify({ script, settings: { ratio, fps } }));
    data.append("audio", audio, audio.name); data.append("width", String(width));
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
      <div className="logo">🎬 <span>MOTOR VIDEO <small>STUDIO · BETA 0.7 · 3D PREVIEW</small></span></div>
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
        <section className="panel"><h2>✎ ROTEIRO</h2><textarea value={script} onChange={e => setScript(e.target.value)} spellCheck={false}/><div className="muted">Use [cena: tipo | nome] para iniciar cada cena. A prévia 3D procedural interpreta as diretivas básicas. O render MP4 ainda usa o renderizador atual. Duração opcional: [duracao: 8].</div></section>
        <section className="panel">
          <h2>▣ PRÉ-VISUALIZAÇÃO <span className="live">THREE.JS · 3D</span></h2>
          {scene ? <Scene3DPreview name={scene.name} type={scene.type} directives={scene.directives} ratio={ratio}/> : <div className="preview"><div className="center"><b>Adicione uma cena ao roteiro</b><small>Aguardando conteúdo</small></div></div>}
          <p className="muted">Prévia 3D em tempo real. A exportação MP4 ainda usa o renderizador anterior; a integração 3D no vídeo é a próxima etapa.</p>
        </section>
      </div>
      <div className="grid lower">
        <section className="panel"><h2>▤ LINHA DE CENAS <span className="muted">{project.scenes.length} cenas</span></h2>
          {project.scenes.map((item, index) => <button className={"scene " + (index === selected ? "chosen" : "")} key={item.id} onClick={() => setSelected(index)}><strong>{String(item.id).padStart(2, "0")}</strong><span><b>{item.name}</b><small>{item.type} · {countWords(item.narration)} palavras · {item.directives.length} marcadores</small></span>›</button>)}
          {project.scenes.length === 0 && <p className="muted">Adicione uma linha [cena: tipo | nome].</p>}
        </section>
        <section className="panel"><h2>♫ MÍDIA E CONFIGURAÇÃO</h2><label>ÁUDIO DA NARRAÇÃO</label>
          <div className="upload"><span>♫</span><div><b>{audio?.name || "Nenhum áudio carregado"}</b><small>MP3, WAV ou M4A</small></div><button onClick={() => audioInput.current?.click()}>Enviar áudio</button><input ref={audioInput} hidden type="file" accept="audio/*" onChange={e => upload(e.target.files?.[0])}/></div>
          {audioUrl && <audio controls src={audioUrl}/>}
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
      <footer>MOTOR VIDEO STUDIO · BETA 0.7 <span>Histórico de renderização · relatórios de diagnóstico · renderização local</span></footer>
    </main>
  </div>;
}
