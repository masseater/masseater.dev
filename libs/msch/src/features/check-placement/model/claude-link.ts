import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "claude-md-link";
const CLAUDE = "CLAUDE.md";
const AGENTS = "AGENTS.md";
const FIRST = 1;
const READ_CONCURRENCY = 16;
const MESSAGE = "CLAUDE.md must be a symbolic link to AGENTS.md";

/** @internal */
export const checkClaudeLinks = Effect.fn("checkClaudeLinks")(function* checkClaudeLinks(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const [listed, links] = yield* Effect.all([files.listedFiles(root), files.linkedFiles(root)], {
    concurrency: "unbounded",
  });
  const problemOf = Effect.fn("problemOf")(function* problemOf(name: string) {
    const file = files.join(root, name);
    const target = yield* files.readLink(file);
    const isLink = pipe(links, Arr.contains(name));
    const pointsElsewhere = pipe(
      target,
      Option.exists((value) => value !== AGENTS),
    );
    return pipe(
      Option.liftPredicate(file, () => !isLink || pointsElsewhere),
      Option.map((path): Problem => ({
        file: path,
        line: FIRST,
        column: FIRST,
        rule: RULE,
        message: MESSAGE,
      })),
    );
  });
  const claude = pipe(
    listed,
    Arr.filter((name) => files.basename(name) === CLAUDE),
  );
  const found = yield* Effect.forEach(claude, problemOf, { concurrency: READ_CONCURRENCY });
  return Arr.getSomes(found);
});
