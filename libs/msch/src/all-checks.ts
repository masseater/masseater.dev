import { Array as Arr, Effect } from "effect";

import { checkRepository } from "./check.ts";
import { checkHiddenUnicode } from "./hidden-unicode.ts";
import { checkNestedDocs } from "./nested-docs.ts";
import { checkOverrides } from "./overrides.ts";
import type { Problem } from "./problem.ts";
import { checkPython } from "./python.ts";

/** @internal */
const checkAll: (
  root: string,
) => Effect.Effect<
  readonly Problem[],
  Effect.Error<
    ReturnType<
      | typeof checkRepository
      | typeof checkOverrides
      | typeof checkHiddenUnicode
      | typeof checkPython
      | typeof checkNestedDocs
    >
  >,
  Effect.Services<
    ReturnType<
      | typeof checkRepository
      | typeof checkOverrides
      | typeof checkHiddenUnicode
      | typeof checkPython
      | typeof checkNestedDocs
    >
  >
> = Effect.fn("checkAll")(function* checkAll(root: string) {
  const found = yield* Effect.all(
    [
      checkRepository(root),
      checkOverrides(root),
      checkHiddenUnicode(root),
      checkPython(root),
      checkNestedDocs(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});

export { checkAll };
