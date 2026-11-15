import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "vite-plus-block";
const AGENT_DOC = /(?:^|\/)(?:AGENTS|CLAUDE)\.md$/u;
const MARKER = Arr.join(["<!--", "VITE PLUS START", "-->"], "");
const READ_CONCURRENCY = 16;
const MESSAGE =
  "holds the Vite+ block that `vp create --agent` and `vp migrate --agent` write, and every `vp config` rewrites it. Delete the block with its markers. The vite-plus skill reads the same guidance from node_modules/vite-plus/AGENTS.md.";

const problemIn =
  (file: string) =>
  (source: string): Option.Option<Problem> =>
    pipe(
      Str.indexOf(MARKER)(source),
      Option.map((index) => ({ file, ...positionOf(source)(index), rule: RULE, message: MESSAGE })),
    );

/** @internal */
export const checkVitePlusBlock = Effect.fn("checkVitePlusBlock")(function* checkVitePlusBlock(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const docs = pipe(
    listed,
    Arr.filter((name) => AGENT_DOC.test(name)),
  );
  const found = yield* Effect.forEach(
    docs,
    (name) => {
      const file = files.join(root, name);
      const problemOf = Option.flatMap(problemIn(file));
      return files.readFile(file).pipe(Effect.map(problemOf));
    },
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.getSomes(found);
});
