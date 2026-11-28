import { Audio } from "@remotion/media";
import { Option } from "effect";
import type { ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";

import type { Music } from "#/entities/cut/index.ts";
import { NOTHING } from "#/shared/config/index.ts";

const VOLUME = 0.16;
const FADE_OUT = 30;
const SILENT = "";
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const BackgroundMusic = ({
  src,
  total,
}: Readonly<{ src: Option.Option<Music>; total: number }>): ReactNode => {
  const frame = useCurrentFrame();
  const volume = interpolate(
    frame,
    [NOTHING, total - FADE_OUT, total],
    [VOLUME, VOLUME, NOTHING],
    CLAMP,
  );
  return Option.match(src, {
    onNone: () => SILENT,
    onSome: (music) => <Audio loop src={music.src} trimBefore={music.start} volume={volume} />,
  });
};
