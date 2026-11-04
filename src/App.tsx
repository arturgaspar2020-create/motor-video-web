import { useMemo, useRef, useState } from "react";
import { parseScript, countWords } from "./parser";

const initial = "@idioma de\n@titulo Die vergessene Expedition\n\n[cena: ambiente | Nebeliger Wald]\n[ambiente: dichter Wald bei Sonnenaufgang]\n[elementos: alte Karte, Rucksack, Taschenlampe]\n[animacao: langsame Kamerafahrt nach vorne]\nNiemand wusste, was sich hinter den Bergen verbarg. Doch an diesem Morgen sollte sich alles verändern.\n\n[cena: personagem | Der Entdecker]\n[posicoes: Figur in der Bildmitte]\n[animacao: Figur hebt die Karte und schaut nach links]\nEr hatte nur eine Karte und drei Tage Zeit, um die Wahrheit zu finden.";

type Ratio = "16:9" | "9:16" | "1:1";
const dimensions: Record<Ratio, [number, number]> = {
  "16:9": [1920, 1080],
  "9:16": [1080, 1920],
  "1:1": [1080, 1080]
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
  const [renderLog, setRenderLog] = useState("");
  const audioInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const project = useMemo(() => parseScript(script), [script]);
  const scene = project.scenes[selected];

  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function save() {
    const blob = new Blob([JSON.stringify({ script, settings: { ratio, fps } }, null, 2)], { type: "application/json" });
    download(blob, "projeto-motor-video.json");
    setStatus("Projeto salvo");
  }

  function open(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const value = JSON.parse(String(reader.result));
        setScript(value.script || initial);
        setRatio(value.settings?.ratio || "16:9");
        setFps(value.settings?.fps || "30");
        setStatus("Projeto carregado");
      } catch {
        setStatus("Arquivo JSON inválido");
      }
    };
    reader.readAsText(file);
  }

  function upload(file?: File) {
    if (!file) return;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudio(file);
    setAudioUrl(URL.createObjectURL(file));
    setStatus("Áudio carregado");
  }

  async function render() {
    if (!audio) {
      setStatus("Envie a narração antes de renderizar");
      return;
    }
    if (!project.scenes.length) {
      setStatus("Adicione pelo menos uma cena ao roteiro");
      return;
    }
    setRendering(true);
    setRenderLog("");
    setStatus("Preparando renderização...");
    try {
      const [width, height] = dimensions[ratio];
      const data = new FormData();
      data.append("project", JSON.stringify({ script, settings: { ratio, fps } }));
      data.append("audio", audio, audio.name);
      data.append("width", String(width));
      data.append("height", String(height));
      data.append("fps", fps);
      setStatus("Renderizando vídeo no computador...");
      const response = await fetch("/api/render", { method: "POST", body: data });
      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: "Falha ao renderizar." }));
        throw new Error(result.error || "Falha ao renderizar.");
      }
      const log = response.headers.get("X-Render-Log");
      if (log) {
        try { setRenderLog(atob(log)); } catch { /* log is optional */ }
      }
      const video = await response.blob();
      download(video, "motor-video-final.mp4");
      setStatus("Vídeo MP4 gerado!");
    } catch (error) {
      setStatus("Erro na renderização");
      setRenderLog(error instanceof Error ? error.message : "Erro desconhecido");
    } finally {
      setRendering(false);
    }
  }

  return <div className="app">
    <header>
      <div className="logo">🎬 <span>MOTOR VIDEO <small>STUDIO · BETA 0.3</small></span></div>
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
        <div><label>ESTÚDIO DE PRODUÇÃO AUTOMÁTICA</label><h1>Transforme seu roteiro<br/><em>em uma produção visual.</em></h1><p>Organize cenas, narração e gere seu primeiro MP4 localmente.</p></div>
        <div className="stats"><b>{project.scenes.length}<small>CENAS</small></b><b>{project.scenes.reduce((n, s) => n + countWords(s.narration), 0)}<small>PALAVRAS</small></b><b>{project.scenes.filter(s => s.narration).length}<small>COM NARRAÇÃO</small></b></div>
      </div>
      <div className="grid">
        <section className="panel"><h2>✎ ROTEIRO</h2><textarea value={script} onChange={e => setScript(e.target.value)} spellCheck={false}/><div className="muted">Use [cena: tipo | nome] para iniciar cada cena. Assets locais: [asset: media/imagem.jpg]. Duração opcional: [duracao: 8].</div></section>
        <section className="panel">
          <h2>▣ PRÉ-VISUALIZAÇÃO <span className="live">ESTRUTURAL</span></h2>
          <div className={"preview " + (ratio === "9:16" ? "vertical" : "")}><div className="sceneLabel">CENA {String(scene?.id || 0).padStart(2, "0")}</div><div className="center"><div className="play">▶</div><b>{scene?.name || "Adicione uma cena ao roteiro"}</b><small>{scene?.type || "Aguardando conteúdo"}</small></div><div className="bottom">{ratio} · {fps} FPS</div></div>
          <p className="muted">A prévia é estrutural. O MP4 é produzido pelo renderizador local.</p>
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
          <div className="muted">O processamento usa Python e FFmpeg instalados no seu computador. Não envia seu roteiro ou áudio para serviços externos.</div>
        </section>
      </div>
      <section className="panel details"><h2>DETALHES DA CENA</h2>{scene ? <><h3>{scene.name}</h3><div className="chips">{scene.directives.map((directive, index) => <span key={index}>{directive}</span>)}</div><label>NARRAÇÃO</label><p>{scene.narration || "Nenhuma fala vinculada."}</p></> : <p className="muted">Selecione uma cena.</p>}{project.warnings.map((warning, index) => <p className="warning" key={index}>{warning}</p>)}</section>
      {renderLog && <section className="panel details"><h2>LOG DA RENDERIZAÇÃO</h2><pre className="render-log">{renderLog}</pre></section>}
      <footer>MOTOR VIDEO STUDIO · BETA 0.3 <span>Renderização local integrada · híbrido 2D/3D em desenvolvimento</span></footer>
    </main>
  </div>;
}
