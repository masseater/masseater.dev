import { NodeRuntime } from "@effect/platform-node";
import { provideAtEntry } from "@ocr-decide/tooling";
import { Effect, Array as Arr, pipe } from "effect";

import { outcomeOf } from "./details.ts";
import { Results, resultsLayer } from "./report.ts";

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

NodeRuntime.runMain(rescore.pipe(provideAtEntry(resultsLayer)));
