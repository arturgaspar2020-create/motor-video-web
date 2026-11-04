import React from "react";
import {useCurrentFrame} from "remotion";
import {Audio, staticFile} from "remotion";
import {ThreeCanvas} from "@remotion/three";
import {inferMotion} from "./motion";
import {CanvasWorld} from "./World";

export type Shot = {
  id: string; scene_id: number; scene_name: string; scene_type: string;
  narration: string; action: string; animation: string; expression: string; environment: string;
  lighting: string; camera: string; objects: string[]; position: string;
  start: number; end: number; duration: number;
};
export type CinematicVideoProps = {
  shots: Shot[]; audioFile: string; modelFile?: string; fps: number; width: number; height: number;
};

export const CinematicVideo: React.FC<CinematicVideoProps> = ({shots, audioFile, modelFile, fps, width, height}) => {
  const frame = useCurrentFrame();
  const seconds = frame / fps;
  const active = shots.find((shot,index)=>seconds>=shot.start&&(seconds<shot.end||index===shots.length-1)) || shots[0];
  const cameraHint=(active?.camera||"").toLowerCase();
  const close=/close|close-up|rosto|detalhe|closeup/.test(cameraHint);
  const aerial=/aerial|drone|overhead|aérea|alto/.test(cameraHint);
  const localSeconds=active?Math.max(0,seconds-active.start):0;
  const motion=inferMotion(((active?.action||"")+" "+(active?.animation||"")).toLowerCase());
  const actorTravel=motion==="run"?Math.min(3.2,localSeconds*2.7):motion==="walk"?Math.min(3.2,localSeconds*1.15):0;
  const cameraY=aerial?9:close?2.8:4.1;
  const cameraZ=(close?7:aerial?13:10)-actorTravel;
  return <>
    <ThreeCanvas shadows width={width} height={height} camera={{position: [0, cameraY, cameraZ], fov: close?30:38}} gl={{antialias: true, alpha: false, powerPreference: "high-performance"}}>
      <CanvasWorld shots={shots} modelFile={modelFile ? staticFile(modelFile) : undefined}/>
    </ThreeCanvas>
    {audioFile ? <Audio src={staticFile(audioFile)} /> : null}
  </>;
};
