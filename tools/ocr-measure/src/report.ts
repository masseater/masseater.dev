import { NodeServices } from "@effect/platform-node";
import { SummarySchema } from "@ocr-decide/measurements/schema";
import {
  CUTOFF,
  DEFAULT_GENERATOR_MODEL,
  INVOICE_FIELDS,
  REREAD_BELOW,
} from "@r_masseater/ocr-decide";
import { Context, DateTime, Effect, FileSystem, Layer, Schema, Array as Arr, pipe } from "effect";

import { DetailsSchema, detailOf } from "./details.ts";
import type { Detail } from "./details.ts";
import type { Outcome } from "./outcome.ts";
import { ResultsError } from "./results-error.ts";
import { DocumentsSchema } from "./sample.ts";
import type { Document } from "./sample.ts";
import { GROUPS, summarize } from "./summarize.ts";

const INDENT = { space: 2 } as const;

const DATA = new URL("../data/", import.meta.url);

const DOCUMENTS = new URL("documents.json", DATA).pathname;

const DETAILS = new URL("../results/details.json", import.meta.url).pathname;

const SUMMARY = new URL("../../../libs/ocr-measurements/summary.json", import.meta.url).pathname;

interface Report {
  readonly outcomes: readonly Outcome[];
  readonly documents: readonly Document[];
}

class Results extends Context.Service<
  Results,
  {
    readonly documents: Effect.Effect<readonly Document[], ResultsError>;
    readonly image: (document: Document) => Effect.Effect<Uint8Array, ResultsError>;
    readonly details: Effect.Effect<readonly Detail[], ResultsError>;
    readonly writeDetails: (outcomes: readonly Outcome[]) => Effect.Effect<void, ResultsError>;
    readonly writeSummary: (report: Report) => Effect.Effect<void, ResultsError>;
  }
>()("@ocr-decide/measure/report/Results") {}

const asResultsError = (error: Readonly<{ message: string }>): ResultsError =>
  ResultsError.make({ reason: error.message });

const summaryOf = (report: Report): Effect.Effect<string, ResultsError> =>
  DateTime.now.pipe(
    Effect.flatMap((now) =>
      Schema.encodeEffect(Schema.fromJsonString(SummarySchema, INDENT))({
        generatedAt: DateTime.formatIso(now),
        documents: report.documents.length,
        generatorModel: DEFAULT_GENERATOR_MODEL,
        cutoff: CUTOFF,
        rereadBelow: REREAD_BELOW,
        fields: pipe(
          INVOICE_FIELDS,
          Arr.map(({ id, label }) => ({ id, label })),
        ),
        groups: GROUPS,
        runs: summarize(report),
      }),
    ),
    Effect.mapError(asResultsError),
  );

const imagePath = (document: Document): string => new URL(`${document.id}.png`, DATA).pathname;

const encodeDetails = (outcomes: readonly Outcome[]): Effect.Effect<string, ResultsError> =>
  Schema.encodeEffect(DetailsSchema)(
    pipe(
      outcomes,
      Arr.map((outcome) => detailOf(outcome)),
    ),
  ).pipe(Effect.mapError(asResultsError));

const makeResults = Effect.gen(function* makeResults() {
  const fs = yield* FileSystem.FileSystem;
  const write = (path: string, text: string): Effect.Effect<void, ResultsError> =>
    fs.writeFileString(path, `${text}\n`).pipe(Effect.mapError(asResultsError));
  const decodeDocuments = Schema.decodeEffect(DocumentsSchema);
  const decodeDetails = Schema.decodeEffect(DetailsSchema);
  return Results.of({
    documents: fs
      .readFileString(DOCUMENTS)
      .pipe(Effect.flatMap(decodeDocuments), Effect.mapError(asResultsError)),
    image: (document) => fs.readFile(imagePath(document)).pipe(Effect.mapError(asResultsError)),
    details: fs
      .readFileString(DETAILS)
      .pipe(Effect.flatMap(decodeDetails), Effect.mapError(asResultsError)),
    writeDetails: (outcomes) =>
      encodeDetails(outcomes).pipe(Effect.flatMap((text) => write(DETAILS, text))),
    writeSummary: (report) =>
      summaryOf(report).pipe(Effect.flatMap((text) => write(SUMMARY, text))),
  });
});

const resultsLayer = Layer.effect(Results, makeResults).pipe(Layer.provide(NodeServices.layer));

export { Results, resultsLayer };
