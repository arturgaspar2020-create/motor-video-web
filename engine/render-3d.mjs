import {bundle} from "@remotion/bundler";
import {selectComposition, renderMedia} from "@remotion/renderer";
import {spawn} from "node:child_process";
import {promises as fs} from "node:fs";
import path from "node:path";
import os from "node:os";
import process from "node:process";

const args = Object.fromEntries(process.argv.slice(2).reduce((all, value, index, list) => {
  if (value.startsWith("--")) all.push([value.slice(2), list[index + 1]]);
  return all;
}, []));
const required = ["project", "audio", "output", "width", "height", "fps"];
for (const key of required) if (!args[key]) throw new Error("Argumento obrigatório ausente: --" + key);
const projectPath = path.resolve(args.project);
const audioPath = path.resolve(args.audio);
const outputPath = path.resolve(args.output);
const width = Number(args.width), height = Number(args.height), fps = Number(args.fps);
if (!Number.isInteger(width) || !Number.isInteger(height) || width < 320 || height < 320) throw new Error("Resolução inválida.");
if (![24,25,30,50,60].includes(fps)) throw new Error("FPS inválido. Use 24, 25, 30, 50 ou 60.");
const project = JSON.parse(await fs.readFile(projectPath, "utf8"));
if (typeof project.script !== "string" || !project.script.trim()) throw new Error("O projeto não contém roteiro.");

function probeDuration(file) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffprobe", ["-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",file], {windowsHide:true});
    let out="", err="";
    child.stdout.on("data", chunk => out += chunk);
    child.stderr.on("data", chunk => err += chunk);
    child.on("error", reject);
    child.on("close", code => {
      const duration = Number(out.trim());
      if (code !== 0 || !Number.isFinite(duration) || duration <= 0) reject(new Error("Não foi possível ler a duração do áudio. " + err));
      else resolve(duration);
    });
  });
}
function inferAction(text) {
  const rules = [
    ["running", /\b(run|runs|running|ran|sprint|corr(?:e|eu|endo|er)|fug(?:e|iu|indo|ir)|rennt|rennen|sprintet)\b/i],
    ["walking", /\b(walk|walks|walking|walked|caminh(?:a|ou|ando|ar)|and(?:a|ou|ando)|geht|ging|wandert)\b/i],
    ["opening", /\b(open|opens|opened|opening|abr(?:e|iu|indo|ir)|öffnet|öffnete|oeffnet)\b/i],
    ["closing", /\b(close|closes|closed|closing|fech(?:a|ou|ando|ar)|schließt|schloss)\b/i],
    ["picking up", /\b(pick(?:s)? up|picked up|grab(?:s|bed)?|take(?:s)?|took|peg(?:a|ou|ando)|apanh(?:a|ou|ando)|nimmt|nahm)\b/i],
    ["dropping", /\b(drop(?:s|ped)?|falls?|fell|falling|derrub(?:a|ou|ando)|cai(?:u|ndo)|fällt|fiel)\b/i],
    ["sitting", /\b(sit(?:s|ting)?|sat|senta(?:-se|r)?|sentou|sentado|setzt sich|saß)\b/i],
    ["standing", /\b(stand(?:s|ing)?|stood|levanta(?:-se|r)?|levantou|aufstehen|steht auf)\b/i],
    ["jumping", /\b(jump(?:s|ed|ing)?|salta(?:r|ou|ndo)?|pula(?:r|ou|ndo)?|springt|sprang)\b/i],
    ["turning", /\b(turn(?:s|ed|ing)?|vira(?:-se|r)?|virou|gira(?:r|ou)?|dreht sich|drehte sich)\b/i],
    ["looking", /\b(look(?:s|ed|ing)?|watch(?:es|ed)?|observ(?:a|ou|ando)|olha(?:r|ou|ndo)?|encara|blickt|sieht)\b/i],
    ["reacting", /\b(hear(?:s|d|ing)?|heard|sound|noise|barulho|ru[ií]do|assust(?:a|ou|ado)|surpris(?:e|ed)|startl(?:e|ed)|reag(?:e|iu|indo)|erschrickt)\b/i],
    ["pointing", /\b(point(?:s|ed|ing)?|apont(?:a|ou|ando)|zeigt|deutet)\b/i],
    ["waving", /\b(wav(?:e|es|ed|ing)|acen(?:a|ou|ando)|winkt)\b/i]
  ];
  for (const [action, pattern] of rules) if (pattern.test(text)) return action;
  return "";
}
function inferCamera(text, fallback) {
  if (/face|rosto|assust|surpris|heard|barulho|ru[ií]do|reaction|reag/i.test(text)) return "close-up reaction";
  if (/run|corr|fug|sprint|rennt/i.test(text)) return "tracking shot following the moving character";
  if (/open|abr|door|porta|window|janela/i.test(text)) return "medium shot with close-up on the interaction";
  if (/look|olha|observ|vê|see|sieht/i.test(text)) return "over-the-shoulder point of view";
  return fallback || "cinematic medium shot";
}
function normalizeWords(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function splitObjectLabels(values) {
  return values.flatMap(value => String(value || "").split(/[,;\n]+|\s+e\s+/i).map(item => item.trim()).filter(Boolean));
}
function inferObjects(text) {
  const source = normalizeWords(text);
  const rules = [
    ["clock", /\b(clock|watch|relogio|horas|uhr)\b/],
    ["door", /\b(door|porta|portao|tur)\b/],
    ["window", /\b(window|janela|fenster)\b/],
    ["flashlight", /\b(flashlight|lantern|lanterna|torch|tocha|laterne|taschenlampe)\b/],
    ["photo", /\b(photo|photograph|picture|fotografia|foto|imagem)\b/],
    ["bed", /\b(bed|cama|bett)\b/],
    ["stairs", /\b(stairs|staircase|escadas|escadaria|treppe)\b/],
    ["car", /\b(car|vehicle|carro|automovel|auto)\b/],
    ["tree", /\b(tree|arvore|arvores|baum|baeume)\b/],
    ["backpack", /\b(backpack|mochila|rucksack)\b/],
    ["rock", /\b(rock|stone|pedra|rocha|stein)\b/],
    ["river", /\b(river|rio|stream|ribeiro)\b/],
    ["map", /\b(map|mapa|karte)\b/],
    ["key", /\b(key|chave|schlussel)\b/],
    ["book", /\b(book|livro|buch)\b/]
  ];
  return rules.filter(([, pattern]) => pattern.test(source)).map(([name]) => name);
}
function parseScript(source) {
  const scenes=[]; let current=null; const warnings=[];
  const flush=()=>{if(current){current.narration=current.narration.join("\n").trim();scenes.push(current);current=null;}};
  source.replace(/\r/g,"").split("\n").forEach((raw,index)=>{
    const line=raw.trim(); if(!line || line.startsWith("@"))return;
    const match=line.match(/^\[cena:\s*([^\]|]+)(?:\|\s*([^\]]+))?\]$/i);
    if(match){flush();current={id:scenes.length+1,type:match[1].trim(),name:(match[2]||match[1]).trim(),directives:{},shotDirectives:[],narration:[]};return;}
    const marker=line.match(/^\[([^:]+):\s*([^\]]*)\]$/);
    if(marker){if(current){const key=marker[1].trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");if(key==="shot"){try{current.shotDirectives.push(JSON.parse(marker[2].trim()));}catch{console.log("AVISO: marcador [shot:] inválido na linha "+(index+1));}}else (current.directives[key]??=[]).push(marker[2].trim());}else warnings.push("Marcador fora de cena na linha "+(index+1));return;}
    if(current)current.narration.push(raw);else warnings.push("Texto antes da primeira cena na linha "+(index+1));
  });
  flush(); return {scenes,warnings};
}
const {scenes,warnings}=parseScript(project.script);
if(!scenes.length) throw new Error("Nenhuma cena encontrada. Use [cena: tipo | nome].");
for (const warning of warnings) console.log("AVISO: "+warning);
const audioDuration=await probeDuration(audioPath);
const totalWords=scenes.reduce((sum,scene)=>sum+(scene.narration.match(/\S+/g)||[]).length,0);
if(!totalWords) throw new Error("As cenas não possuem narração.");
const explicit=scenes.map(scene=>scene.directives.duracao?.[0]||null);
if(explicit.some(Boolean)&&!explicit.every(Boolean)) throw new Error("Defina [duracao: segundos] em todas as cenas ou em nenhuma.");
const sceneDurations=explicit.every(Boolean)?explicit.map(Number):scenes.map(scene=>audioDuration*(scene.narration.match(/\S+/g)||[]).length/totalWords);
if(sceneDurations.some(value=>!Number.isFinite(value)||value<=0)) throw new Error("Uma duração de cena é inválida.");
const shots=[]; let cursor=0;
scenes.forEach((scene,index)=>{
  const sentences=scene.narration.split(/(?<=[.!?…])\s+/).map(value=>value.trim()).filter(Boolean);
  const sceneAction=(scene.directives.acao||scene.directives.movimento||[]).at(-1)||"";
  const sceneAnimation=(scene.directives.animacao||[]).at(-1)||sceneAction;
  const words=sentences.map(value=>(value.match(/\S+/g)||[]).length);
  const sceneWords=words.reduce((a,b)=>a+b,0)||1;
  sentences.forEach((sentence,shotIndex)=>{
    const duration=sceneDurations[index]*words[shotIndex]/sceneWords;
    const d=scene.directives;
    const ai=scene.shotDirectives?.[shotIndex]||{};
    shots.push({
      id:"S"+String(index+1).padStart(3,"0")+"-P"+String(shotIndex+1).padStart(2,"0"),
      scene_id:index+1,scene_name:scene.name,scene_type:scene.type,narration:sentence,
      action:ai.action && ai.action!=="none" ? ai.action : (inferAction(sentence) || (shotIndex===0 ? sceneAction : "")),
      animation:ai.action && ai.action!=="none" ? ai.action : (inferAction(sentence) || (shotIndex===0 ? sceneAnimation : "")),
      expression:ai.emotion || (d.expressao||[]).at(-1)||"",
      environment:ai.environment || (d.ambiente||[]).at(-1)||"",
      lighting:(d.luz||[]).at(-1)||"",
      camera:ai.camera || inferCamera(sentence,(d.camera||[]).at(-1)||""),
      objects:[...new Set([...splitObjectLabels([...(d.elementos||[]),...(d.objetos||[])]),...inferObjects(sentence),...(Array.isArray(ai.objects)?ai.objects:[])])],
      character:ai.character||"",
      position:(d.posicao||d.posicoes||[]).at(-1)||"",
      start:Number(cursor.toFixed(4)),end:Number((cursor+duration).toFixed(4)),duration:Number(duration.toFixed(4))
    });
    cursor+=duration;
  });
});
const planPath=outputPath.replace(/\.mp4$/i,"-director-plan.json");
await fs.writeFile(planPath,JSON.stringify({
  schema_version:"0.7",visual_direction:"cinematic_stylized_3d",
  timing_method:explicit.every(Boolean)?"user_defined_scene_durations":"estimated_by_word_count",
  timing_is_word_aligned:false,audio_duration:Number(audioDuration.toFixed(3)),
  video_duration:Number(cursor.toFixed(3)),scene_count:scenes.length,shot_count:shots.length,shots
},null,2),"utf8");
console.log("Plano de cenas salvo: "+planPath);
console.log("TIMING: "+(explicit.every(Boolean)?"durações definidas por cena":"estimativa proporcional por palavras; não é alinhamento forçado"));
const workDir=path.dirname(outputPath);
const publicDir=path.join(workDir,"remotion-public");
await fs.mkdir(publicDir,{recursive:true});
const audioExt=path.extname(audioPath)||".mp3";
const audioFile="narration"+audioExt;
await fs.copyFile(audioPath,path.join(publicDir,audioFile));
let modelFile="";
if(args.model){
  const modelPath=path.resolve(args.model);
  if(path.extname(modelPath).toLowerCase()!==".glb") throw new Error("O modelo de personagem deve estar no formato .glb.");
  const modelDir=path.join(publicDir,"models");
  await fs.mkdir(modelDir,{recursive:true});
  modelFile="models/character.glb";
  await fs.copyFile(modelPath,path.join(publicDir,modelFile));
  console.log("Modelo GLB carregado: "+path.basename(modelPath));
}
if(args.align==="true"){
  const alignmentPath=path.join(workDir,"audio-alignment.json");
  console.log("Tentando alinhamento assistido por fala (faster-whisper)...");
  const python=process.platform==="win32"?"python":"python3";
  const aligned=await new Promise(resolve=>{
    const child=spawn(python,[path.resolve("engine/align_audio.py"),"--audio",audioPath,"--project",projectPath,"--output",alignmentPath],{windowsHide:true});
    let output="",error="";
    child.stdout.on("data",chunk=>output+=chunk.toString());
    child.stderr.on("data",chunk=>error+=chunk.toString());
    child.on("error",err=>resolve({ok:false,log:err.message}));
    child.on("close",code=>resolve({ok:code===0,log:output+error}));
  });
  console.log(aligned.log||"");
  if(aligned.ok){
    const timing=JSON.parse(await fs.readFile(alignmentPath,"utf8"));
    if(timing.shots?.length===shots.length && timing.coverage>=0.45){
      timing.shots.forEach((item,index)=>{
        shots[index].start=Number(item.start.toFixed(4));
        shots[index].end=Number(item.end.toFixed(4));
        shots[index].duration=Number((item.end-item.start).toFixed(4));
      });
      cursor=Math.max(...shots.map(item=>item.end));
      console.log("TIMING: timestamps de palavras reconhecidas; cobertura "+Math.round(timing.coverage*100)+"%. Revisar se o roteiro difere do áudio.");
    } else console.log("AVISO: alinhamento insuficiente; mantendo estimativa proporcional.");
  } else console.log("AVISO: alinhador indisponível; mantendo estimativa proporcional.");
}
if(shots.length){const last=shots[shots.length-1];if(last.end<audioDuration){last.end=Number(audioDuration.toFixed(4));last.duration=Number((last.end-last.start).toFixed(4));}cursor=Math.max(cursor,last.end);}
await fs.writeFile(planPath,JSON.stringify({
  schema_version:"0.8",visual_direction:"cinematic_stylized_3d",
  timing_method:args.align==="true"?"faster_whisper_word_timestamps_or_fallback":(explicit.every(Boolean)?"user_defined_scene_durations":"estimated_by_word_count"),
  timing_is_word_aligned:false,audio_duration:Number(audioDuration.toFixed(3)),
  video_duration:Number(cursor.toFixed(3)),scene_count:scenes.length,shot_count:shots.length,shots
},null,2),"utf8");
const entryPoint=path.resolve("src/remotion/index.tsx");
console.log("Preparando composição Remotion + Three.js...");
const serveUrl=await bundle({entryPoint,publicDir,outDir:path.join(workDir,"remotion-bundle"),webpackOverride:config=>config,onProgress:progress=>console.log("BUNDLE "+Math.round(progress*100)+"%")});
const inputProps={shots,audioFile,modelFile,fps,width,height};
async function renderWithBackend(gl) {
  const composition=await selectComposition({serveUrl,id:"MotorVideo3D",inputProps,logLevel:"error",chromiumOptions:{gl}});
  await renderMedia({
    composition,serveUrl,codec:"h264",outputLocation:outputPath,inputProps,
    chromiumOptions:{gl},
    concurrency:Math.max(1,Math.min(2,os.cpus().length)),
    imageFormat:"jpeg",jpegQuality:88,
    onProgress:({progress})=>console.log("PROGRESS "+Math.round(progress*100)+"%")
  });
}
await fs.mkdir(path.dirname(outputPath),{recursive:true});
console.log("Iniciando renderização 3D: "+shots.length+" planos, "+width+"x"+height+" @ "+fps+" FPS.");
try {
  await renderWithBackend("angle");
  console.log("Renderização concluída usando ANGLE/GPU quando disponível.");
} catch (angleError) {
  console.log("ANGLE falhou; tentando fallback de software SWANGLE: "+(angleError instanceof Error?angleError.message:String(angleError)));
  await fs.rm(outputPath,{force:true});
  await renderWithBackend("swangle");
  console.log("Renderização concluída usando fallback SWANGLE.");
}
console.log("RENDER 3D CONCLUÍDO");
console.log("Arquivo: "+outputPath);
console.log("Áudio: "+audioDuration.toFixed(2)+"s | Soma das cenas: "+cursor.toFixed(2)+"s");
console.log(modelFile?"Modelo GLB fornecido pelo usuário integrado à cena; animações disponíveis no arquivo foram acionadas conforme o marcador.":"Personagem e cenário procedurais estilizados utilizados; envie um GLB rigado para usar um personagem externo.");
