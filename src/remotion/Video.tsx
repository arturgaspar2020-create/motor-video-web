import React from "react";
import {Audio, staticFile} from "remotion";
import {ThreeCanvas} from "@remotion/three";
import {CanvasWorld} from "./World";

export type Shot = {
  id: string; scene_id: number; scene_name: string; scene_type: string;
  narration: string; action: string; animation: string; environment: string;
  lighting: string; camera: string; objects: string[]; position: string;
  start: number; end: number; duration: number;
};
export type CinematicVideoProps = {
  shots: Shot[]; audioFile: string; fps: number; width: number; height: number;
};

export const CinematicVideo: React.FC<CinematicVideoProps> = ({shots, audioFile, width, height}) => {
  const active = shots[0];
  return <>
    <ThreeCanvas width={width} height={height} camera={{position: [7, 5.2, 10], fov: 38}} gl={{antialias: true, alpha: false, powerPreference: "high-performance"}}>
      <CanvasWorld shots={shots}/>
    </ThreeCanvas>
    {audioFile ? <Audio src={staticFile(audioFile)} /> : null}
  </>;
};
