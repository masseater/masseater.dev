import { Array as Arr, Effect, HashSet, Option, String as Str, pipe } from "effect";

import { MANIFEST_FILE } from "./dependencies.ts";
import type { Problem, RuleName } from "./problem.ts";
import { RepositoryFiles } from "./repository-files.ts";

const RULE: RuleName = "nested-docs";
const SEPARATOR = "/";
const FIRST = 1;
const READ_CONCURRENCY = 64;
const AGENT_DOCS = /^(?:AGENTS|CLAUDE)(?:\.[^/]+)?\.md$/iu;
const README = /^README(?:\.[^/]+)?$/iu;

const isNested = (name: string): boolean => Str.includes(SEPARATOR)(name);

const problemFor = (file: string, message: string): Problem => ({
  file,
  line: FIRST,
  column: FIRST,
  rule: RULE,
  message,
});

const AGENT_DOCS_MESSAGE =
  "belongs only at the repository root. Move what agents need into the root AGENTS.md and delete this file.";
const README_MESSAGE =
  "is allowed below the root only in a workspace directory, next to its package.json. Move it into the workspace it describes.";

const problemIn = Effect.fn("problemIn")(function* problemIn(
  root: string,
  workspaces: HashSet.HashSet<string>,
  name: string,
) {
  const files = yield* RepositoryFiles;
  const base = files.basename(name);
  const file = files.join(root, name);
  if (AGENT_DOCS.test(base)) {
    return Option.some(problemFor(file, `${base} ${AGENT_DOCS_MESSAGE}`));
  }
  if (!README.test(base)) {
    return Option.none<Problem>();
  }
  if (HashSet.has(workspaces, files.dirname(name))) {
    return Option.none<Problem>();
  }
  return Option.some(problemFor(file, `${base} ${README_MESSAGE}`));
});

/** @internal */
const checkNestedDocs = Effect.fn("checkNestedDocs")(function* checkNestedDocs(root: string) {
  const files = yield* RepositoryFiles;
  const names = yield* files.listedFiles(root);
  const nested = pipe(names, Arr.filter(isNested));
  const workspaces = pipe(
    nested,
    Arr.filter((name) => files.basename(name) === MANIFEST_FILE),
    Arr.map((name) => files.dirname(name)),
    HashSet.fromIterable,
  );
  const found = yield* Effect.forEach(nested, (name) => problemIn(root, workspaces, name), {
    concurrency: READ_CONCURRENCY,
  });
  return Arr.getSomes(found);
});

export { checkNestedDocs };
