import { Array as Arr, Effect, HashSet, Option, Schema, String as Str, pipe } from "effect";
import { resolveConfigFromFile } from "vite-plus";

import { MANIFEST_FILE } from "./dependencies.ts";
import type { Problem, RuleName } from "./problem.ts";
import { publishedWorkspaces } from "./published.ts";
import { RepositoryFiles } from "./repository-files.ts";

const RULE: RuleName = "nested-docs";
const CONFIG_FILE = "vite.config.ts";
const SEPARATOR = "/";
const FIRST = 1;
const READ_CONCURRENCY = 64;
const AGENT_DOCS = /^(?:AGENTS|CLAUDE)(?:\.[^/]+)?\.md$/iu;
const WORKSPACE_AGENT_DOC = "AGENTS.md";
const README = /^README(?:\.[^/]+)?$/iu;

const RootConfig = Schema.Struct({
  msch: Schema.Struct({ workspaceAgentsMd: Schema.Literal(true) }),
});

const taggedError = Schema.TaggedError;

class RootConfigUnreadable extends taggedError<
  RootConfigUnreadable,
  { readonly brand: unique symbol }
>()("RootConfigUnreadable", { file: Schema.String }) {}

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
const WORKSPACE_AGENT_DOCS_MESSAGE =
  "belongs only at the repository root or as AGENTS.md directly in a workspace, the directory that holds its package.json. Move what agents need there and delete this file.";
const README_MESSAGE =
  "is allowed below the root only in a workspace published to npm, marked by msch: { publish: { installSize } } in its vite.config.ts. Set it there if the workspace is published, or move the content into the root README.md and delete this file.";

interface Allowed {
  readonly workspaceAgentDocs: Option.Option<HashSet.HashSet<string>>;
  readonly published: HashSet.HashSet<string>;
}

interface NestedDoc {
  readonly file: string;
  readonly base: string;
  readonly directory: string;
}

const agentDocProblem = (
  { file, base, directory }: NestedDoc,
  allowed: Allowed,
): Option.Option<Problem> =>
  Option.match(allowed.workspaceAgentDocs, {
    onNone: () => Option.some(problemFor(file, `${base} ${AGENT_DOCS_MESSAGE}`)),
    onSome: (workspaces) => {
      if (base === WORKSPACE_AGENT_DOC && HashSet.has(workspaces, directory)) {
        return Option.none<Problem>();
      }
      return Option.some(problemFor(file, `${base} ${WORKSPACE_AGENT_DOCS_MESSAGE}`));
    },
  });

const readmeProblem = (
  { file, base, directory }: NestedDoc,
  allowed: Allowed,
): Option.Option<Problem> => {
  if (!README.test(base) || HashSet.has(allowed.published, directory)) {
    return Option.none<Problem>();
  }
  return Option.some(problemFor(file, `${base} ${README_MESSAGE}`));
};

const problemIn = Effect.fn("problemIn")(function* problemIn(
  root: string,
  allowed: Allowed,
  name: string,
) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, name);
  const doc: NestedDoc = { file, base: files.basename(name), directory: files.dirname(file) };
  if (AGENT_DOCS.test(doc.base)) {
    return agentDocProblem(doc, allowed);
  }
  return readmeProblem(doc, allowed);
});

const allowsWorkspaceAgentDocs = Effect.fn("allowsWorkspaceAgentDocs")(
  function* allowsWorkspaceAgentDocs(root: string) {
    const files = yield* RepositoryFiles;
    const file = files.join(root, CONFIG_FILE);
    const exists = yield* files.exists(file);
    if (!exists) {
      return false;
    }
    const config = yield* Effect.tryPromise({
      try: () => resolveConfigFromFile(file),
      catch: () => RootConfigUnreadable.make({ file }),
    }).pipe(Effect.option);
    return pipe(config, Option.flatMap(Schema.decodeUnknownOption(RootConfig)), Option.isSome);
  },
);

/** @internal */
const checkNestedDocs = Effect.fn("checkNestedDocs")(function* checkNestedDocs(root: string) {
  const files = yield* RepositoryFiles;
  const names = yield* files.listedFiles(root);
  const nested = pipe(names, Arr.filter(isNested));
  const workspaces = yield* publishedWorkspaces(root);
  const workspaceAgentDocs = yield* allowsWorkspaceAgentDocs(root);
  const allowed: Allowed = {
    published: pipe(
      workspaces,
      Arr.map((workspace) => workspace.directory),
      HashSet.fromIterable,
    ),
    workspaceAgentDocs: Option.liftPredicate(
      pipe(
        nested,
        Arr.filter((name) => files.basename(name) === MANIFEST_FILE),
        Arr.map((name) => files.dirname(files.join(root, name))),
        HashSet.fromIterable,
      ),
      () => workspaceAgentDocs,
    ),
  };
  const found = yield* Effect.forEach(nested, (name) => problemIn(root, allowed, name), {
    concurrency: READ_CONCURRENCY,
  });
  return Arr.getSomes(found);
});

export { checkNestedDocs };
