import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RENOVATE_FILE = /^(?:\.github\/|\.gitlab\/)?(?:renovate\.json5?|\.renovaterc(?:\.json5?)?)$/u;
const AUTOMERGE_OFF = /["']?platformAutomerge["']?\s*:\s*false/gu;
const VERSION_CAP = /["']?allowedVersions["']?\s*:\s*["'](?<range>[^"']*<[^"']*)["']/gu;
const AUTOMERGE_RULE: RuleName = "renovate-platform-automerge";
const CAP_RULE: RuleName = "renovate-version-cap";
const AUTOMERGE_MESSAGE =
  "sets `platformAutomerge: false`. Keep the platform's automerge on so passing updates merge without waiting for the next Renovate run.";
const CAP_MESSAGE =
  "caps a dependency below a version with `allowedVersions`. A cap holds the dependency on an old version, which is a downgrade that never ends: fix what breaks on the new version instead.";

const offsetsOf = (pattern: RegExp, source: string): readonly number[] =>
  pipe(
    Arr.fromIterable(Str.matchAll(pattern)(source)),
    Arr.flatMap((match) => Option.toArray(Option.fromUndefinedOr(match.index))),
  );

const problemsIn = (file: string, source: string): readonly Problem[] => {
  const at = positionOf(source);
  const found = (pattern: RegExp, rule: RuleName, message: string): readonly Problem[] =>
    pipe(
      offsetsOf(pattern, source),
      Arr.map((offset): Problem => ({ file, ...at(offset), rule, message })),
    );
  return [
    ...found(AUTOMERGE_OFF, AUTOMERGE_RULE, AUTOMERGE_MESSAGE),
    ...found(VERSION_CAP, CAP_RULE, CAP_MESSAGE),
  ];
};

/** @internal */
export const checkRenovateSettings = Effect.fn("checkRenovateSettings")(
  function* checkRenovateSettings(root: string) {
    const files = yield* RepositoryFiles;
    const listed = yield* files.listedFiles(root);
    const found = yield* Effect.forEach(
      pipe(
        listed,
        Arr.filter((name) => RENOVATE_FILE.test(name)),
      ),
      (name) => {
        const file = files.join(root, name);
        return files
          .readFile(file)
          .pipe(
            Effect.map(
              Option.match({ onNone: () => [], onSome: (source) => problemsIn(file, source) }),
            ),
          );
      },
    );
    return Arr.flatten(found);
  },
);
