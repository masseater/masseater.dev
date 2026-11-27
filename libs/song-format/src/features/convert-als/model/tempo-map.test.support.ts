import { Array as Arr, Option, pipe } from "effect";

import type { From } from "#/shared/lib/from.ts";

import type { TempoSegment } from "./tempo-map.ts";

const SECONDS_PER_MINUTE = 60;

export const secondsAt =
  (segments: readonly TempoSegment[]): From<number, number> =>
  (beat) =>
    pipe(
      segments,
      Arr.map((segment, index) => {
        const nextBeat = Option.getOrElse(
          Option.map(Arr.get(segments, index + 1), (next) => next.beat),
          () => Number.POSITIVE_INFINITY,
        );
        if (beat <= segment.beat) {
          return 0;
        }
        const end = Math.min(beat, nextBeat);
        return Option.match(segment.target, {
          onNone: () => (SECONDS_PER_MINUTE * (end - segment.beat)) / segment.bpm,
          onSome: (target) => {
            const slope = (target - segment.bpm) / (nextBeat - segment.beat);
            const reached = segment.bpm + slope * (end - segment.beat);
            return (SECONDS_PER_MINUTE / slope) * Math.log(reached / segment.bpm);
          },
        });
      }),
      Arr.reduce(0, (sum, seconds) => sum + seconds),
    );
