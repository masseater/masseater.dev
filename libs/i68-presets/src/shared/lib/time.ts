import type { Bar, Song } from "@r_masseater/fumx-parser";
import { TICKS_PER_WHOLE } from "@r_masseater/fumx-parser";
import { Array as Arr, pipe } from "effect";

const SECONDS_PER_MINUTE = 60;
const QUARTERS_PER_WHOLE = 4;
const NONE = 0;

interface Segment {
  readonly start: number;
  readonly end: number;
  readonly bpm: number;
}

const segmentsIn = (bar: Bar): readonly Segment[] =>
  Arr.match(bar.tempoSteps, {
    onEmpty: () => [{ start: bar.start, end: bar.start + bar.length, bpm: bar.tempo.bpm }],
    onNonEmpty: (steps) =>
      pipe(
        steps,
        Arr.map((step) => ({
          start: bar.start + step.offset,
          end: bar.start + step.offset + step.length,
          bpm: step.bpm,
        })),
      ),
  });

const secondsPerTick = (bpm: number): number =>
  (SECONDS_PER_MINUTE * QUARTERS_PER_WHOLE) / (bpm * TICKS_PER_WHOLE);

export const clockOf = (song: Song): ((tick: number) => number) => {
  const segments = pipe(song.bars, Arr.flatMap(segmentsIn));
  return (tick) => {
    let seconds = NONE;
    for (const segment of segments) {
      if (segment.start < tick) {
        seconds += (Math.min(tick, segment.end) - segment.start) * secondsPerTick(segment.bpm);
      }
    }
    return seconds;
  };
};
