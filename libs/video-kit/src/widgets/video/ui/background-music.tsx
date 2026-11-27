import { Audio } from "@remotion/media";
import { Option } from "effect";
import type { ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";

import { NOTHING } from "#/shared/config/index.ts";

const VOLUME = 0.16;
const FADE_IN = 10;
const FADE_OUT = 30;
const SILENT = "";
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const BackgroundMusic = ({
  src,
  total,
}: Readonly<{ src: Option.Option<string>; total: number }>): ReactNode => {
  const frame = useCurrentFrame();
  const volume = interpolate(
    frame,
    [NOTHING, FADE_IN, total - FADE_OUT, total],
    [NOTHING, VOLUME, VOLUME, NOTHING],
    CLAMP,
  );
  return Option.match(src, {
    onNone: () => SILENT,
    onSome: (music) => <Audio loop src={music} volume={volume} />,
  });
};
