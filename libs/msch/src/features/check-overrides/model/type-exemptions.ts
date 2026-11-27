import { Array as Arr, Effect, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { isScannedText, listedFiles, scanText } from "#/shared/lib/scanned-files.ts";
import type { Listed } from "#/shared/lib/scanned-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "named-type-exemption";
const WHOLE_MATCH = 0;
const ORIGINS = "file|lib|package";
const SPECIFIER = new RegExp(`["']?\\bfrom["']?\\s*:\\s*["'](?:${ORIGINS})["']`, "gu");

const problemsIn = (entry: Listed, source: string): readonly Problem[] =>
  pipe(
    Arr.fromIterable(Str.matchAll(SPECIFIER)(source)),
    Arr.map((found): Problem => ({
      file: entry.file,
      ...positionOf(source)(found.index ?? WHOLE_MATCH),
      rule: RULE,
      message:
        "exempts a type from a lint rule by its name. Such a list is written by hand for every dependency and only grows. msch-lint/readonly-parameters reads where each type is declared and exempts the types of packages and of the language by itself, so remove the entry. For another rule, add a rule to msch-lint that reads the declaration.",
    })),
  );

/** @internal */
export const checkTypeExemptions = Effect.fn("checkTypeExemptions")(function* checkTypeExemptions(
  root: string,
) {
  const listed = yield* listedFiles(root);
  return yield* scanText(pipe(listed, Arr.filter(isScannedText)), problemsIn);
});
