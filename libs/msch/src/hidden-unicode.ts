import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "./problem.ts";
import { RepositoryFiles } from "./repository-files.ts";
import { positionOf } from "./text-position.ts";

const HIDDEN =
  /[\u00AD\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]|[\u{E0000}-\u{E007F}]/gu;

const NUL = "\0";
const START = 0;
const HEX = 16;
const CODE_POINT_WIDTH = 4;
const READ_CONCURRENCY = 64;
const RULE: RuleName = "hidden-unicode";

const hexOf = (character: string): string =>
  pipe(
    Str.codePointAt(START)(character),
    Option.getOrElse(() => START),
    (code) => code.toString(HEX),
    Str.toUpperCase,
    Str.padStart(CODE_POINT_WIDTH, "0"),
  );

const problemOf =
  (file: string, source: string) =>
  (found: RegExpMatchArray): Problem => {
    const hex = hexOf(found[START]);
    return {
      file,
      ...positionOf(source)(found.index ?? START),
      rule: RULE,
      message: `U+${hex} is invisible in editors and reviews and can change what the text means. Remove it, or write it as the escape \\u${hex}.`,
    };
  };

const problemsIn = (file: string, source: string): readonly Problem[] => {
  if (Str.includes(NUL)(source)) {
    return [];
  }
  return pipe(Arr.fromIterable(Str.matchAll(HIDDEN)(source)), Arr.map(problemOf(file, source)));
};

/** @internal */
const checkHiddenUnicode = Effect.fn("checkHiddenUnicode")(function* checkHiddenUnicode(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const names = yield* files.listedFiles(root);
  const found = yield* Effect.forEach(
    names,
    (name) => {
      const file = files.join(root, name);
      return files.readFile(file).pipe(
        Effect.map(
          Option.match({
            onNone: (): readonly Problem[] => [],
            onSome: (source) => problemsIn(file, source),
          }),
        ),
      );
    },
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.flatten(found);
});

export { checkHiddenUnicode };
