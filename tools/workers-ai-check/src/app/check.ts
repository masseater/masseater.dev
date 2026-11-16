import { Array as Arr, Effect, Schema } from "effect";

import { findingsOf } from "#/entities/model-use/index.ts";
import type { Finding } from "#/entities/model-use/index.ts";
import { usedModels } from "#/features/find-uses/index.ts";
import { catalogOf } from "#/features/read-catalog/index.ts";

const taggedError = Schema.TaggedError;

class ModelsRetiring extends taggedError<ModelsRetiring, { readonly brand: unique symbol }>()(
  "ModelsRetiring",
  {
    findings: Schema.Array(
      Schema.Struct({ model: Schema.String, problem: Schema.String, on: Schema.String }),
    ),
  },
) {}

const NONE = 0;

const judge = (findings: readonly Finding[]): Effect.Effect<number, ModelsRetiring> =>
  Arr.match(findings, {
    onEmpty: () => Effect.succeed(NONE),
    onNonEmpty: (some) => ModelsRetiring.make({ findings: some }),
  });

const checkModels = Effect.fn("workersAi.check")(function* checkModels() {
  const models = yield* usedModels();
  const catalog = yield* catalogOf(models);
  const findings = findingsOf({ models, catalog });
  yield* Effect.logInfo("workersAi.checked").pipe(
    Effect.annotateLogs({ models: Arr.join(models, " "), findings: findings.length }),
  );
  return yield* judge(findings);
});

/** @internal */
export const check = checkModels;
