import { NodeRuntime } from "@effect/platform-node";
import { provideAtEntry, tracingLayer } from "@ocr-decide/tooling";
import { PRODUCT_NAME, openRouter } from "@r_masseater/ocr-decide";
import { Effect, Layer, Ref, Array as Arr, pipe } from "effect";

import { ENGINES } from "./engines.ts";
import type { Engine } from "./engines.ts";
import type { Page } from "./page.ts";
import { Reader, readerLayer } from "./read.ts";
import { writeReport } from "./report.ts";
import { Results, resultsLayer } from "./results.ts";

const ONE_AT_A_TIME = { concurrency: 1 } as const;

const NO_ENGINES = 0;

const FIRST_ARGUMENT = 2;

const OPENROUTER = "OpenRouter";

const LOCAL_MACHINE = `${process.platform} ${process.arch}, ${navigator.hardwareConcurrency} CPUs`;

const machineOf = (engine: Engine): string => {
  if (engine.kind === "vlm") {
    return OPENROUTER;
  }
  return LOCAL_MACHINE;
};

const measureEngine = Effect.fn("ocr-ja-bench.engine")(function* measureEngine(
  engine: Engine,
  pages: readonly Page[],
) {
  const results = yield* Results;
  const reader = yield* Reader;
  const previous = yield* results.read(engine);
  const done = new Set(
    pipe(
      previous.readings,
      Arr.filter(({ status }) => status === "done"),
      Arr.map(({ id }) => id),
    ),
  );
  const pending = pipe(
    pages,
    Arr.filter(({ id }) => !done.has(id)),
  );
  const readings = yield* Ref.make(
    pipe(
      previous.readings,
      Arr.filter(({ id }) => done.has(id)),
    ),
  );
  yield* Effect.logInfo(`${engine.id}: ${pending.length} pages to read`);
  yield* reader.read({
    engine,
    pages: pending,
    record: (reading) =>
      Ref.updateAndGet(readings, (all) => [...all, reading]).pipe(
        Effect.flatMap((all) =>
          results.write({ engine: engine.id, machine: machineOf(engine), readings: all }),
        ),
        Effect.orDie,
      ),
  });
});

const selected = (names: readonly string[]): readonly Engine[] => {
  if (names.length === NO_ENGINES) {
    return ENGINES;
  }
  return pipe(
    ENGINES,
    Arr.filter(({ id }) => names.includes(id)),
  );
};

const measure = Effect.gen(function* measure() {
  const results = yield* Results;
  const pages = yield* results.pages;
  yield* Effect.forEach(
    selected(process.argv.slice(FIRST_ARGUMENT)),
    (engine) => measureEngine(engine, pages),
    ONE_AT_A_TIME,
  );
  yield* writeReport;
});

const services = Layer.mergeAll(
  readerLayer.pipe(Layer.provide(openRouter)),
  tracingLayer(`${PRODUCT_NAME}-ja-bench`),
  resultsLayer,
);

NodeRuntime.runMain(measure.pipe(provideAtEntry(services)));
