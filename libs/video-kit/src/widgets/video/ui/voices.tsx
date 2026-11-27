import { Audio } from "@remotion/media";
import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";
import { Sequence } from "remotion";

import type { TimedLine } from "#/entities/cut/index.ts";
import { ONE } from "#/shared/config/index.ts";

export const Voices = ({ lines }: Readonly<{ lines: readonly TimedLine[] }>): ReactNode =>
  pipe(
    lines,
    Arr.flatMap(({ audio, from, duration }) =>
      pipe(
        audio,
        Option.map((src) => ({ src, from, duration })),
        Option.toArray,
      ),
    ),
    Arr.map(({ src, from, duration }, position) => (
      <Sequence
        durationInFrames={duration}
        from={from}
        key={src}
        layout="none"
        name={`voice ${String(position + ONE)}`}
      >
        <Audio src={src} />
      </Sequence>
    )),
  );
