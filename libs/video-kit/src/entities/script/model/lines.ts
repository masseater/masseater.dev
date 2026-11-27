import { Array as Arr, Effect, Option, Record as Rec, pipe } from "effect";

import { Timing } from "#/shared/config/index.ts";

import { emphasisAtOf, estimateSeconds, frames } from "./frames.ts";
import { narrationKey, spokenOf } from "./narration.ts";
import type { Line, Scene, Script } from "./script.ts";
import type { Sources, TimedLine } from "./timeline.ts";

type Recording = Readonly<{ key: string; seconds: number }>;

type Recorded = Readonly<{ line: Line; recording: Option.Option<Recording> }>;

export interface LinesRequest {
  readonly script: Script;
  readonly scene: Scene;
  readonly sources: Sources;
}

const recordingOf = ({ script, sources }: LinesRequest, line: Line): Effect.Effect<Recorded> => {
  if (!("voice" in script)) {
    return Effect.succeed({ line, recording: Option.none() });
  }
  return narrationKey({
    speaker: script.voice,
    spoken: spokenOf({ line, readings: script.readings }),
  }).pipe(
    Effect.map((key) => ({
      line,
      recording: pipe(
        sources.narration,
        Rec.get(key),
        Option.map(({ seconds }) => ({ key, seconds })),
      ),
    })),
  );
};

const secondsOf = ({ line, recording }: Recorded): number =>
  Option.match(recording, {
    onNone: () => estimateSeconds(line),
    onSome: ({ seconds }) => seconds,
  });

const placeLines = (sources: Sources, recorded: readonly Recorded[]): readonly TimedLine[] =>
  pipe(
    recorded,
    Arr.mapAccum(frames(Timing.SCENE_PADDING_SECONDS), (cursor, entry) => {
      const duration = frames(secondsOf(entry));
      const timed: TimedLine = {
        line: entry.line,
        from: cursor,
        duration,
        audio: pipe(
          entry.recording,
          Option.map(({ key }) => sources.narrationSrc(key)),
        ),
        emphasisAt: emphasisAtOf({ line: entry.line, from: cursor, duration }),
      };
      return [cursor + duration + frames(Timing.LINE_GAP_SECONDS), timed];
    }),
    ([, lines]) => lines,
  );

export const timeLines = (request: LinesRequest): Effect.Effect<readonly TimedLine[]> =>
  Effect.forEach(request.scene.lines, (line) => recordingOf(request, line), {
    concurrency: "unbounded",
  }).pipe(Effect.map((recorded) => placeLines(request.sources, recorded)));
