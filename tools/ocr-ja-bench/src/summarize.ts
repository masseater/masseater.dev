import { CATEGORIES } from "@ocr-decide/measurements/ja-bench-schema";
import type { CategoryId, EngineRun } from "@ocr-decide/measurements/ja-bench-schema";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import type { Engine } from "./engines.ts";
import type { Page } from "./page.ts";
import type { EngineResults, Reading } from "./results.ts";
import { accuracyOf, charF1Of } from "./score.ts";

const NOTHING = 0;

const mean = (values: readonly number[]): number => {
  if (values.length === NOTHING) {
    return NOTHING;
  }
  let sum = NOTHING;
  for (const value of values) {
    sum += value;
  }
  return sum / values.length;
};

interface Scored {
  readonly category: CategoryId;
  readonly accuracy: number;
  readonly charF1: number;
  readonly reading: Option.Option<Extract<Reading, Readonly<{ status: "done" }>>>;
}

const scoreOf = ({
  page,
  reading,
}: Readonly<{ page: Page; reading: Option.Option<Reading> }>): Scored => {
  const done = reading.pipe(
    Option.filter(
      (found): found is Extract<Reading, Readonly<{ status: "done" }>> => found.status === "done",
    ),
  );
  return {
    category: page.category,
    accuracy: done.pipe(
      Option.match({
        onNone: () => NOTHING,
        onSome: ({ text }) => accuracyOf({ answer: text, truth: page.truth }),
      }),
    ),
    charF1: done.pipe(
      Option.match({
        onNone: () => NOTHING,
        onSome: ({ text }) => charF1Of({ answer: text, truth: page.truth }),
      }),
    ),
    reading: done,
  };
};

const byCategory = (
  scored: readonly Scored[],
  metric: (score: Scored) => number,
): Readonly<Record<string, number>> => {
  const entries: (readonly [string, number])[] = [];
  for (const { id } of CATEGORIES) {
    const values = pipe(
      scored,
      Arr.filter(({ category }) => category === id),
      Arr.map((score) => metric(score)),
    );
    if (values.length > NOTHING) {
      entries.push([id, mean(values)]);
    }
  }
  return Rec.fromEntries(entries);
};

const KIND_OF = { process: "local", tesseract: "local", vlm: "vlm" } as const;

const summarizeEngine = ({
  engine,
  results,
  pages,
}: Readonly<{ engine: Engine; results: EngineResults; pages: readonly Page[] }>): EngineRun => {
  const scored = pipe(
    pages,
    Arr.map((page) =>
      scoreOf({ page, reading: Arr.findFirst(results.readings, ({ id }) => id === page.id) }),
    ),
  );
  const accuracyByCategory = byCategory(scored, ({ accuracy }) => accuracy);
  const charF1ByCategory = byCategory(scored, ({ charF1 }) => charF1);
  const done = Arr.getSomes(
    pipe(
      scored,
      Arr.map(({ reading }) => reading),
    ),
  );
  return {
    engine: engine.id,
    label: engine.label,
    kind: KIND_OF[engine.kind],
    machine: results.machine,
    accuracy: mean(Rec.values(accuracyByCategory)),
    charF1: mean(Rec.values(charF1ByCategory)),
    byCategory: accuracyByCategory,
    charF1ByCategory,
    secondsPerPage: mean(
      pipe(
        done,
        Arr.map(({ seconds }) => seconds),
      ),
    ),
    usdPerPage: mean(
      pipe(
        done,
        Arr.map(({ costUsd }) => costUsd),
      ),
    ),
    failed: pages.length - done.length,
  };
};

export { summarizeEngine };
