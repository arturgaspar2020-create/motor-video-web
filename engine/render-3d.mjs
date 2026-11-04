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
function parseScript(source) {
  const scenes=[]; let current=null; const warnings=[];
  const flush=()=>{if(current){current.narration=current.narration.join("\n").trim();scenes.push(current);current=null;}};
  source.replace(/\r/g,"").split("\n").forEach((raw,index)=>{
    const line=raw.trim(); if(!line)return;
    const match=line.match(/^\[cena:\s*([^\]|]+)(?:\|\s*([^\]]+))?\]$/i);
    if(match){flush();current={id:scenes.length+1,type:match[1].trim(),name:(match[2]||match[1]).trim(),directives:{},narration:[]};return;}
    const marker=line.match(/^\[([^:]+):\s*([^\]]*)\]$/);
    if(marker){if(current){const key=marker[1].trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");(current.directives[key]??=[]).push(marker[2].trim());}else warnings.push("Marcador fora de cena na linha "+(index+1));return;}
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
  const words=sentences.map(value=>(value.match(/\S+/g)||[]).length);
  const sceneWords=words.reduce((a,b)=>a+b,0)||1;
  sentences.forEach((sentence,shotIndex)=>{
    const duration=sceneDurations[index]*words[shotIndex]/sceneWords;
    const d=scene.directives;
    shots.push({
      id:"S"+String(index+1).padStart(3,"0")+"-P"+String(shotIndex+1).padStart(2,"0"),
      scene_id:index+1,scene_name:scene.name,scene_type:scene.type,narration:sentence,
      action:(d.acao||d.movimento||[]).at(-1)||"",
      animation:(d.animacao||[]).at(-1)||"",\n      expression:(d.expressao||[]).at(-1)||"",
      environment:(d.ambiente||[]).at(-1)||"",
      lighting:(d.luz||[]).at(-1)||"",
      camera:(d.camera||d.animacao||[]).at(-1)||"",
      objects:[...(d.elementos||[]),...(d.objetos||[])],
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
const serveUrl=await bundle({entryPoint,publicDir,webpackOverride:config=>config,onProgress:progress=>console.log("BUNDLE "+Math.round(progress*100)+"%")});
const inputProps={shots,audioFile,modelFile,fps,width,height};
const composition=await selectComposition({serveUrl,id:"MotorVideo3D",inputProps,logLevel:"error",chromiumOptions:{gl:"angle"}});
await fs.mkdir(path.dirname(outputPath),{recursive:true});
console.log("Iniciando renderização 3D: "+shots.length+" planos, "+width+"x"+height+" @ "+fps+" FPS.");
await renderMedia({
  composition,serveUrl,codec:"h264",outputLocation:outputPath,inputProps,
  chromiumOptions:{gl:"angle"},
  concurrency:Math.max(1,Math.min(2,os.cpus().length)),
  imageFormat:"jpeg",jpegQuality:88,
  onProgress:({progress})=>console.log("PROGRESS "+Math.round(progress*100)+"%")
});
console.log("RENDER 3D CONCLUÍDO");
console.log("Arquivo: "+outputPath);
console.log("Áudio: "+audioDuration.toFixed(2)+"s | Soma das cenas: "+cursor.toFixed(2)+"s");
console.log(modelFile?"Modelo GLB fornecido pelo usuário integrado à cena; animações disponíveis no arquivo foram acionadas conforme o marcador.":"Personagem e cenário procedurais estilizados utilizados; envie um GLB rigado para usar um personagem externo.");
