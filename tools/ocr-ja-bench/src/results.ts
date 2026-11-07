import { NodeServices } from "@effect/platform-node";
import { JaBenchSummarySchema } from "@ocr-decide/measurements/ja-bench-schema";
import type { JaBenchSummary } from "@ocr-decide/measurements/ja-bench-schema";
import { Context, Effect, FileSystem, Layer, Schema, Array as Arr, pipe } from "effect";

import { fileNameOf } from "./engines.ts";
import type { Engine } from "./engines.ts";
import { JaWildTextPagesSchema, SyntheticPagesSchema } from "./page.ts";
import type { Page } from "./page.ts";
import { ResultsError } from "./results-error.ts";

const INDENT = { space: 2 } as const;

const ROOT = new URL("../", import.meta.url);

const ReadingSchema = Schema.Union([
  Schema.Struct({
    id: Schema.String,
    status: Schema.Literal("done"),
    text: Schema.String,
    seconds: Schema.Finite,
    costUsd: Schema.Finite,
  }),
  Schema.Struct({ id: Schema.String, status: Schema.Literal("failed"), reason: Schema.String }),
]);

const EngineResultsSchema = Schema.Struct({
  engine: Schema.String,
  machine: Schema.String,
  readings: Schema.Array(ReadingSchema),
});

const EngineResultsJson = Schema.fromJsonString(EngineResultsSchema, INDENT);

type Reading = typeof ReadingSchema.Type;

type EngineResults = typeof EngineResultsSchema.Type;

class Results extends Context.Service<
  Results,
  {
    readonly pages: Effect.Effect<readonly Page[], ResultsError>;
    readonly read: (engine: Engine) => Effect.Effect<EngineResults, ResultsError>;
    readonly write: (results: EngineResults) => Effect.Effect<void, ResultsError>;
    readonly writeSummary: (summary: JaBenchSummary) => Effect.Effect<void, ResultsError>;
  }
>()("@ocr-decide/ja-bench/results") {}

const asResultsError = (error: Readonly<{ message: string }>): ResultsError =>
  ResultsError.make({ reason: error.message });

const pathOf = (relative: string): string => new URL(relative, ROOT).pathname;

const SUMMARY = new URL("../../../libs/ocr-measurements/ja-bench.json", import.meta.url).pathname;

const SummaryJson = Schema.fromJsonString(JaBenchSummarySchema, INDENT);

const EMPTY: readonly Reading[] = [];

const resultsPath = (engine: string): string => pathOf(`results/${fileNameOf(engine)}`);

const withImage = (page: (typeof JaWildTextPagesSchema.Type)[number]): Page => ({
  ...page,
  image: pathOf(`.cache/images/${page.id}.png`),
});

const makeResults = Effect.gen(function* makeResults() {
  const fs = yield* FileSystem.FileSystem;
  const synthetic = fs.readFileString(pathOf("data/synthetic.json")).pipe(
    Effect.flatMap(Schema.decodeEffect(SyntheticPagesSchema)),
    Effect.map((pages) =>
      pipe(
        pages,
        Arr.map((page): Page => ({
          id: page.id,
          category: page.category,
          truth: pipe(page.lines, Arr.join("\n")),
          image: pathOf(`data/synthetic/${page.id}.png`),
        })),
      ),
    ),
  );
  const jaWildText = fs.readFileString(pathOf("data/jawildtext.json")).pipe(
    Effect.flatMap(Schema.decodeEffect(JaWildTextPagesSchema)),
    Effect.map((pages) => pipe(pages, Arr.map(withImage))),
  );
  return Results.of({
    pages: Effect.all([synthetic, jaWildText]).pipe(
      Effect.mapBoth({ onSuccess: (groups) => groups.flat(), onFailure: asResultsError }),
    ),
    read: (engine) =>
      fs.readFileString(resultsPath(engine.id)).pipe(
        Effect.flatMap(Schema.decodeEffect(EngineResultsJson)),
        Effect.catchTag("PlatformError", () =>
          Effect.succeed({ engine: engine.id, machine: "", readings: EMPTY }),
        ),
        Effect.mapError(asResultsError),
      ),
    write: (results) =>
      Schema.encodeEffect(EngineResultsJson)(results).pipe(
        Effect.flatMap((text) => fs.writeFileString(resultsPath(results.engine), `${text}\n`)),
        Effect.mapError(asResultsError),
      ),
    writeSummary: (summary) =>
      Schema.encodeEffect(SummaryJson)(summary).pipe(
        Effect.flatMap((text) => fs.writeFileString(SUMMARY, `${text}\n`)),
        Effect.mapError(asResultsError),
      ),
  });
});

const resultsLayer = Layer.effect(Results, makeResults).pipe(Layer.provide(NodeServices.layer));

export { Results, resultsLayer };
export type { EngineResults, Reading };
