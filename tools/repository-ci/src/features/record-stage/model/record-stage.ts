import { Config, Effect, Schema } from "effect";

import { Stacks, record, staged } from "#/entities/deployment/index.ts";

/** @internal */
export const recordStage = Effect.gen(function* recordStage() {
  const task = yield* Config.String("TASK");
  const stacks = yield* Config.String("STACKS").pipe(Effect.flatMap(Schema.decodeEffect(Stacks)));
  yield* Effect.forEach(stacks, ({ name }) => record(staged(task)(name)), { concurrency: 1 });
});
