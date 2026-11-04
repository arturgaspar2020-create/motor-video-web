import React from "react";
import {Audio, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {ThreeCanvas} from "@remotion/three";
import {CanvasWorld} from "./World";

export type Shot = {
  id: string; scene_id: number; scene_name: string; scene_type: string;
  narration: string; action: string; animation: string; environment: string;
  lighting: string; camera: string; objects: string[]; position: string;
  start: number; end: number; duration: number;
};
export type CinematicVideoProps = {shots: Shot[]; audioFile: string};

export const CinematicVideo: React.FC<CinematicVideoProps> = ({shots, audioFile}) => {
  const frame = useCurrentFrame();
  const {fps, width, height, durationInFrames} = useVideoConfig();
  const seconds = frame / fps;
  const active = shots.find((shot, index) => seconds >= shot.start && (seconds < shot.end || index === shots.length - 1)) || shots[shots.length - 1];
  const progress = active ? Math.max(0, Math.min(1, (seconds - active.start) / Math.max(.001, active.duration))) : 0;
  return <>
    <ThreeCanvas width={width} height={height} camera={{position: [7, 5.2, 10], fov: 38}} gl={{antialias: true, alpha: false}}>
      <CanvasWorld shot={active} frame={frame} fps={fps} progress={progress}/>
    </ThreeCanvas>
    {audioFile ? <Audio src={staticFile(audioFile)} /> : null}
  </>;
};
