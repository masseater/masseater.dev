import { Array as Arr, Effect, Number as Num, Option, Order, Record as Rec, pipe } from "effect";

import { MISSING, stateOf } from "./fragment.ts";
import type { Extraction, Field, FieldValue, Fragment } from "./fragment.ts";
import { ModelApi } from "./model-api.ts";
import type { ModelError } from "./model-error.ts";

type Via = "choice" | "noul";

interface DecisionModel {
  readonly id: string;
  readonly label: string;
  readonly via: Via;
}

const DECISION_MODELS = [
  { id: "respan/span-01-lite", label: "span-01 lite", via: "noul" },
  { id: "typesafe/jev-1.13", label: "Jev 1.13", via: "choice" },
  { id: "perplexity/pplx-decider-v1.1-27b", label: "Decider V1.1 27B", via: "choice" },
  { id: "inception/mercury-decide", label: "Mercury Decide", via: "choice" },
] as const satisfies readonly DecisionModel[];

const [DEFAULT_DECISION_MODEL] = DECISION_MODELS;

const CUTOFF = 0.8;

interface Candidate {
  readonly index: number;
  readonly probability: number;
}

interface Scored {
  readonly value: FieldValue;
  readonly costUsd: number;
}

const byProbability = Order.mapInput(Order.Number, ({ probability }: Candidate) => probability);

const bestOf = (candidates: readonly Candidate[]): Option.Option<Candidate> => {
  if (Arr.isReadonlyArrayNonEmpty(candidates)) {
    return Option.some(Arr.max(candidates, byProbability));
  }
  return Option.none();
};

const valueOf = (fragments: readonly Fragment[], best: Option.Option<Candidate>): FieldValue =>
  best.pipe(
    Option.filter(({ probability }) => probability >= CUTOFF),
    Option.flatMap(({ index }) => Arr.get(fragments, index)),
    Option.match({
      onNone: () => MISSING,
      onSome: ({ text }): FieldValue => ({ status: "found", text }),
    }),
  );

const choiceQuestion = (field: Field): string =>
  `帳票を OCR で読んだ行のうち、${field.label}（${field.description}）が書かれた行`;

const noulQuestion = (field: Field, fragment: Fragment): string =>
  `帳票を OCR で読んだ次の行に、${field.label}（${field.description}）が書かれている: ${fragment.text}`;

const keyOf = (index: number): string => `l${index}`;

const assignByChoice = Effect.fn("ocr-decide.assign.choice")(function* assignByChoice(
  model: string,
  fragments: readonly Fragment[],
  field: Field,
) {
  const api = yield* ModelApi;
  const answer = yield* api.choose({
    model,
    state: stateOf(fragments),
    instructions: choiceQuestion(field),
    options: pipe(
      fragments,
      Arr.map(({ text }, index) => [keyOf(index), text] as const),
      Rec.fromEntries,
    ),
  });
  const best = Arr.findFirstIndex(
    Arr.makeBy(fragments.length, (index) => keyOf(index)),
    (key) => key === answer.choice,
  ).pipe(Option.map((index) => ({ index, probability: answer.probability })));
  const scored: Scored = { value: valueOf(fragments, best), costUsd: answer.costUsd };
  return scored;
});

const assignByProbability = Effect.fn("ocr-decide.assign.noul")(function* assignByProbability(
  model: string,
  fragments: readonly Fragment[],
  field: Field,
) {
  const api = yield* ModelApi;
  const state = stateOf(fragments);
  const answers = yield* Effect.forEach(
    fragments,
    (fragment) => api.probability({ model, state, instructions: noulQuestion(field, fragment) }),
    { concurrency: "unbounded" },
  );
  const candidates = pipe(
    answers,
    Arr.map(({ probability }, index) => ({ index, probability })),
  );
  const scored: Scored = {
    value: valueOf(fragments, bestOf(candidates)),
    costUsd: Num.sumAll(
      pipe(
        answers,
        Arr.map(({ costUsd }) => costUsd),
      ),
    ),
  };
  return scored;
});

const assignField = (
  model: DecisionModel,
  fragments: readonly Fragment[],
  field: Field,
): Effect.Effect<Scored, ModelError, ModelApi> => {
  if (model.via === "choice") {
    return assignByChoice(model.id, fragments, field);
  }
  return assignByProbability(model.id, fragments, field);
};

const assignFields = ({
  fragments,
  fields,
  model = DEFAULT_DECISION_MODEL,
}: Readonly<{
  fragments: readonly Fragment[];
  fields: readonly Field[];
  model?: DecisionModel;
}>): Effect.Effect<Extraction, ModelError, ModelApi> =>
  Effect.forEach(
    fields,
    (field) =>
      assignField(model, fragments, field).pipe(
        Effect.map((scored) => ({ id: field.id, ...scored })),
      ),
    { concurrency: "unbounded" },
  ).pipe(
    Effect.map((scored) => ({
      values: Rec.fromEntries(
        pipe(
          scored,
          Arr.map(({ id, value }) => [id, value]),
        ),
      ),
      costUsd: Num.sumAll(
        pipe(
          scored,
          Arr.map(({ costUsd }) => costUsd),
        ),
      ),
    })),
    Effect.withSpan("ocr-decide.assign", { attributes: { model: model.id } }),
  );

export { CUTOFF, DECISION_MODELS, DEFAULT_DECISION_MODEL, assignFields };
export type { DecisionModel, Via };
