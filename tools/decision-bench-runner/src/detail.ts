import { Array as Arr, Effect, HashMap, Option, Schema, pipe } from "effect";

import { OutcomeSchema } from "./item.ts";
import type { Outcome } from "./item.ts";
import type { DecisionAdapter } from "./openrouter.ts";
import { readJson } from "./store.ts";

const DetailSchema = Schema.Struct({
  model: Schema.String,
  outcomes: Schema.Array(Schema.Struct({ id: Schema.String, outcome: OutcomeSchema })),
});

const reusePrior = Effect.fn("reusePrior")(function* reusePrior(
  adapter: DecisionAdapter,
  detailPath: string,
) {
  const detail = yield* readJson(DetailSchema, detailPath);
  const outcomes = Option.match(detail, {
    onNone: (): (typeof DetailSchema.Type)["outcomes"] => [],
    onSome: (found) => found.outcomes,
  });
  const prior = HashMap.fromIterable(
    pipe(
      outcomes,
      Arr.filter(({ outcome }) => outcome.status === "answered"),
      Arr.map(({ id, outcome }): readonly [string, Outcome] => [id, outcome]),
    ),
  );
  const reused: DecisionAdapter = {
    model: adapter.model,
    decide: (item) =>
      Option.match(HashMap.get(prior, item.id), {
        onNone: () => adapter.decide(item),
        onSome: (outcome) => Effect.succeed(outcome),
      }),
  };
  return reused;
});

export { DetailSchema, reusePrior };
