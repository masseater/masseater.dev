import { NodeRuntime } from "@effect/platform-node";
import { provideAtEntry, tracingLayer } from "@ocr-decide/tooling";
import { PRODUCT_NAME, openRouter } from "@r_masseater/ocr-decide";
import { Effect, Layer } from "effect";

import { measureDocument } from "./outcome.ts";
import { Results, resultsLayer } from "./report.ts";

const ONE_AT_A_TIME = { concurrency: 1 } as const;

const measure = Effect.gen(function* measure() {
  const results = yield* Results;
  const documents = yield* results.documents;
  const outcomes = yield* Effect.forEach(
    documents,
    (document) =>
      results.image(document).pipe(Effect.flatMap((image) => measureDocument(document, image))),
    ONE_AT_A_TIME,
  ).pipe(Effect.map((all) => all.flat()));
  yield* results.writeDetails(outcomes);
  yield* results.writeSummary({ outcomes, documents });
});

const services = Layer.mergeAll(openRouter, tracingLayer(`${PRODUCT_NAME}-measure`), resultsLayer);

NodeRuntime.runMain(measure.pipe(provideAtEntry(services)));
