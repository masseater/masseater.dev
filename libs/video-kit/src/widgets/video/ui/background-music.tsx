import { Audio } from "@remotion/media";
import { Option } from "effect";
import type { ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";

import type { Music } from "#/entities/cut/index.ts";
import { NOTHING } from "#/shared/config/index.ts";

const VOLUME = 0.16;
const LOUD = 0.45;
const DUCK = 6;
const FADE_OUT = 30;
const SILENT = "";
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const volumeAt = ({
  frame,
  loud,
  total,
}: Readonly<{ frame: number; loud: number; total: number }>): number => {
  if (frame < loud) {
    return LOUD;
  }
  return interpolate(
    frame,
    [loud, loud + DUCK, total - FADE_OUT, total],
    [Math.max(LOUD * Math.sign(loud), VOLUME), VOLUME, VOLUME, NOTHING],
    CLAMP,
  );
};

export const BackgroundMusic = ({
  src,
  total,
}: Readonly<{ src: Option.Option<Music>; total: number }>): ReactNode => {
  const frame = useCurrentFrame();
  return Option.match(src, {
    onNone: () => SILENT,
    onSome: (music) => (
      <Audio
        loop
        src={music.src}
        trimBefore={music.start}
        volume={volumeAt({ frame, loud: music.loud, total })}
      />
    ),
  });
};
