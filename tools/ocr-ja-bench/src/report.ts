import { CATEGORIES } from "@ocr-decide/measurements/ja-bench-schema";
import { DateTime, Effect, Array as Arr, pipe, Order } from "effect";

import { ENGINES } from "./engines.ts";
import { Results } from "./results.ts";
import { summarizeEngine } from "./summarize.ts";

const NOTHING = 0;

const ONE_AT_A_TIME = { concurrency: 1 } as const;

const byAccuracyDescending = Order.flip(
  Order.mapInput(Order.Number, (run: ReturnType<typeof summarizeEngine>) => run.accuracy),
);

const writeReport = Effect.gen(function* writeReport() {
  const results = yield* Results;
  const pages = yield* results.pages;
  const read = yield* Effect.forEach(
    ENGINES,
    (engine) => results.read(engine).pipe(Effect.map((found) => ({ engine, found }))),
    ONE_AT_A_TIME,
  );
  const summaries = pipe(
    read,
    Arr.filter(({ found }) => found.readings.length > NOTHING),
    Arr.map(({ engine, found }) => summarizeEngine({ engine, results: found, pages })),
  );
  const runs = Arr.sort(summaries, byAccuracyDescending);
  const now = yield* DateTime.now;
  yield* results.writeSummary({
    generatedAt: DateTime.formatIso(now),
    pages: pages.length,
    categories: pipe(
      CATEGORIES,
      Arr.map(({ id, label, source }) => ({
        id,
        label,
        source,
        pages: pipe(
          pages,
          Arr.filter(({ category }) => category === id),
        ).length,
      })),
    ),
    runs,
  });
});

export { writeReport };
