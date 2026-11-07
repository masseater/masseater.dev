import { Effect, String as Str, Array as Arr, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { DECISION_MODELS, assignFields } from "./assign.ts";
import type { DecisionModel } from "./assign.ts";
import { INVOICE_FIELDS } from "./fields.ts";
import type { Extraction, Fragment } from "./fragment.ts";
import { ModelApi } from "./model-api.ts";

const BOX = { x0: 0, y0: 0, x1: 1, y1: 1 } as const;

const ISSUER_LINE = "若葉ベーカリー";

const FRAGMENTS: readonly Fragment[] = [
  { text: ISSUER_LINE, confidence: 0.9, box: BOX },
  { text: "合計 ¥1,320", confidence: 0.9, box: BOX },
];

const COST = { costUsd: 0.001, twoLines: 0.002 } as const;

const PROBABILITY = { sure: 0.95, unsure: 0.6, none: 0 } as const;

const [NOUL_MODEL, CHOICE_MODEL] = DECISION_MODELS;

const ISSUER = pipe(
  INVOICE_FIELDS,
  Arr.filter(({ id }) => id === "issuer"),
);

const FOUND = { status: "found", text: ISSUER_LINE } as const;

const lineProbability = (instructions: string, probability: number): number => {
  if (Str.endsWith(ISSUER_LINE)(instructions)) {
    return probability;
  }
  return PROBABILITY.none;
};

const fakeApi = (probability: number): ModelApi["Service"] =>
  ModelApi.of({
    choose: () => Effect.succeed({ choice: "l0", probability, costUsd: COST.costUsd }),
    probability: ({ instructions }) =>
      Effect.succeed({
        probability: lineProbability(instructions, probability),
        costUsd: COST.costUsd,
      }),
    generateJson: () => Effect.die("unused"),
  });

const assigned = (model: DecisionModel, probability: number): Promise<Extraction> => {
  const assign = assignFields({ fragments: FRAGMENTS, fields: ISSUER, model });
  const api = fakeApi(probability);
  return Effect.runPromise(assign.pipe(Effect.provideService(ModelApi, api)));
};

test("takes the chosen line when the model is sure", () =>
  expect(assigned(CHOICE_MODEL, PROBABILITY.sure)).resolves.toMatchObject({
    values: { issuer: FOUND },
  }));

test("leaves the field empty below the cutoff", () =>
  expect(assigned(CHOICE_MODEL, PROBABILITY.unsure)).resolves.toMatchObject({
    values: { issuer: { status: "missing" } },
  }));

test("asks a yes/no model once per line and adds up the cost", () =>
  expect(assigned(NOUL_MODEL, PROBABILITY.sure)).resolves.toMatchObject({
    values: { issuer: FOUND },
    costUsd: COST.twoLines,
  }));
