import { Array as Arr, Effect, pipe } from "effect";

import { implementationFingerprint } from "#/entities/project/index.ts";
import { contentKey, keepOnly, recordsIn } from "#/shared/lib/pass-records.ts";
import type { Problem } from "#/shared/lib/problem.ts";
import { NODE_MODULES, RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RECORDS = [NODE_MODULES, ".cache", "msch", "overrides"] as const;
const NO_PROBLEMS: readonly Problem[] = [];

export const unlessPassed = Effect.fn("unlessPassed")(function* unlessPassed<Failure, Services>(
  root: string,
  inputs: readonly string[],
  check: Effect.Effect<readonly Problem[], Failure, Services>,
) {
  const files = yield* RepositoryFiles;
  const implementation = yield* implementationFingerprint(import.meta.dirname);
  const key = yield* contentKey(
    [implementation],
    pipe(
      inputs,
      Arr.map((file) => [file, files.join(root, file)] as const),
    ),
  );
  const records = yield* recordsIn(files.join(root, ...RECORDS));
  if (Arr.contains(records.passed, key)) {
    yield* Effect.annotateCurrentSpan({ "msch.overrides.recorded": true });
    return NO_PROBLEMS;
  }
  const problems = yield* check;
  if (Arr.isReadonlyArrayEmpty(problems)) {
    yield* keepOnly(records, [key]);
  }
  return problems;
});
