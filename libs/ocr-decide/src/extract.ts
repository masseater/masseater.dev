import { Effect } from "effect";

import { assignFields } from "./assign.ts";
import type { DecisionModel } from "./assign.ts";
import type { Extraction, Field, Fragment } from "./fragment.ts";
import { extractFromImage, rereadLowConfidence } from "./generate.ts";
import type { ModelApi } from "./model-api.ts";
import type { ModelError } from "./model-error.ts";
import type { OcrError } from "./ocr-error.ts";
import { readFragments } from "./ocr.ts";

const METHODS = ["ocr-decision", "ocr-reread-decision", "image-generation"] as const;

type Method = (typeof METHODS)[number];

interface ExtractRequest {
  readonly image: Uint8Array;
  readonly fields: readonly Field[];
  readonly method: Method;
  readonly model: DecisionModel;
}

const NO_COST = 0;

const correct = (
  reread: boolean,
  image: Uint8Array,
  fragments: readonly Fragment[],
): Effect.Effect<
  Readonly<{ fragments: readonly Fragment[]; costUsd: number }>,
  ModelError,
  ModelApi
> => {
  if (reread) {
    return rereadLowConfidence({ image, fragments });
  }
  return Effect.succeed({ fragments, costUsd: NO_COST });
};

const decide = Effect.fn("ocr-decide.extract.decide")(function* decide(
  request: ExtractRequest,
  reread: boolean,
) {
  const { image, fields, model } = request;
  const read = yield* readFragments({ image });
  const corrected = yield* correct(reread, image, read);
  const assigned = yield* assignFields({ fragments: corrected.fragments, fields, model });
  const extraction: Extraction = {
    values: assigned.values,
    costUsd: corrected.costUsd + assigned.costUsd,
  };
  return extraction;
});

const extract = (
  request: ExtractRequest,
): Effect.Effect<Extraction, ModelError | OcrError, ModelApi> => {
  if (request.method === "image-generation") {
    return extractFromImage({ image: request.image, fields: request.fields });
  }
  return decide(request, request.method === "ocr-reread-decision");
};

export { METHODS, extract };
export type { ExtractRequest, Method };
