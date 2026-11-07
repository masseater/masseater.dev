import type { Method } from "@ocr-decide/measurements/schema";
import {
  DECISION_MODELS,
  DEFAULT_GENERATOR_MODEL,
  INVOICE_FIELDS,
  assignFields,
  extractFromImage,
  readFragments,
  rereadLowConfidence,
} from "@r_masseater/ocr-decide";
import type { DecisionModel, Extraction, Fragment, ModelApi } from "@r_masseater/ocr-decide";
import { Array as Arr, Effect, Option } from "effect";

import { costOf, skipped, timed } from "./attempt.ts";
import type { Attempt, Timed } from "./attempt.ts";
import type { Document } from "./sample.ts";

const GENERATOR_LABEL = "Gemini 3.5 Flash Lite";

const ONE_AT_A_TIME = { concurrency: 1 } as const;

const labelOf = (model: string): string =>
  Arr.findFirst(DECISION_MODELS, ({ id }) => id === model).pipe(
    Option.match({ onNone: () => GENERATOR_LABEL, onSome: ({ label }) => label }),
  );

interface Outcome {
  readonly id: string;
  readonly method: Method;
  readonly model: string;
  readonly label: string;
  readonly seconds: number;
  readonly costUsd: number;
  readonly extraction: Attempt<Extraction>;
}

type Reread = Readonly<{ fragments: readonly Fragment[]; costUsd: number }>;

interface Prepared {
  readonly id: string;
  readonly ocr: Timed<readonly Fragment[]>;
  readonly reread: Timed<Reread>;
}

const assignTimed = (
  model: DecisionModel,
  fragments: Attempt<readonly Fragment[]>,
): Effect.Effect<Timed<Extraction>, never, ModelApi> => {
  if (fragments.status === "failed") {
    return Effect.succeed(skipped<Extraction>(fragments.reason));
  }
  return timed(assignFields({ fragments: fragments.value, fields: INVOICE_FIELDS, model }));
};

const rereadFragments = (reread: Attempt<Reread>): Attempt<readonly Fragment[]> => {
  if (reread.status === "failed") {
    return reread;
  }
  return { status: "done", value: reread.value.fragments };
};

const decisionOutcomes = Effect.fn("ocr-measure.decision")(function* decisionOutcomes(
  prepared: Prepared,
  model: DecisionModel,
) {
  const { id, ocr, reread } = prepared;
  const plain = yield* assignTimed(model, ocr.attempt);
  const corrected = yield* assignTimed(model, rereadFragments(reread.attempt));
  const base = { id, model: model.id, label: model.label };
  const outcomes: readonly Outcome[] = [
    {
      ...base,
      method: "ocr-decision",
      seconds: ocr.seconds + plain.seconds,
      costUsd: costOf(plain.attempt),
      extraction: plain.attempt,
    },
    {
      ...base,
      method: "ocr-reread-decision",
      seconds: ocr.seconds + reread.seconds + corrected.seconds,
      costUsd: costOf(reread.attempt) + costOf(corrected.attempt),
      extraction: corrected.attempt,
    },
  ];
  return outcomes;
});

const generationOutcome = Effect.fn("ocr-measure.generation")(function* generationOutcome(
  request: Readonly<{ id: string; image: Uint8Array }>,
) {
  const direct = yield* timed(extractFromImage({ image: request.image, fields: INVOICE_FIELDS }));
  const outcome: Outcome = {
    id: request.id,
    method: "image-generation",
    model: DEFAULT_GENERATOR_MODEL,
    label: GENERATOR_LABEL,
    seconds: direct.seconds,
    costUsd: costOf(direct.attempt),
    extraction: direct.attempt,
  };
  return outcome;
});

const rereadTimed = (
  image: Uint8Array,
  ocr: Attempt<readonly Fragment[]>,
): Effect.Effect<Timed<Reread>, never, ModelApi> => {
  if (ocr.status === "failed") {
    return Effect.succeed(skipped<Reread>(ocr.reason));
  }
  return timed(rereadLowConfidence({ image, fragments: ocr.value }));
};

const prepare = Effect.fn("ocr-measure.prepare")(function* prepare(
  request: Readonly<{ id: string; image: Uint8Array }>,
) {
  const { id, image } = request;
  const ocr = yield* timed(readFragments({ image }));
  const reread = yield* rereadTimed(image, ocr.attempt);
  const prepared: Prepared = { id, ocr, reread };
  return prepared;
});

const lineCount = (ocr: Attempt<readonly Fragment[]>): string => {
  if (ocr.status === "failed") {
    return `OCR failed: ${ocr.reason}`;
  }
  return `${ocr.value.length} lines`;
};

const measureDocument = Effect.fn("ocr-measure.document")(function* measureDocument(
  document: Document,
  image: Uint8Array,
) {
  const request = { id: document.id, image };
  const prepared = yield* prepare(request);
  const decisions = yield* Effect.forEach(
    DECISION_MODELS,
    (model) => decisionOutcomes(prepared, model),
    ONE_AT_A_TIME,
  );
  const generated = yield* generationOutcome(request);
  yield* Effect.logInfo(`${document.id}: ${lineCount(prepared.ocr.attempt)}`);
  return [...decisions.flat(), generated];
});

export { labelOf, measureDocument };
export type { Outcome };
