import { Array as Arr, Effect, pipe } from "effect";

import { measureSequence, openBrowser } from "#/features/measure-zoom/api/browser.ts";
import type { BrowserError } from "#/features/measure-zoom/api/browser.ts";
import { summarize } from "#/features/measure-zoom/model/metrics.ts";
import type { Measurement } from "#/features/measure-zoom/model/metrics.ts";
import { SCALES, SEQUENCES, scaleLabelOf } from "#/features/measure-zoom/model/sequences.ts";
import type { Scale } from "#/features/measure-zoom/model/sequences.ts";
import type { SummaryRow } from "#/features/measure-zoom/model/table.ts";

const FIRST_RUN = 1;

type Target = Readonly<{ url: string; chromeFlags: readonly string[] }>;

export type RunResult = Readonly<{
  run: number;
  sequence: string;
  scale: string;
  measurement: Measurement;
}>;

const runAtScale = (
  { url, chromeFlags }: Target,
  { run, scale }: Readonly<{ run: number; scale: Scale }>,
): Effect.Effect<readonly RunResult[], BrowserError> =>
  Effect.gen(function* measureScale() {
    const browser = yield* openBrowser({ chromeFlags, scale });
    return yield* Effect.forEach(
      SEQUENCES,
      (sequence) =>
        measureSequence({ browser, url, sequence }).pipe(
          Effect.map((measurement) => ({
            run,
            sequence: sequence.name,
            scale: scaleLabelOf(scale),
            measurement,
          })),
        ),
      { concurrency: 1 },
    );
  }).pipe(Effect.scoped);

const runOnce = (target: Target, run: number): Effect.Effect<readonly RunResult[], BrowserError> =>
  Effect.forEach(SCALES, (scale) => runAtScale(target, { run, scale }), { concurrency: 1 }).pipe(
    Effect.map(Arr.flatten),
  );

const rowsOf = (results: readonly RunResult[]): readonly SummaryRow[] =>
  pipe(
    SCALES,
    Arr.map(scaleLabelOf),
    Arr.flatMap((scale) =>
      pipe(
        SEQUENCES,
        Arr.map(({ name }) => ({
          sequence: name,
          scale,
          median: pipe(
            results,
            Arr.filter((result) => result.sequence === name && result.scale === scale),
            Arr.map((result) => result.measurement),
            summarize,
          ),
        })),
      ),
    ),
  );

export const measureAll = Effect.fn("holons.zoom.measure")(function* measureAll(
  target: Readonly<{ url: string; chromeFlags: readonly string[]; runs: number }>,
) {
  yield* Effect.annotateCurrentSpan({ url: target.url, runs: target.runs });
  const results = yield* Effect.forEach(
    Arr.range(FIRST_RUN, target.runs),
    (run) => runOnce(target, run),
    { concurrency: 1 },
  );
  const flat = Arr.flatten(results);
  return { results: flat, rows: rowsOf(flat) };
});
