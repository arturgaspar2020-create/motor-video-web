import React, {Suspense, useEffect, useMemo} from "react";
import {useGLTF} from "@react-three/drei";
import * as THREE from "three";
import {clone as cloneSkeleton} from "three/examples/jsm/utils/SkeletonUtils.js";
import {useCurrentFrame, useVideoConfig, interpolate} from "remotion";
import type {Shot} from "./Video";

type Props={shots:Shot[];modelFile?:string};
const Tree:React.FC<{x:number;z:number;scale?:number}> = ({x,z,scale=1}) => <group position={[x,0,z]} scale={scale}>
  <mesh position={[0,.9,0]} castShadow><cylinderGeometry args={[.12,.18,1.8,7]}/><meshStandardMaterial color="#60432d"/></mesh>
  <mesh position={[0,2.1,0]} castShadow><coneGeometry args={[.85,2.3,7]}/><meshStandardMaterial color="#28513e" roughness={1}/></mesh>
</group>;

const Character:React.FC<{frame:number;fps:number;action:string}> = ({frame,fps,action}) => {
 const walking=/walk|run|camin|corr|fug|andar|laufen|rennt/i.test(action);
 const jumping=/jump|salta|pula|spring|springen/i.test(action);
 const waving=/wave|acen|winken|saluda/i.test(action);
 const pointing=/point|aponta|zeigt|indica/i.test(action);
 const crouching=/crouch|agacha|ajoelha|kneel|kniet/i.test(action);
 const t=frame/fps;
 const swing=walking?Math.sin(t*5.8)*.52:Math.sin(t*1.2)*.025;
 const bounce=jumping?Math.abs(Math.sin(t*3.1))*.55:walking?Math.abs(Math.sin(t*5.8))*.07:0;
 const armLeft: [number,number,number]=waving?[0,0,-.85-Math.sin(t*7)*.45]:pointing?[0,0,-1.0]:[swing,0,0];
 const armRight: [number,number,number]=pointing?[0,0,.8]:[walking?-swing:0,0,0];
 return <group position={[0,bounce-(crouching ? 0.45 : 0),0]} rotation={[0,Math.sin(t*.35)*.1,0]}>
   <mesh position={[0,1.45,0]} castShadow><capsuleGeometry args={[.43,.85,5,12]}/><meshStandardMaterial color="#b96b43" roughness={.76}/></mesh>
   <mesh position={[0,2.42,.015]} castShadow><sphereGeometry args={[.39,24,18]}/><meshStandardMaterial color="#d8a47e" roughness={.85}/></mesh>
   <mesh position={[0,2.67,-.02]} castShadow><sphereGeometry args={[.405,24,12]}/><meshStandardMaterial color="#273548" roughness={.95}/></mesh>
   {[-.14,.14].map((x,i)=><group key={i}><mesh position={[x,2.43,.36]}><sphereGeometry args={[.075,12,10]}/><meshStandardMaterial color="#f5f0e6"/></mesh><mesh position={[x,2.43,.423]}><sphereGeometry args={[.033,10,8]}/><meshStandardMaterial color="#202a36"/></mesh></group>)}
   <mesh position={[0,1.55,-.43]} castShadow><boxGeometry args={[.62,.72,.28]}/><meshStandardMaterial color="#765036"/></mesh>
   {[-1,1].map((side,i)=><group key={side} position={[side*.53,1.92,0]} rotation={i===0?armLeft:armRight}>
     <mesh position={[0,-.32,0]} castShadow><capsuleGeometry args={[.135,.55,4,9]}/><meshStandardMaterial color="#b96b43"/></mesh>
     <mesh position={[0,-.68,0]} castShadow><sphereGeometry args={[.145,12,10]}/><meshStandardMaterial color="#d8a47e"/></mesh>
   </group>)}
   {[-1,1].map((side,i)=><group key={side} position={[side*.22,1.02,0]} rotation={[i===0?swing:-swing,0,0]}>
     <mesh position={[0,-.42,0]} castShadow><capsuleGeometry args={[.16,.66,4,9]}/><meshStandardMaterial color="#263447"/></mesh>
     <mesh position={[0,-.83,.12]} castShadow><boxGeometry args={[.3,.16,.48]}/><meshStandardMaterial color="#171f2a"/></mesh>
   </group>)}
 </group>;
};

const GLBCharacter:React.FC<{url:string;frame:number;fps:number;action:string}> = ({url,frame,fps,action}) => {
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
   const hint=action.toLowerCase();
   return gltf.animations.find(clip=>hint.includes("run")&&/run/i.test(clip.name))
     ||gltf.animations.find(clip=>hint.includes("walk")&&/walk/i.test(clip.name))
     ||gltf.animations.find(clip=>/idle|stand|breath/i.test(clip.name))
     ||gltf.animations[0];
 },[gltf.animations,action]);
 useEffect(()=>{
   mixer.stopAllAction();
   if(selected){mixer.clipAction(selected).play();}
   return ()=>mixer.stopAllAction();
 },[mixer,selected]);
 useEffect(()=>{
   mixer.setTime(frame/fps);
   model.updateMatrixWorld(true);
 },[mixer,frame,fps,model]);
 return <primitive object={model} position={[0,0,0]} />;
};

const SceneProp:React.FC<{label:string;index:number;frame:number;fps:number;action:string}> = ({label,index,frame,fps,action}) => {
 const name=label.toLowerCase();
 const x=(index%3-1)*1.35+.9, z=.25+Math.floor(index/3)*.65;
 const t=frame/fps;
 if(/map|carta|paper|papel|book|livro|document/.test(name)) return <group position={[x,1.55,z]} rotation={[.12,0,Math.sin(t)*.025]}><mesh castShadow><boxGeometry args={[.65,.035,.82]}/><meshStandardMaterial color="#e6d4a6"/></mesh><mesh position={[0,.025,0]}><boxGeometry args={[.48,.008,.62]}/><meshStandardMaterial color="#b49a67"/></mesh></group>;
 if(/lantern|lanterna|torch|tocha/.test(name)) return <group position={[x,.8,z]}><mesh castShadow><cylinderGeometry args={[.16,.19,.38,12]}/><meshStandardMaterial color="#a66b32" metalness={0.5}/></mesh><mesh position={[0,.28,0]}><sphereGeometry args={[.13,12,10]}/><meshStandardMaterial color="#ffb24c" emissive="#ff8c22" emissiveIntensity={2}/></mesh><pointLight position={[0,.35,0]} color="#ff9c43" intensity={2.5} distance={5}/></group>;
 if(/sword|espada|knife|faca/.test(name)) return <group position={[x,.9,z]} rotation={[0,0,-.45]}><mesh castShadow position={[0,.55,0]}><boxGeometry args={[.09,1.1,.045]}/><meshStandardMaterial color="#c7d4df" metalness:.8 roughness:.25/></mesh><mesh position={[0,-.05,0]}><cylinderGeometry args={[.045,.045,.28,8]}/><meshStandardMaterial color="#60402b"/></mesh></group>;
 if(/key|chave/.test(name)) return <group position={[x,1,z]}><mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[.16,.035,8,16]}/><meshStandardMaterial color="#d9b45b" metalness:.8/></mesh><mesh position={[.23,0,0]}><boxGeometry args={[.4,.06,.05]}/><meshStandardMaterial color="#d9b45b" metalness:.8/></mesh></group>;
 if(/door|porta/.test(name)) return <group position={[x,1.2,z]} rotation={[0,/open|opened|abr|abert/i.test(action)?Math.sin(t*2)*.7:0,0]}><mesh castShadow><boxGeometry args={[1.1,2.4,.12]}/><meshStandardMaterial color="#69452e"/></mesh><mesh position={[.38,0,.09]}><sphereGeometry args={[.07,10,8]}/><meshStandardMaterial color="#d9b45b" metalness:.8/></mesh></group>;
 return <group position={[x,.55,z]}><mesh castShadow><boxGeometry args={[.85,1.05,.85]}/><meshStandardMaterial color="#806044" roughness={0.9}/></mesh><mesh position={[0,0,.44]}><boxGeometry args={[.9,.08,.035]}/><meshStandardMaterial color="#b58b5b"/></mesh></group>;
};

export const CanvasWorld:React.FC<Props> = ({shots,modelFile}) => {
 const frame=useCurrentFrame();
 const {fps}=useVideoConfig();
 const seconds=frame/fps;
 const shot=shots.find((item,index)=>seconds>=item.start&&(seconds<item.end||index===shots.length-1))||shots[shots.length-1];
 const action=(shot?.action||shot?.animation||"").toLowerCase();
 const environment=(shot?.environment||shot?.scene_name||"").toLowerCase();
 const isNight=/night|noite|escuro|dark/i.test(environment+" "+(shot?.lighting||""));
 const isDesert=/desert|deserto|sand|areia/i.test(environment);
 const isSnow=/snow|neve|gelo|ice/i.test(environment);
 const isCity=/city|cidade|street|rua|urban|urbano/i.test(environment);
 const isInterior=/inside|interior|room|quarto|casa|office|escritório/i.test(environment);
 const isWar=/war|batalha|battle|ruins|ruínas/i.test(environment);
 const isOcean=/ocean|sea|mar|oceano|lake|lago/i.test(environment);
 const ground=isSnow?"#cbd5df":isDesert?"#a98a58":"#52634c";
 const sky=isNight?"#101b34":isSnow?"#aebdca":"#91a9bd";
 const t=frame/fps;
 const shotProgress=shot?interpolate(seconds,[shot.start,Math.max(shot.start+.001,shot.end)],[0,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp"}):0;
 const cameraX=interpolate(shotProgress,[0,1],[-.35,.35]);
 return <>
  <color attach="background" args={[sky]}/>
  <fog attach="fog" args={[sky,17,48]}/>
  <hemisphereLight args={["#c9e4ff","#514333",2.0]}/>
  <directionalLight position={[-5,9,6]} intensity={isNight?1.1:3.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}/>
  <directionalLight position={[5,4,-5]} color="#8cbcff" intensity={1.4}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.05,0]} receiveShadow><planeGeometry args={[100,100]}/><meshStandardMaterial color={ground} roughness={1}/></mesh>
  {isOcean && <mesh rotation={[-Math.PI/2,0,0]} position={[0,.015,-8]}><planeGeometry args={[100,45]}/><meshStandardMaterial color="#24647a" metalness={0.25} roughness={0.28}/></mesh>}
  {!isCity&&!isInterior&&!isOcean && Array.from({length:9},(_,i)=><mesh key={i} position={[-13+i*3.3,2.5+(i%3)*.8,-13-(i%2)*2]} rotation={[0,i*.5,0]} castShadow><coneGeometry args={[2.8,5+(i%3)*1.2,5]}/><meshStandardMaterial color={isSnow?"#687b8b":"#536d79"} roughness={1}/></mesh>)}
  {!isCity&&!isInterior&&!isDesert&&!isOcean && Array.from({length:16},(_,i)=><Tree key={i} x={(i%2?1:-1)*(4.3+(i%4)*1.1)} z={-3-Math.floor(i/2)*2.1} scale={.8+(i%3)*.16}/>)}
  {isCity && Array.from({length:10},(_,i)=><mesh key={i} position={[-11+i*2.5,1.7+(i%3)*.7,-8-(i%2)*3]} castShadow><boxGeometry args={[1.8,3.4+(i%3)*1.4,1.8]}/><meshStandardMaterial color={i%2?"#536171":"#777c82"} roughness={0.95}/></mesh>)}
  {isInterior && <group><mesh position={[0,3,-5]}><boxGeometry args={[18,6,.25]}/><meshStandardMaterial color="#625447"/></mesh><mesh position={[-7,2,0]}><boxGeometry args={[.25,4,12]}/><meshStandardMaterial color="#6d5c4a"/></mesh><mesh position={[7,2,0]}><boxGeometry args={[.25,4,12]}/><meshStandardMaterial color="#6d5c4a"/></mesh></group>}
  {isWar && Array.from({length:7},(_,i)=><mesh key={i} position={[-4+i*1.3,.25,(i%2)*-2]} rotation={[.2*i,.3*i,.1*i]} castShadow><boxGeometry args={[.8,.5,.65]}/><meshStandardMaterial color="#5d5146"/></mesh>)}
  <group position={[cameraX*.3,0,0]}>
    {modelFile ? <Suspense fallback={<Character frame={frame} fps={fps} action={action}/> }><GLBCharacter url={modelFile} frame={frame} fps={fps} action={action}/></Suspense> : <Character frame={frame} fps={fps} action={action}/>}
    {(shot?.objects||[]).map((label,index)=><SceneProp key={label+index} label={label} index={index} frame={frame} fps={fps} action={action}/>)}
  </group>
 </>;
};
