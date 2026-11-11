import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "./problem.ts";
import { RepositoryFiles } from "./repository-files.ts";

const RULE: RuleName = "nested-docs";
const SEPARATOR = "/";
const MANIFEST_FILE = "package.json";
const FIRST = 1;
const READ_CONCURRENCY = 64;
const AGENT_DOCS = /^(?:AGENTS|CLAUDE)(?:\.[^/]+)?\.md$/iu;
const README = /^README(?:\.[^/]+)?$/iu;

const PublishedManifest = Schema.fromJsonString(
  Schema.Struct({ private: Schema.optional(Schema.Boolean) }),
);

const isNested = (name: string): boolean => Str.includes(SEPARATOR)(name);

const isPublishedPackage = Effect.fn("isPublishedPackage")(function* isPublishedPackage(
  root: string,
  directory: string,
) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(files.join(root, directory, MANIFEST_FILE));
  return pipe(
    text,
    Option.flatMap(Schema.decodeUnknownOption(PublishedManifest)),
    Option.exists((manifest) => manifest.private !== true),
  );
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
  "belongs only at the repository root or next to the package.json of a published package. Move its content into the root README.md and delete this file.";

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
  if (yield* isPublishedPackage(root, files.dirname(name))) {
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
