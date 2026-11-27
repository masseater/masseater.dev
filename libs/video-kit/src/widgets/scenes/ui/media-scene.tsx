import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import { MediaCard } from "./media-card.tsx";
import { MediaSource } from "./media-source.tsx";
import { SceneFrame } from "./scene-frame.tsx";
import type { SceneProps } from "./scene-props.ts";

export const MediaScene = ({
  timed,
  src,
  alt,
}: Readonly<SceneProps & { src: string; alt: string }>): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <>
      <AbsoluteFill>
        <MediaSource className="blurred-fill size-full object-cover" src={src} />
      </AbsoluteFill>
      <SceneFrame caption timed={timed} whip>
        <MediaCard alt={alt} frame={frame} src={src} />
      </SceneFrame>
    </>
  );
};
