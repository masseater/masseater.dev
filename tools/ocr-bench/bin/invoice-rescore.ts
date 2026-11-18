import { runMain } from "@effect/platform-node/NodeRuntime";
import { Effect, Array as Arr, pipe } from "effect";

import { outcomeOf, Results, resultsLayer } from "#/features/measure-documents/index.ts";
import { provideAtEntry } from "#/shared/lib/ocr-tooling.ts";

const rescore = Effect.gen(function* rescore() {
  const results = yield* Results;
  const documents = yield* results.documents;
  const details = yield* results.details;
  yield* results.writeSummary({
    outcomes: pipe(
      details,
      Arr.map((detail) => outcomeOf(detail)),
    ),
    documents,
  });
});

runMain(rescore.pipe(provideAtEntry(resultsLayer)));
