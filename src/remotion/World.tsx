import React from "react";
import {useCurrentFrame, useVideoConfig} from "remotion";
import type {Shot} from "./Video";

type Props={shot?:Shot;frame:number;fps:number;progress:number};
const Tree:React.FC<{x:number;z:number;scale?:number}> = ({x,z,scale=1}) => <group position={[x,0,z]} scale={scale}>
  <mesh position={[0,.9,0]} castShadow><cylinderGeometry args={[.12,.18,1.8,7]}/><meshStandardMaterial color="#60432d"/></mesh>
  <mesh position={[0,2.1,0]} castShadow><coneGeometry args={[.85,2.3,7]}/><meshStandardMaterial color="#28513e" roughness={1}/></mesh>
</group>;

const Character:React.FC<{frame:number;fps:number;action:string}> = ({frame,fps,action}) => {
 const walking=/walk|run|camin|corr|fug|andar/i.test(action);
 const t=frame/fps;
 const swing=walking?Math.sin(t*5.8)*.52:Math.sin(t*1.2)*.025;
 return <group position={[0,walking?Math.abs(Math.sin(t*5.8))*.07:0,0]} rotation={[0,Math.sin(t*.35)*.1,0]}>
   <mesh position={[0,1.45,0]} castShadow><capsuleGeometry args={[.43,.85,5,12]}/><meshStandardMaterial color="#b96b43" roughness={.76}/></mesh>
   <mesh position={[0,2.42,.015]} castShadow><sphereGeometry args={[.39,24,18]}/><meshStandardMaterial color="#d8a47e" roughness={.85}/></mesh>
   <mesh position={[0,2.67,-.02]} castShadow><sphereGeometry args={[.405,24,12]}/><meshStandardMaterial color="#273548" roughness={.95}/></mesh>
   {[-.14,.14].map((x,i)=><group key={i}><mesh position={[x,2.43,.36]}><sphereGeometry args={[.075,12,10]}/><meshStandardMaterial color="#f5f0e6"/></mesh><mesh position={[x,2.43,.423]}><sphereGeometry args={[.033,10,8]}/><meshStandardMaterial color="#202a36"/></mesh></group>)}
   <mesh position={[0,1.55,-.43]} castShadow><boxGeometry args={[.62,.72,.28]}/><meshStandardMaterial color="#765036"/></mesh>
   {[-1,1].map((side,i)=><group key={side} position={[side*.53,1.92,0]} rotation={[i===0?swing:-swing,0,0]}>
     <mesh position={[0,-.32,0]} castShadow><capsuleGeometry args={[.135,.55,4,9]}/><meshStandardMaterial color="#b96b43"/></mesh>
     <mesh position={[0,-.68,0]} castShadow><sphereGeometry args={[.145,12,10]}/><meshStandardMaterial color="#d8a47e"/></mesh>
   </group>)}
   {[-1,1].map((side,i)=><group key={side} position={[side*.22,1.02,0]} rotation={[i===0?swing:-swing,0,0]}>
     <mesh position={[0,-.42,0]} castShadow><capsuleGeometry args={[.16,.66,4,9]}/><meshStandardMaterial color="#263447"/></mesh>
     <mesh position={[0,-.83,.12]} castShadow><boxGeometry args={[.3,.16,.48]}/><meshStandardMaterial color="#171f2a"/></mesh>
   </group>)}
 </group>;
};

export const CanvasWorld:React.FC<Props> = ({shot,frame,fps,progress}) => {
 const action=(shot?.action||shot?.animation||"").toLowerCase();
 const environment=(shot?.environment||shot?.scene_name||"").toLowerCase();
 const isNight=/night|noite|escuro|dark/i.test(environment+" "+(shot?.lighting||""));
 const isDesert=/desert|deserto|sand|areia/i.test(environment);
 const isSnow=/snow|neve|gelo|ice/i.test(environment);
 const ground=isSnow?"#cbd5df":isDesert?"#a98a58":"#52634c";
 const sky=isNight?"#101b34":isSnow?"#aebdca":"#91a9bd";
 const t=frame/fps;
 return <>
  <color attach="background" args={[sky]}/>
  <fog attach="fog" args={[sky,17,48]}/>
  <hemisphereLight args={["#c9e4ff","#514333",2.0]}/>
  <directionalLight position={[-5,9,6]} intensity={isNight?1.1:3.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}/>
  <directionalLight position={[5,4,-5]} color="#8cbcff" intensity={1.4}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.05,0]} receiveShadow><planeGeometry args={[100,100]}/><meshStandardMaterial color={ground} roughness={1}/></mesh>
  {Array.from({length:9},(_,i)=><mesh key={i} position={[-13+i*3.3,2.5+(i%3)*.8,-13-(i%2)*2]} rotation={[0,i*.5,0]} castShadow><coneGeometry args={[2.8,5+(i%3)*1.2,5]}/><meshStandardMaterial color={isSnow?"#687b8b":"#536d79"} roughness={1}/></mesh>)}
  {Array.from({length:16},(_,i)=><Tree key={i} x={(i%2?1:-1)*(4.3+(i%4)*1.1)} z={-3-Math.floor(i/2)*2.1} scale={.8+(i%3)*.16}/>)}
  <group rotation={[0,Math.sin(t*.12)*.035,0]}>
    <Character frame={frame} fps={fps} action={action}/>
    {/map|carta|papel|document/i.test((shot?.objects||[]).join(" ")+" "+action) && <group position={[1.15,1.6,.15]} rotation={[.2,0,-.1]}>
      <mesh castShadow><boxGeometry args={[.55,.035,.72]}/><meshStandardMaterial color="#e5d5a7"/></mesh>
      <mesh position={[0,.025,0]}><boxGeometry args={[.32,.01,.48]}/><meshStandardMaterial color="#947e54"/></mesh>
    </group>}
    {/lantern|lanterna|torch|tocha/i.test((shot?.objects||[]).join(" ")) && <pointLight position={[.8,2,.3]} color="#ff9c43" intensity={3} distance={5}/>}
  </group>
  <ambientLight intensity={.25}/>
 </>;
};
