import { OpenRouter } from "@openrouter/sdk";
import { HTTPClient } from "@openrouter/sdk/lib/http.js";
import type { DecisionsRequest, DecisionsResponse } from "@openrouter/sdk/models";
import { openRouterApp } from "@r_masseater/oxlint-plugin-decision/openrouter-app";
import { isSplitChoice } from "bench-summary/schema";
import type { ChoiceVia } from "bench-summary/schema";
import {
  Array as Arr,
  Clock,
  Config,
  Number as Num,
  Effect,
  Option,
  pipe,
  Record as Rec,
  Redacted,
  Result,
  Schema,
  Order,
} from "effect";

import { DecisionSchema, NOUL_CRITERIA, OutcomeSchema } from "./item.ts";
import type { ChoiceItem, Decision, Item, Outcome } from "./item.ts";
import { toRequest } from "./label.ts";
import { makeCache, modelSlug } from "./store.ts";

interface DecisionAdapter {
  readonly model: string;
  readonly decide: (item: Readonly<Item>) => Effect.Effect<Outcome>;
}

const QUESTION_ID = "q";
const NO_COST = 0;
const MIN_TOTAL = Number.EPSILON;
const READOUT = "probabilities";

const attribution = openRouterApp("bench");

type Frozen<Value> = Value extends object
  ? { readonly [Key in keyof Value]: Frozen<Value[Key]> }
  : Value;
type Answers = Frozen<DecisionsResponse["answers"]>;
type Answer = Answers[string];

const decodeKnown = (answer: Answer): Option.Option<Decision> => {
  if (answer.type === "choice" || answer.type === "noul" || answer.type === "score") {
    return Schema.decodeOption(DecisionSchema)(answer);
  }
  return Option.none();
};

const decodeAnswer = (answer: Answer | undefined): Option.Option<Decision> =>
  Option.flatMap(Option.fromNullishOr(answer), decodeKnown);

const noulOf = (answer: Answer): Option.Option<number> =>
  Option.flatMap(decodeAnswer(answer), (decision) => {
    if (decision.type !== "noul") {
      return Option.none();
    }
    return Option.some(decision.noul);
  });

const isAnswered = (outcome: Outcome): boolean => outcome.status === "answered";

const failed = (reason: string, latencyMs: number): Outcome => ({
  status: "failed",
  reason,
  latencyMs,
});

const toQuestions = (item: Readonly<Item>): DecisionsRequest["questions"] => {
  const instructions = item.criteria;
  if (item.type === "choice") {
    return { [QUESTION_ID]: { type: item.type, instructions, criteria: item.options } };
  }
  if (item.type === "noul") {
    return { [QUESTION_ID]: { type: item.type, instructions, criteria: item.options } };
  }
  return { [QUESTION_ID]: { type: item.type, instructions, criteria: [...item.options] } };
};

const toSplitQuestions = (item: Readonly<ChoiceItem>): DecisionsRequest["questions"] =>
  Rec.fromEntries(
    pipe(
      Rec.toEntries(item.options),
      Arr.map(([key, option]) => [
        key,
        {
          type: "noul" as const,
          instructions: `${item.criteria}\n次の答えは正しいですか: ${option}`,
          criteria: NOUL_CRITERIA,
        },
      ]),
    ),
  );

const byNoulDescending = Order.mapInput(
  Order.flip(Num.Order),
  ({ noul }: Readonly<{ noul: number }>) => noul,
);

const decodeSplit = (item: Readonly<ChoiceItem>, answers: Answers): Option.Option<Decision> =>
  Option.gen(function* split() {
    const record = yield* Option.all(pipe(answers, Rec.map(noulOf)));
    const scored = yield* Option.all(
      pipe(
        Rec.keys(item.options),
        Arr.map((key) => Option.map(Option.fromNullishOr(record[key]), (noul) => ({ key, noul }))),
      ),
    );
    const best = yield* pipe(scored, Arr.sortBy(byNoulDescending), Arr.head);
    const nouls = pipe(
      scored,
      Arr.map(({ noul }) => noul),
    );
    const total = Math.max(MIN_TOTAL, Num.sumAll(nouls));
    const probabilities = Rec.fromEntries(
      pipe(
        scored,
        Arr.map(({ key, noul }) => [key, noul / total]),
      ),
    );
    return { type: "choice" as const, choice: best.key, probabilities };
  });

const decodeDecision = (
  item: Readonly<Item>,
  via: ChoiceVia,
  answers: Answers,
): Option.Option<Decision> => {
  if (item.type === "choice" && isSplitChoice({ format: item.type, choiceVia: via })) {
    return decodeSplit(item, answers);
  }
  return Option.filter(
    decodeAnswer(answers[QUESTION_ID]),
    (decision) => decision.type === item.type,
  );
};

interface Reply {
  readonly answers: Answers;
  readonly costUsd: number;
  readonly latencyMs: number;
}

const toOutcome = (
  item: Readonly<Item>,
  via: ChoiceVia,
  { answers, costUsd, latencyMs }: Reply,
): Outcome =>
  Option.match(decodeDecision(item, via, answers), {
    onNone: () => failed("answer type mismatch", latencyMs),
    onSome: (decision) => ({ status: "answered", decision, latencyMs, costUsd }),
  });

const callSystemOne = Effect.fn("callSystemOne")(function* callSystemOne(
  create: (item: Readonly<Item>) => Promise<DecisionsResponse>,
  item: Readonly<Item>,
  via: ChoiceVia,
) {
  const started = yield* Clock.currentTimeMillis;
  const response = yield* Effect.tryPromise({
    try: () => create(item),
    catch: String,
  }).pipe(Effect.result);
  const latencyMs = (yield* Clock.currentTimeMillis) - started;
  if (Result.isFailure(response)) {
    return failed(response.failure, latencyMs);
  }
  const { answers, usage } = response.success;
  return toOutcome(item, via, {
    answers,
    costUsd: usage.cost ?? NO_COST,
    latencyMs,
  });
});

const questionsOf = (item: Readonly<Item>, via: ChoiceVia): DecisionsRequest["questions"] => {
  if (item.type === "choice" && isSplitChoice({ format: item.type, choiceVia: via })) {
    return toSplitQuestions(item);
  }
  return toQuestions(item);
};

const cacheKey = (model: string, item: Readonly<Item>, via: ChoiceVia): unknown => {
  if (item.type === "choice" && isSplitChoice({ format: item.type, choiceVia: via })) {
    return { model, request: toRequest(item), via, readout: READOUT };
  }
  if (item.type === "choice") {
    return { model, request: toRequest(item), readout: READOUT };
  }
  return { model, request: toRequest(item) };
};

const makeOpenRouterAdapter = Effect.fn("makeOpenRouterAdapter")(function* makeOpenRouterAdapter(
  model: string,
  via: ChoiceVia,
) {
  const apiKey = yield* Config.Redacted("OPENROUTER_API_KEY");
  const headers = yield* attribution;
  const httpClient = new HTTPClient().addHook("beforeRequest", (request) => {
    for (const [name, value] of Rec.toEntries(headers)) {
      request.headers.set(name, value);
    }
  });
  const client = new OpenRouter({ apiKey: Redacted.value(apiKey), httpClient });
  const create = (item: Readonly<Item>): Promise<DecisionsResponse> =>
    client.systemOne.create({
      decisionsRequest: { model, state: item.text, questions: questionsOf(item, via) },
    });
  const cached = yield* makeCache(`openrouter-${modelSlug(model)}`, OutcomeSchema, isAnswered);
  const adapter: DecisionAdapter = {
    model,
    decide: (item) => cached(cacheKey(model, item, via), callSystemOne(create, item, via)),
  };
  return adapter;
});

/** @internal */
export { makeOpenRouterAdapter };
export type { DecisionAdapter };
