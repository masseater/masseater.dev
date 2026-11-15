import { Array as Arr, Effect, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "root-docs";
const SEPARATOR = "/";
const FIRST = 1;
const MARKDOWN = /\.(?:md|mdx|markdown)$/iu;
const ALLOWED =
  /^(?:README(?:\.[^/]+)?|AGENTS|CLAUDE|ARCHITECTURE|DESIGN|CHANGELOG|LICENSE|NOTICE)\.(?:md|mdx|markdown)$/iu;
const MESSAGE =
  "is a hand-written document outside the places documents belong. Hand-written text goes only in the root README.md, AGENTS.md, CLAUDE.md, ARCHITECTURE.md and DESIGN.md, and under docs/. Move what is still true and not already told by the code into one of them, and delete this file.";

const isStrayRootDoc = (name: string): boolean =>
  !Str.includes(SEPARATOR)(name) && MARKDOWN.test(name) && !ALLOWED.test(name);

/** @internal */
export const checkRootDocs = Effect.fn("checkRootDocs")(function* checkRootDocs(root: string) {
  const files = yield* RepositoryFiles;
  const names = yield* files.listedFiles(root);
  return pipe(
    names,
    Arr.filter(isStrayRootDoc),
    Arr.map((name): Problem => ({
      file: files.join(root, name),
      line: FIRST,
      column: FIRST,
      rule: RULE,
      message: `${name} ${MESSAGE}`,
    })),
  );
});
