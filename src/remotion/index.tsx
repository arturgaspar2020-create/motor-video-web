import React from "react";
import {Composition, registerRoot} from "remotion";
import {CinematicVideo, type CinematicVideoProps} from "./Video";

const Root: React.FC = () => (
  <Composition<CinematicVideoProps>
    id="MotorVideo3D"
    component={CinematicVideo}
    durationInFrames={300}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{shots: [], audioFile: "narration.mp3"}}
  />
);
registerRoot(Root);
