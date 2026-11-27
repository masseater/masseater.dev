import { Audio } from "@remotion/media";
import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";
import { Sequence } from "remotion";

import type { TimedLine } from "#/entities/timeline/index.ts";
import { ONE } from "#/shared/config/index.ts";

const recordingOf = ({
  audio,
  from,
  duration,
}: TimedLine): Option.Option<Readonly<{ src: string; from: number; duration: number }>> =>
  pipe(
    audio,
    Option.map((src) => ({ src, from, duration })),
  );

export const Voices = ({ lines }: Readonly<{ lines: readonly TimedLine[] }>): ReactNode =>
  pipe(
    lines,
    Arr.map(recordingOf),
    Arr.getSomes,
    Arr.map(({ src, from, duration }, position) => (
      <Sequence
        durationInFrames={duration}
        from={from}
        key={src}
        name={`voice ${String(position + ONE)}`}
      >
        <Audio src={src} />
      </Sequence>
    )),
  );
