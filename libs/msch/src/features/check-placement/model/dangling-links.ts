import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "dangling-link";
const SEPARATOR = "/";
const FIRST = 1;
const READ_CONCURRENCY = 16;

const holds =
  (target: string) =>
  (name: string): boolean =>
    name === target || Str.startsWith(`${target}${SEPARATOR}`)(name);

/** @internal */
export const checkDanglingLinks = Effect.fn("checkDanglingLinks")(function* checkDanglingLinks(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const [links, listed] = yield* Effect.all([files.linkedFiles(root), files.listedFiles(root)], {
    concurrency: "unbounded",
  });
  const problemOf = Effect.fn("problemOf")(function* problemOf(name: string) {
    const file = files.join(root, name);
    const link = yield* files.readLink(file);
    return pipe(
      link,
      Option.map((target) => files.relative(root, files.resolve(files.dirname(file), target))),
      Option.filter((target) => !pipe(listed, Arr.some(holds(target)))),
      Option.map((target): Problem => ({
        file,
        line: FIRST,
        column: FIRST,
        rule: RULE,
        message: `is a link to ${target}, where no file is tracked. A fresh checkout gets a link to nothing, and GitHub Actions fails to load the repository's actions. Track a file there, such as .gitkeep, or delete the link.`,
      })),
    );
  });
  const found = yield* Effect.forEach(links, problemOf, { concurrency: READ_CONCURRENCY });
  return Arr.getSomes(found);
});
