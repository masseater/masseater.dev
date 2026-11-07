import { runMain } from "@masseater.dev/aredoko-runtime";
import { Effect, Layer, Record, pipe } from "effect";
import { Command, Flag } from "effect/cli";
import { FetchHttpClient } from "effect/http";

import { CONDITIONS, libraryAssets } from "./conditions.ts";
import { evaluate } from "./evaluate.ts";
import { readLibrary, readQueries } from "./fixtures.ts";
import { printComparison, writeReport } from "./report.ts";

const evaluateAll = Effect.gen(function* evaluateAll() {
  const library = yield* readLibrary;
  const assets = libraryAssets(library);
  const queries = yield* readQueries;
  const entries = yield* pipe(
    CONDITIONS,
    Effect.forEach((condition) =>
      evaluate(condition, assets, queries).pipe(
        Effect.map((scores) => [condition, scores] as const),
      ),
    ),
  );
  return Record.fromEntries(entries);
});

const command = Command.make(
  "search-eval",
  { updateBaseline: Flag.Boolean("update-baseline").pipe(Flag.withDefault(false)) },
  ({ updateBaseline }) =>
    Effect.gen(function* run() {
      const http = yield* Layer.build(FetchHttpClient.layer);
      const report = yield* evaluateAll.pipe(Effect.provideContext(http));
      yield* printComparison(report);
      yield* writeReport(report, updateBaseline);
    }).pipe(Effect.scoped),
);

runMain("search-eval")(Command.run(command, { version: "0.0.0" }));
