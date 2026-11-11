import { Array as Arr, Effect } from "effect";

import { checkRepository } from "./check.ts";
import { checkHiddenUnicode } from "./hidden-unicode.ts";
import { checkNestedDocs } from "./nested-docs.ts";
import { checkOverrides } from "./overrides.ts";
import { checkPython } from "./python.ts";

/** @internal */
const checkAll = Effect.fn("checkAll")(function* checkAll(root: string) {
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
