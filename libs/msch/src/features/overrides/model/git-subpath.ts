import { Array as Arr, Effect, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { listedFiles, scanText } from "#/shared/lib/scanned-files.ts";
import type { Listed } from "#/shared/lib/scanned-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const DEPENDENCY_FILE = /(?:^|\/)(?:package\.json|pnpm-workspace\.ya?ml)$/u;
const GIT_SUBPATH = /(?<![^\s"':])[^\s"'#]+#(?:[^\s"'&]*&)*path:[^\s"']*/gu;
const RULE: RuleName = "git-subpath-dependency";
const WHOLE_MATCH = 0;

const problemAt =
  ({ file }: Listed, source: string) =>
  (found: RegExpMatchArray): Problem => ({
    file,
    ...positionOf(source)(found.index ?? WHOLE_MATCH),
    rule: RULE,
    message: `Git subpath dependencies are banned. Publish the package to npm and depend on a released version instead of \`${Str.trim(found[WHOLE_MATCH])}\`.`,
  });

const problemsIn = (entry: Listed, source: string): readonly Problem[] =>
  pipe(Arr.fromIterable(Str.matchAll(GIT_SUBPATH)(source)), Arr.map(problemAt(entry, source)));

const isDependencyFile = ({ name }: Listed): boolean => DEPENDENCY_FILE.test(name);

/** @internal */
export const checkGitSubpath = Effect.fn("checkGitSubpath")(function* checkGitSubpath(
  root: string,
) {
  const listed = yield* listedFiles(root);
  return yield* scanText(pipe(listed, Arr.filter(isDependencyFile)), problemsIn);
});
