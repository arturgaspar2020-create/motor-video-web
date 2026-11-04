import React, {Suspense, useLayoutEffect, useMemo} from "react";
import {useFrame, useThree} from "@react-three/fiber";
import {useGLTF} from "@react-three/drei";
import * as THREE from "three";
import {clone as cloneSkeleton} from "three/examples/jsm/utils/SkeletonUtils.js";
import {useCurrentFrame, useVideoConfig} from "remotion";
import type {Shot} from "./Video";
import {inferMotion, motionProgress} from "./motion";

type Props={shots:Shot[];modelFile?:string};
const Tree:React.FC<{x:number;z:number;scale?:number}> = ({x,z,scale=1}) => <group position={[x,0,z]} scale={scale}>
  <mesh position={[0,.9,0]} castShadow><cylinderGeometry args={[.12,.18,1.8,7]}/><meshStandardMaterial color="#60432d"/></mesh>
  <mesh position={[0,2.1,0]} castShadow><coneGeometry args={[.85,2.3,7]}/><meshStandardMaterial color="#28513e" roughness={1}/></mesh>
</group>;

const Character:React.FC<{frame:number;fps:number;action:string;expression?:string;duration?:number}> = ({frame,fps,action,expression="",duration=5}) => {
 const motion=inferMotion(action);
 const walking=motion==="walk"||motion==="run";
 const running=motion==="run";
 const jumping=/jump|salta|pula|spring|springen|springt|huepft|hüpft/i.test(action);
 const waving=/wave|acen|winken|saluda|winkt/i.test(action);
 const pointing=/point|aponta|zeigt|indica/i.test(action);
 const crouching=/crouch|agacha|ajoelha|kneel|kniet|duckt/i.test(action);
 const sitting=motion==="sit";
 const reacting=motion==="react";
 const t=frame/fps;
 const progress=motionProgress(t,duration);
 const happy=/happy|feliz|sorr|freude|glueck/i.test(expression);
 const surprised=/surpres|surprise|medo|fear|erschrocken|shock/i.test(expression);
 const sad=/triste|sad|traurig/i.test(expression);
 const mouthScale: [number,number,number]=surprised?[.12,.14,.035]:happy?[.15,.065,.035]:sad?[.13,.035,.035]:[.12,.025,.03];
 const swing=walking?Math.sin(t*(running?8:5.8))*(running?.72:.52):Math.sin(t*1.2)*.025;
 const bounce=jumping?Math.abs(Math.sin(t*3.1))*.55:walking?Math.abs(Math.sin(t*(running?8:5.8)))*(running?.13:.07):0;
 const armLeft: [number,number,number]=waving?[0,0,-.85-Math.sin(t*7)*.45]:pointing?[0,0,-1.0]:reacting?[0,0,-.65]:[swing,0,0];
 const armRight: [number,number,number]=pointing?[0,0,.8]:reacting?[0,0,.65]:[walking?-swing:0,0,0];
 return <group position={[0,bounce-(crouching ? 0.45 : sitting ? .58 : 0),0]} rotation={[0,(motion==="turn"?progress*Math.PI*.75:Math.sin(t*.35)*.1),reacting?Math.sin(t*15)*.045:0]}>
   <mesh position={[0,1.45,0]} castShadow><capsuleGeometry args={[.43,.85,5,12]}/><meshStandardMaterial color="#b96b43" roughness={.76}/></mesh>
   <mesh position={[0,1.98,0]} castShadow><cylinderGeometry args={[.16,.17,.28,12]}/><meshStandardMaterial color="#d8a47e" roughness={.85}/></mesh>
   <mesh position={[0,1.86,.32]}><boxGeometry args={[.48,.12,.08]}/><meshStandardMaterial color="#e0c9a7"/></mesh>
   {[-.14,0,.14].map((x,i)=><mesh key={i} position={[x,1.52-i*.12,.415]}><sphereGeometry args={[.035,8,8]}/><meshStandardMaterial color="#e8c98a" metalness={.45}/></mesh>)}
   <mesh position={[0,2.42,.015]} castShadow><sphereGeometry args={[.39,24,18]}/><meshStandardMaterial color="#d8a47e" roughness={.85}/></mesh>
   <mesh position={[0,2.67,-.02]} castShadow><sphereGeometry args={[.405,24,12]}/><meshStandardMaterial color="#273548" roughness={.95}/></mesh>
   {[-.38,.38].map((x,i)=><mesh key={i} position={[x,2.39,0]}><sphereGeometry args={[.105,12,10]}/><meshStandardMaterial color="#d8a47e" roughness={.85}/></mesh>)}
   <mesh position={[0,2.37,.405]}><sphereGeometry args={[.07,10,8]}/><meshStandardMaterial color="#c58d68"/></mesh>
   {[-.14,.14].map((x,i)=><mesh key={i} position={[x,2.54,.37]} rotation={[0,0,(i===0?1:-1)*.08]}><boxGeometry args={[.16,.035,.045]}/><meshStandardMaterial color="#382a24"/></mesh>)}
   {[-.14,.14].map((x,i)=><group key={i}><mesh position={[x,2.43,.36]}><sphereGeometry args={[surprised ? 0.085 : 0.075,12,10]}/><meshStandardMaterial color="#f5f0e6"/></mesh><mesh position={[x,2.43,.423]}><sphereGeometry args={[.033,10,8]}/><meshStandardMaterial color="#202a36"/></mesh></group>)}
   <mesh position={[0,2.27,.36]} scale={mouthScale}><sphereGeometry args={[1,14,10]}/><meshStandardMaterial color="#542d2b"/></mesh>
   <mesh position={[0,1.55,-.43]} castShadow><boxGeometry args={[.62,.72,.28]}/><meshStandardMaterial color="#765036"/></mesh>
   <mesh position={[-.24,1.58,-.29]} rotation={[0,0,-.22]}><boxGeometry args={[.09,.8,.08]}/><meshStandardMaterial color="#bd9360"/></mesh>
   <mesh position={[.24,1.58,-.29]} rotation={[0,0,.22]}><boxGeometry args={[.09,.8,.08]}/><meshStandardMaterial color="#bd9360"/></mesh>
   {[-1,1].map((side,i)=><group key={side} position={[side*.53,1.92,0]} rotation={i===0?armLeft:armRight}>
     <mesh position={[0,-.22,0]} castShadow><capsuleGeometry args={[.125,.38,4,9]}/><meshStandardMaterial color="#b96b43"/></mesh>
     <group position={[0,-.43,0]} rotation={[walking?swing*.42:reacting?-.35:0,0,0]}>
       <mesh position={[0,-.2,0]} castShadow><capsuleGeometry args={[.105,.34,4,9]}/><meshStandardMaterial color="#b96b43"/></mesh>
       <mesh position={[0,-.43,.015]} castShadow><sphereGeometry args={[.12,12,10]}/><meshStandardMaterial color="#d8a47e"/></mesh>
     </group>
   </group>)}
   {[-1,1].map((side,i)=><group key={side} position={[side*.22,1.02,0]} rotation={[sitting?-1.05:crouching?-.72:(i===0?swing:-swing),0,0]}>
     <mesh position={[0,-.24,0]} castShadow><capsuleGeometry args={[.145,.38,4,9]}/><meshStandardMaterial color="#263447"/></mesh>
     <group position={[0,-.46,0]} rotation={[sitting ? 1.35 : crouching ? .85 : Math.max(0,Math.sin(t*(running?8:5.8)))*.65,0,0]}>
       <mesh position={[0,-.22,0]} castShadow><capsuleGeometry args={[.13,.38,4,9]}/><meshStandardMaterial color="#263447"/></mesh>
       <mesh position={[0,-.45,.13]} castShadow><boxGeometry args={[.31,.16,.48]}/><meshStandardMaterial color="#171f2a"/></mesh>
     </group>
   </group>)}
 </group>;
};

const GLBCharacter:React.FC<{url:string;frame:number;fps:number;action:string;duration?:number}> = ({url,frame,fps,action,duration=5}) => {
 const gltf=useGLTF(url);
 const model=useMemo(()=>{
   const copy=cloneSkeleton(gltf.scene);
   const box=new THREE.Box3().setFromObject(copy);
   const size=box.getSize(new THREE.Vector3());
   const scale=size.y>0?2.75/size.y:1;
   copy.scale.setScalar(scale);
   copy.position.y-=box.min.y*scale;
   return copy;
 },[gltf.scene]);
 const mixer=useMemo(()=>new THREE.AnimationMixer(model),[model]);
 const selected=useMemo(()=>{
   const hint=inferMotion(action);
   if(hint==="run") return gltf.animations.find(clip=>/run|sprint|jog/i.test(clip.name));
   if(hint==="walk") return gltf.animations.find(clip=>/walk|gehen/i.test(clip.name));
   if(hint==="sit") return gltf.animations.find(clip=>/sit|sitting/i.test(clip.name));
   if(hint==="jump") return gltf.animations.find(clip=>/jump/i.test(clip.name));
   if(hint==="wave") return gltf.animations.find(clip=>/wave/i.test(clip.name));
   if(hint==="turn") return gltf.animations.find(clip=>/turn|rotate/i.test(clip.name));
   if(hint==="look") return gltf.animations.find(clip=>/look|inspect/i.test(clip.name));
   if(hint==="react") return gltf.animations.find(clip=>/react|surprise|flinch/i.test(clip.name));
   if(hint==="open") return gltf.animations.find(clip=>/open|door/i.test(clip.name));
   if(hint==="close") return gltf.animations.find(clip=>/close/i.test(clip.name));
   if(hint==="pickup") return gltf.animations.find(clip=>/pick|grab|take/i.test(clip.name));
   if(hint==="drop") return gltf.animations.find(clip=>/drop|throw/i.test(clip.name));
   if(hint==="idle") return gltf.animations.find(clip=>/idle|stand|breath/i.test(clip.name));
   return undefined;
  },[gltf.animations,action]);
 useLayoutEffect(()=>{
   mixer.stopAllAction();
   if(selected){mixer.clipAction(selected).play();}
   return ()=>{mixer.stopAllAction();};
 },[mixer,selected]);
 useLayoutEffect(()=>{
   mixer.setTime(frame/fps);
   model.updateMatrixWorld(true);
 },[mixer,frame,fps,model]);
 return selected ? <primitive object={model} position={[0,0,0]} /> : <Character frame={frame} fps={fps} action={action} duration={duration}/>;
};

const SceneProp:React.FC<{label:string;index:number;frame:number;fps:number;action:string}> = ({label,index,frame,fps,action}) => {
 const name=label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
 const x=(index%3-1)*1.35+.9, z=.25+Math.floor(index/3)*.65;
 const t=frame/fps;
 const progress=motionProgress(t,1.2);
 if(/^(road|path|trilha|estrada|caminho|trail)$/.test(name)) return null;
 if(/backpack|mochila|rucksack/.test(name)) return <group position={[x,.55,z]} rotation={[0,Math.sin(t*.8)*.025,0]}><mesh castShadow position={[0,.12,0]}><boxGeometry args={[.58,.78,.32]}/><meshStandardMaterial color="#76513a" roughness={.95}/></mesh><mesh position={[0,.48,-.02]}><boxGeometry args={[.42,.22,.3]}/><meshStandardMaterial color="#9a704b"/></mesh><mesh position={[-.23,.1,.18]} rotation={[0,0,-.12]}><boxGeometry args={[.08,.62,.08]}/><meshStandardMaterial color="#49382c"/></mesh><mesh position={[.23,.1,.18]} rotation={[0,0,.12]}><boxGeometry args={[.08,.62,.08]}/><meshStandardMaterial color="#49382c"/></mesh></group>;
 if(/rock|stone|pedra|rocha/.test(name)) return <mesh position={[x,.28,z]} rotation={[.2,.5,.1]} castShadow><icosahedronGeometry args={[.42,1]}/><meshStandardMaterial color="#77766f" roughness={1}/></mesh>;
 if(/tree|arvore|arvores|baum/.test(name)) return <Tree x={x} z={z} scale={1.15}/>;
 if(/car|vehicle|carro|automovel|auto/.test(name)) return <group position={[x,.62,z]} rotation={[0,Math.PI/2,0]}><mesh castShadow position={[0,.2,0]}><boxGeometry args={[1.9,.62,3.5]}/><meshStandardMaterial color="#526b79" metalness={.25} roughness={.55}/></mesh><mesh castShadow position={[0,.72,-.25]}><boxGeometry args={[1.65,.72,1.75]}/><meshStandardMaterial color="#8aa0aa" metalness={.15} roughness={.4}/></mesh>{[-.82,.82].flatMap((xx)=>[-1.1,1.1].map((zz,i)=><mesh key={xx+"-"+i} position={[xx,-.12,zz]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.34,.34,.18,16]}/><meshStandardMaterial color="#20252a" roughness={1}/></mesh>))}</group>;
 if(/photo|photograph|picture|fotografia|foto|imagem/.test(name)) return <group position={[x,1.45,z]} rotation={[0,0,Math.sin(t)*.015]}><mesh castShadow><boxGeometry args={[.62,.82,.035]}/><meshStandardMaterial color="#5b4937"/></mesh><mesh position={[0,0,.022]}><boxGeometry args={[.52,.7,.012]}/><meshStandardMaterial color="#d8c6a4"/></mesh><mesh position={[0,-.08,.032]}><sphereGeometry args={[.12,12,10]}/><meshStandardMaterial color="#9c745d"/></mesh></group>;
 if(/bed|cama|bett/.test(name)) return <group position={[x,0,z]}><mesh position={[0,.42,0]} castShadow><boxGeometry args={[1.8,.35,2.3]}/><meshStandardMaterial color="#614a3d"/></mesh><mesh position={[0,.68,0]}><boxGeometry args={[1.7,.18,2.15]}/><meshStandardMaterial color="#c9c3b8"/></mesh><mesh position={[-.48,.83,-.72]}><boxGeometry args={[.55,.22,.42]}/><meshStandardMaterial color="#e4dfd4"/></mesh></group>;
 if(/stairs|staircase|escadas|escadaria|treppe/.test(name)) return <group position={[x,0,z]}>{Array.from({length:6},(_,i)=><mesh key={i} position={[0,.18+i*.22,-i*.42]} castShadow><boxGeometry args={[1.8,.36,.46]}/><meshStandardMaterial color="#72543b"/></mesh>)}</group>;
 if(/window|janela|fenster/.test(name)) return <group position={[x,2,z]}><mesh><boxGeometry args={[1.35,1.35,.12]}/><meshStandardMaterial color="#543d2b"/></mesh><mesh position={[0,0,.08]}><boxGeometry args={[1.15,1.15,.025]}/><meshStandardMaterial color="#7795a5" transparent opacity={.48}/></mesh><mesh position={[.3,0,.15]} rotation={[0,/open|abr|öffnet|oeff/i.test(action)?progress*-.9:0,0]}><boxGeometry args={[.55,1.1,.045]}/><meshStandardMaterial color="#76553a"/></mesh></group>;
 if(/clock|watch|rel[oó]gio|uhr/.test(name)) return <group position={[x,2,z]}><mesh><cylinderGeometry args={[.42,.42,.12,24]}/><meshStandardMaterial color="#3b3028"/></mesh><mesh rotation={[Math.PI/2,0,0]} position={[0,0,.08]}><torusGeometry args={[.34,.025,8,24]}/><meshStandardMaterial color="#e6d6b3"/></mesh><mesh position={[.02,.12,.1]}><boxGeometry args={[.025,.22,.018]}/><meshStandardMaterial color="#f5e9ce"/></mesh><mesh position={[.1,0,.11]} rotation={[0,0,-t*.5]}><boxGeometry args={[.2,.018,.018]}/><meshStandardMaterial color="#f5e9ce"/></mesh></group>;
 if(/map|karte|carta|paper|papel|book|livro|document/.test(name)) return <group position={[x,1.55,z]} rotation={[.12,0,Math.sin(t)*.025]}><mesh castShadow><boxGeometry args={[.65,.035,.82]}/><meshStandardMaterial color="#e6d4a6"/></mesh><mesh position={[0,.025,0]}><boxGeometry args={[.48,.008,.62]}/><meshStandardMaterial color="#b49a67"/></mesh></group>;
 if(/flashlight|lantern|lanterna|torch|tocha|taschenlampe|laterne/.test(name)) return <group position={[x,.8,z]}><mesh castShadow><cylinderGeometry args={[.16,.19,.38,12]}/><meshStandardMaterial color="#a66b32" metalness={0.5}/></mesh><mesh position={[0,.28,0]}><sphereGeometry args={[.13,12,10]}/><meshStandardMaterial color="#ffb24c" emissive="#ff8c22" emissiveIntensity={2}/></mesh><pointLight position={[0,.35,0]} color="#ff9c43" intensity={2.5} distance={5}/></group>;
 if(/sword|espada|knife|faca|schwert/.test(name)) return <group position={[x,.9,z]} rotation={[0,0,-.45]}><mesh castShadow position={[0,.55,0]}><boxGeometry args={[.09,1.1,.045]}/><meshStandardMaterial color="#c7d4df" metalness={0.8} roughness={0.25}/></mesh><mesh position={[0,-.05,0]}><cylinderGeometry args={[.045,.045,.28,8]}/><meshStandardMaterial color="#60402b"/></mesh></group>;
 if(/key|chave|schluessel|schlüssel/.test(name)) return <group position={[x,.14,z]}><mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[.16,.035,8,16]}/><meshStandardMaterial color="#d9b45b" metalness={0.8}/></mesh><mesh position={[.23,0,0]}><boxGeometry args={[.4,.06,.05]}/><meshStandardMaterial color="#d9b45b" metalness={0.8}/></mesh></group>;
 if(/door|porta|tuer|tür/.test(name)) return <group position={[x,1.2,z]} rotation={[0,/open|opened|abr|abert|oeff|öffnet/i.test(action)?progress*1.15:/close|closed|fech|schließ/i.test(action)?(1-progress)*1.15:0,0]}><mesh castShadow><boxGeometry args={[1.1,2.4,.12]}/><meshStandardMaterial color="#69452e"/></mesh><mesh position={[.38,0,.09]}><sphereGeometry args={[.07,10,8]}/><meshStandardMaterial color="#d9b45b" metalness={0.8}/></mesh></group>;
 return null;
};

export const CanvasWorld:React.FC<Props> = ({shots,modelFile}) => {
 const frame=useCurrentFrame();
 const {fps}=useVideoConfig();
 const {camera}=useThree();
 const seconds=frame/fps;
 const shot=shots.find((item,index)=>seconds>=item.start&&(seconds<item.end||index===shots.length-1))||shots[shots.length-1];
 const expression=shot?.expression||"";
 const action=((shot?.action||"")+" "+(shot?.animation||"")).toLowerCase();
 const positionHint=(shot?.position||"").toLowerCase();
 const actorX=/left|esquerda|links|izquierda/i.test(positionHint)?-2:/right|direita|rechts|derecha/i.test(positionHint)?2:0;
 const environment=(shot?.environment||shot?.scene_name||"").toLowerCase();
 const isNight=/night|noite|escuro|dark|nacht|dunkel/i.test(environment+" "+(shot?.lighting||""));
 const isDesert=/desert|deserto|sand|areia|wueste|wüste/i.test(environment);
 const isSnow=/snow|neve|gelo|ice|schnee|eis/i.test(environment);
 const isCity=/city|cidade|street|rua|urban|urbano|stadt/i.test(environment);
 const isInterior=/inside|interior|room|quarto|casa|cabana|cabin|hut|cottage|office|escritório|zimmer|innenraum|haus|huette|hütte/i.test(environment);
 const isWar=/war|batalha|battle|ruins|ruínas|krieg|schlacht/i.test(environment);
 const isOcean=/ocean|sea|mar|oceano|lake|lago|meer|see/i.test(environment);
 const isRiver=/river|rio|stream|ribeiro/i.test(environment);
 const ground=isSnow?"#cbd5df":isInterior?"#554b40":isCity?"#666b70":isWar?"#5a554d":isDesert?"#a98a58":"#52634c";
 const sky=isNight?"#101b34":isSnow?"#aebdca":"#91a9bd";
 const t=frame/fps;
 const shotFrame=shot?Math.max(0,frame-Math.round(shot.start*fps)):0;
 const shotDuration=shot?Math.max(.1,shot.end-shot.start):5;
 const localMotionTime=shotFrame/fps;
 const motion=inferMotion(action);
 const travel=motion==="run"?Math.min(3.2,localMotionTime*2.7):motion==="walk"?Math.min(3.2,localMotionTime*1.15):0;
 const cameraHint=(shot?.camera||"").toLowerCase();
 const closeCamera=/close|close-up|rosto|detalhe|reaction/i.test(cameraHint);
 const aerialCamera=/aerial|drone|overhead|a[eé]rea|alto/i.test(cameraHint);
 useFrame(()=>{
   const target=new THREE.Vector3(actorX,closeCamera?1.8:1.35,-travel);
   const desired=new THREE.Vector3(actorX,aerialCamera?10:closeCamera?2.9:4.15,(closeCamera?6.8:aerialCamera?13:10.5)-travel);
   camera.position.lerp(desired,.12);
   camera.lookAt(target);
 });
 return <>
  <color attach="background" args={[sky]}/>
  <fog attach="fog" args={[sky,17,48]}/>
  <hemisphereLight args={["#c9e4ff","#514333",2.0]}/>
  <directionalLight position={[-5,9,6]} intensity={isNight?1.1:3.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}/>
  <directionalLight position={[5,4,-5]} color="#8cbcff" intensity={1.4}/>
  {isNight && <pointLight position={[0,3,2]} color="#ffb36b" intensity={1.2} distance={10}/>}
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.05,0]} receiveShadow><planeGeometry args={[100,100]}/><meshStandardMaterial color={ground} roughness={1}/></mesh>
  {isOcean && <mesh rotation={[-Math.PI/2,0,0]} position={[0,.015,-8]}><planeGeometry args={[100,45]}/><meshStandardMaterial color="#24647a" metalness={0.25} roughness={0.28}/></mesh>}
  {isRiver && <group><mesh rotation={[-Math.PI/2,0,0]} position={[0,.018,-5]}><planeGeometry args={[3.2,100]}/><meshStandardMaterial color="#286b85" metalness={0.18} roughness={0.24}/></mesh>{Array.from({length:18},(_,i)=><mesh key={i} rotation={[-Math.PI/2,0,0]} position={[Math.sin(i*2.4)*.9,.025,-35+i*3.5]}><planeGeometry args={[.55,.035]}/><meshStandardMaterial color="#8fc4d1" transparent opacity={.38}/></mesh>)}</group>}
  {!isCity&&!isInterior&&!isOcean && Array.from({length:9},(_,i)=><mesh key={i} position={[-13+i*3.3,2.5+(i%3)*.8,-13-(i%2)*2]} rotation={[0,i*.5,0]} castShadow><coneGeometry args={[2.8,5+(i%3)*1.2,5]}/><meshStandardMaterial color={isSnow?"#687b8b":"#536d79"} roughness={1}/></mesh>)}
  {!isCity&&!isInterior&&!isWar&&!isDesert&&!isOcean && Array.from({length:16},(_,i)=><group key={i} rotation={[0,0,Math.sin(t*1.4+i)*.025]}><Tree x={(i%2?1:-1)*(4.3+(i%4)*1.1)} z={-3-Math.floor(i/2)*2.1} scale={.8+(i%3)*.16}/></group>)}
  {isCity && Array.from({length:10},(_,i)=><mesh key={i} position={[-11+i*2.5,1.7+(i%3)*.7,-8-(i%2)*3]} castShadow><boxGeometry args={[1.8,3.4+(i%3)*1.4,1.8]}/><meshStandardMaterial color={i%2?"#536171":"#777c82"} roughness={0.95}/></mesh>)}
  {isInterior && <group><mesh position={[0,3,-5]}><boxGeometry args={[18,6,.25]}/><meshStandardMaterial color="#625447"/></mesh><mesh position={[-7,2,0]}><boxGeometry args={[.25,4,12]}/><meshStandardMaterial color="#6d5c4a"/></mesh><mesh position={[7,2,0]}><boxGeometry args={[.25,4,12]}/><meshStandardMaterial color="#6d5c4a"/></mesh></group>}
  {isWar && Array.from({length:7},(_,i)=><mesh key={i} position={[-4+i*1.3,.25,(i%2)*-2]} rotation={[.2*i,.3*i,.1*i]} castShadow><boxGeometry args={[.8,.5,.65]}/><meshStandardMaterial color="#5d5146"/></mesh>)}
  <group position={[actorX,0,-travel]} rotation={[0,motion==="turn"?motionProgress(localMotionTime,shotDuration)*Math.PI*.75:0,0]}>
    {modelFile ? <Suspense fallback={<Character frame={shotFrame} fps={fps} action={action} expression={expression} duration={shotDuration}/> }><GLBCharacter url={modelFile} frame={shotFrame} fps={fps} action={action} duration={shotDuration}/></Suspense> : <Character frame={shotFrame} fps={fps} action={action} expression={expression} duration={shotDuration}/>}
  </group>
  {(shot?.objects||[]).map((label,index)=><SceneProp key={label+index} label={label} index={index} frame={shotFrame} fps={fps} action={action}/>)}
 </>;
};
