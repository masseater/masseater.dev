import type { Voice } from "@masseater.dev/tachie";
import { Array as Arr, Option, pipe } from "effect";

import type { TimedCut } from "./timeline.ts";

export const recordingsOf = (cuts: readonly TimedCut[]): readonly Voice[] =>
  pipe(
    cuts,
    Arr.flatMap(({ from, lines }) =>
      pipe(
        lines,
        Arr.flatMap((line) =>
          pipe(
            line.audio,
            Option.map((audio) => ({ from: from + line.from, audio })),
            Option.toArray,
          ),
        ),
      ),
    ),
  );
