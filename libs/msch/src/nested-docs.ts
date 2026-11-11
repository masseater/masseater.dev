import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";
import { resolveConfigFromFile } from "vite-plus";

import type { Problem, RuleName } from "./problem.ts";
import { RepositoryFiles } from "./repository-files.ts";

const RULE: RuleName = "nested-docs";
const SEPARATOR = "/";
const CONFIG_FILE = "vite.config.ts";
const FIRST = 1;
const READ_CONCURRENCY = 64;
const AGENT_DOCS = /^(?:AGENTS|CLAUDE)(?:\.[^/]+)?\.md$/iu;
const README = /^README(?:\.[^/]+)?$/iu;

const Published = Schema.Struct({ publish: Schema.Literal(true) });
const WorkspaceConfig = Schema.Struct({ msch: Published });

const taggedError = Schema.TaggedError;

class WorkspaceConfigUnreadable extends taggedError<
  WorkspaceConfigUnreadable,
  { readonly brand: unique symbol }
>()("WorkspaceConfigUnreadable", { file: Schema.String }) {}

const isNested = (name: string): boolean => Str.includes(SEPARATOR)(name);

const isPublished = Effect.fn("isPublished")(function* isPublished(
  root: string,
  directory: string,
) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, directory, CONFIG_FILE);
  if (!(yield* files.exists(file))) {
    return false;
  }
  const config = yield* Effect.tryPromise({
    try: () => resolveConfigFromFile(file),
    catch: () => WorkspaceConfigUnreadable.make({ file }),
  }).pipe(Effect.option);
  return pipe(config, Option.flatMap(Schema.decodeUnknownOption(WorkspaceConfig)), Option.isSome);
});

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
  "is allowed below the root only in a workspace published to npm, marked by msch: { publish: true } in its vite.config.ts. Set it there if the workspace is published, or move the content into the root README.md and delete this file.";

const problemIn = Effect.fn("problemIn")(function* problemIn(root: string, name: string) {
  const files = yield* RepositoryFiles;
  const base = files.basename(name);
  const file = files.join(root, name);
  if (AGENT_DOCS.test(base)) {
    return Option.some(problemFor(file, `${base} ${AGENT_DOCS_MESSAGE}`));
  }
  if (!README.test(base)) {
    return Option.none<Problem>();
  }
  if (yield* isPublished(root, files.dirname(name))) {
    return Option.none<Problem>();
  }
  return Option.some(problemFor(file, `${base} ${README_MESSAGE}`));
});

/** @internal */
const checkNestedDocs = Effect.fn("checkNestedDocs")(function* checkNestedDocs(root: string) {
  const files = yield* RepositoryFiles;
  const names = yield* files.listedFiles(root);
  const nested = pipe(names, Arr.filter(isNested));
  const found = yield* Effect.forEach(nested, (name) => problemIn(root, name), {
    concurrency: READ_CONCURRENCY,
  });
  return Arr.getSomes(found);
});

export { checkNestedDocs };
