import { Array as Arr, Effect, Option } from "effect";

import { shadcnUiOf } from "#/entities/workspace/index.ts";
import type { ShadcnUi } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "shadcn-ui-alias";
const FIRST = 1;

const problemOf = (directory: string, { file, alias }: ShadcnUi): Problem => ({
  file,
  line: FIRST,
  column: FIRST,
  rule: RULE,
  message: `aliases.ui "${alias}" in ${directory}/components.json does not resolve to a directory through the imports of ${directory}/package.json. shadcn lint and msch then cannot tell which files are the design-system components. Point the alias at a "#/" import, such as "#/shared/ui", and map "#/*" to "./src/*".`,
});

/** @internal */
export const shadcnAliasProblems = Effect.fn("shadcnAliasProblems")(function* shadcnAliasProblems(
  root: string,
  directory: string,
) {
  const files = yield* RepositoryFiles;
  const found = yield* shadcnUiOf(root, directory);
  if (Option.isNone(found)) {
    return Arr.empty<Problem>();
  }
  const resolved = yield* Option.match(found.value.target, {
    onNone: () => Effect.succeed(false),
    onSome: (target) =>
      files
        .isDirectory(files.join(root, directory, target))
        .pipe(Effect.map(Option.getOrElse(() => false))),
  });
  if (resolved) {
    return Arr.empty<Problem>();
  }
  return [problemOf(directory, found.value)];
});
