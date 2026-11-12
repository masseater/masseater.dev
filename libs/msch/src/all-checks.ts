import { Array as Arr, Effect } from "effect";

import { checkRepository } from "./check.ts";
import { checkHiddenUnicode } from "./hidden-unicode.ts";
import { checkPublishedPackages } from "./install-size.ts";
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
    | ReturnType<typeof checkRepository>
    | ReturnType<typeof checkOverrides>
    | ReturnType<typeof checkHiddenUnicode>
  >,
  Effect.Services<
    | ReturnType<typeof checkRepository>
    | ReturnType<typeof checkOverrides>
    | ReturnType<typeof checkHiddenUnicode>
  >
> = Effect.fn("checkAll")(function* checkAll(root: string) {
  const found = yield* Effect.all(
    [
      checkRepository(root),
      checkOverrides(root),
      checkHiddenUnicode(root),
      checkPython(root),
      checkNestedDocs(root),
      checkPublishedPackages(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});

export { checkAll };
