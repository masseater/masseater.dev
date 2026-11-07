import { DECISION_MODELS, DEFAULT_GENERATOR_MODEL } from "@r_masseater/ocr-decide";
import type { DecisionModel, Method } from "@r_masseater/ocr-decide";
import { Array as Arr, pipe } from "effect";

interface Way {
  readonly key: string;
  readonly method: Method;
  readonly model: DecisionModel;
  readonly label: string;
}

const [CHEAPEST] = DECISION_MODELS;

const DIRECT: Way = {
  key: `image-generation ${DEFAULT_GENERATOR_MODEL}`,
  method: "image-generation",
  model: CHEAPEST,
  label: `${DEFAULT_GENERATOR_MODEL} に画像を渡す`,
};

const WAYS: readonly [Way, ...Way[]] = [
  DIRECT,
  ...pipe(
    DECISION_MODELS,
    Arr.flatMap((model): readonly Way[] => [
      {
        key: `ocr-decision ${model.id}`,
        method: "ocr-decision",
        model,
        label: `OCR してから ${model.id} が選ぶ`,
      },
      {
        key: `ocr-reread-decision ${model.id}`,
        method: "ocr-reread-decision",
        model,
        label: `OCR、${DEFAULT_GENERATOR_MODEL} で読み直し、${model.id} が選ぶ`,
      },
    ]),
  ),
];

export { DIRECT, WAYS };
export type { Way };
