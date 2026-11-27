import { Array as Arr, Effect, Option, Record as Rec, pipe } from "effect";

import { Timing } from "#/shared/config/index.ts";
import type { Segment } from "#/shared/lib/segment.ts";
import { segmentsOf } from "#/shared/lib/segment.ts";

import type { Cut, VideoScript } from "./cut.ts";
import { voiceOf } from "./cut.ts";
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
): Effect.Effect<Recorded> =>
  narrationKey({
    speaker: voiceOf(script)(cut),
    spoken: spokenOf({ say, readings: script.readings }),
  }).pipe(
    Effect.map((key) => ({
      segments: segmentsOf(say),
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

const placeLines = (sources: Sources, recorded: readonly Recorded[]): readonly TimedLine[] =>
  pipe(
    recorded,
    Arr.mapAccum(frames(Timing.SCENE_PADDING_SECONDS), (cursor, entry) => {
      const timed = lineAt(sources, entry, cursor);
      return [cursor + timed.duration + frames(Timing.LINE_GAP_SECONDS), timed];
    }),
    ([, lines]) => lines,
  );

export const timeLines = (request: LinesRequest): Effect.Effect<readonly TimedLine[]> =>
  Effect.forEach(request.cut.say, (say) => recordingOf(request, say), {
    concurrency: "unbounded",
  }).pipe(Effect.map((recorded) => placeLines(request.sources, recorded)));
