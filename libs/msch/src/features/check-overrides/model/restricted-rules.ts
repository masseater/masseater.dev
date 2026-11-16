import { Array as Arr, Effect, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { isScannedText, listedFiles, scanText } from "#/shared/lib/scanned-files.ts";
import type { Listed } from "#/shared/lib/scanned-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "unnamed-restriction";
const WHOLE_MATCH = 0;
const RESTRICTED = "no-restricted-";
const UNNAMED = new RegExp(`(?:[\\w@-]+/)?${RESTRICTED}(?:imports|properties)\\b`, "gu");

const problemsIn = (entry: Listed, source: string): readonly Problem[] =>
  pipe(
    Arr.fromIterable(Str.matchAll(UNNAMED)(source)),
    Arr.map((found): Problem => ({
      file: entry.file,
      ...positionOf(source)(found.index ?? WHOLE_MATCH),
      rule: RULE,
      message: `${found[WHOLE_MATCH]} is not used in this repository, because its name does not say what an entry protects. Ban a package in dependencyRules.banned, and write any other restriction as a rule in msch-lint whose name states the intent.`,
    })),
  );

/** @internal */
export const checkRestrictedRules = Effect.fn("checkRestrictedRules")(
  function* checkRestrictedRules(root: string) {
    const listed = yield* listedFiles(root);
    return yield* scanText(pipe(listed, Arr.filter(isScannedText)), problemsIn);
  },
);
