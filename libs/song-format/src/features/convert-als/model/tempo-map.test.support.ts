import { Array as Arr, Number as Num, Option, pipe } from "effect";

import type { From } from "#/shared/lib/from.ts";

import type { TempoSegment } from "./tempo-map.ts";

const SECONDS_PER_MINUTE = 60;
const NEXT = 1;
const NONE = 0;

const secondsIn =
  (segments: readonly TempoSegment[], beat: number) =>
  (segment: TempoSegment, index: number): number => {
    const nextBeat = pipe(
      Arr.get(segments, index + NEXT),
      Option.map((next) => next.beat),
      Option.getOrElse(() => Number.POSITIVE_INFINITY),
    );
    if (beat <= segment.beat) {
      return NONE;
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
  };

export const secondsAt =
  (segments: readonly TempoSegment[]): From<number, number> =>
  (beat) =>
    pipe(segments, Arr.map(secondsIn(segments, beat)), Num.sumAll);
