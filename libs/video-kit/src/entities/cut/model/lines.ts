import { Array as Arr, Effect, Option, Record as Rec, pipe } from "effect";

import { NOTHING, Timing } from "#/shared/config/index.ts";
import type { Segment } from "#/shared/lib/segment.ts";
import { segmentsOf } from "#/shared/lib/segment.ts";

import type { Cut, VideoScript } from "./cut.ts";
import { lineBeatsOf, relativeBeatsOf, speedOf, unpartedOf, voiceOf } from "./cut.ts";
import { emphasisAtOf, estimateSeconds, frames } from "./frames.ts";
import { narrationKey, spokenOf } from "./narration.ts";
import type { Sources, TimedLine } from "./timeline.ts";

interface Recorded {
  readonly segments: readonly Segment[];
  readonly key: string;
  readonly seconds: Option.Option<number>;
}

export interface LinesRequest {
  readonly script: VideoScript;
  readonly cut: Cut;
  readonly sources: Sources;
}

const recordingOf = (
  { script, cut, sources }: LinesRequest,
  say: string,
  index: number,
): Effect.Effect<Recorded> =>
  narrationKey({
    speaker: voiceOf(script)(cut),
    speed: speedOf(cut)(index),
    spoken: spokenOf({ say, readings: script.readings }),
    beats: relativeBeatsOf(cut)(index),
  }).pipe(
    Effect.map((key) => ({
      segments: segmentsOf(unpartedOf(say)),
      key,
      seconds: pipe(
        sources.narration,
        Rec.get(key),
        Option.map(({ seconds }) => seconds),
      ),
    })),
  );

const lineAt = (sources: Sources, entry: Recorded, from: number): TimedLine => {
  const duration = frames(Option.getOrElse(entry.seconds, () => estimateSeconds(entry.segments)));
  return {
    segments: entry.segments,
    from,
    duration,
    audio: pipe(
      entry.seconds,
      Option.map(() => sources.narrationSrc(entry.key)),
    ),
    emphasisAt: emphasisAtOf({ segments: entry.segments, from, duration }),
  };
};

const startsOf = (cut: Cut): readonly number[] =>
  Arr.flatMap(lineBeatsOf(cut), (beats) => Option.toArray(Arr.head(beats)));

const startOf = (starts: readonly number[], index: number, cursor: number): number =>
  Option.match(Arr.get(starts, index), {
    onNone: () => cursor,
    onSome: (seconds) => frames(seconds),
  });

const firstCursor = (starts: readonly number[]): number => {
  if (Arr.isReadonlyArrayNonEmpty(starts)) {
    return NOTHING;
  }
  return frames(Timing.SCENE_PADDING_SECONDS);
};

const placeLines = (
  sources: Sources,
  recorded: readonly Recorded[],
  starts: readonly number[],
): readonly TimedLine[] =>
  pipe(
    recorded,
    Arr.mapAccum(firstCursor(starts), (cursor, entry, index) => {
      const timed = lineAt(sources, entry, startOf(starts, index, cursor));
      return [timed.from + timed.duration + frames(Timing.LINE_GAP_SECONDS), timed];
    }),
    ([, lines]) => lines,
  );

export const timeLines = (request: LinesRequest): Effect.Effect<readonly TimedLine[]> =>
  Effect.forEach(request.cut.say, (say, index) => recordingOf(request, say, index), {
    concurrency: "unbounded",
  }).pipe(Effect.map((recorded) => placeLines(request.sources, recorded, startsOf(request.cut))));
