import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";

import { MANIFEST_FILE } from "./dependencies.ts";
import type { Problem, RuleName } from "./problem.ts";
import { RepositoryFiles } from "./repository-files.ts";
import { positionOf } from "./text-position.ts";

const RULE: RuleName = "root-readme";
const SEPARATOR = "/";
const SCOPE = /^@[^/]+\//u;
const README = /^README(?:\.[^/]+)?$/iu;
const SPECIAL = /[$()*+.?[\\\]^{|}]/gu;
const READ_CONCURRENCY = 16;
const START = 0;
const NamedManifest = Schema.fromJsonString(
  Schema.Struct({ name: Schema.optional(Schema.String) }),
);

interface Workspace {
  readonly directory: string;
  readonly names: readonly string[];
}

const escaped = (name: string): string => Str.replace(SPECIAL, String.raw`\$&`)(name);

const patternOf = (names: readonly string[]): RegExp =>
  new RegExp(
    `(?<![\\p{L}\\p{N}_-])(?:${pipe(names, Arr.map(escaped), Arr.join("|"))})(?![\\p{L}\\p{N}_-])`,
    "gu",
  );

const workspaceIn = Effect.fn("workspaceIn")(function* workspaceIn(root: string, name: string) {
  const files = yield* RepositoryFiles;
  const directory = files.dirname(name);
  const text = yield* files.readFile(files.join(root, name));
  const packageName = pipe(
    text,
    Option.flatMap(Schema.decodeOption(NamedManifest)),
    Option.flatMap((manifest) => Option.fromUndefinedOr(manifest.name)),
  );
  const names = pipe(
    [
      Option.some(directory),
      Option.some(files.basename(directory)),
      packageName,
      Option.map(packageName, Str.replace(SCOPE, "")),
    ],
    Arr.getSomes,
    Arr.dedupe,
    Arr.sort((left: string, right: string) => right.length - left.length),
  );
  return { directory, names };
});

const problemsIn =
  (file: string, source: string) =>
  ({ directory, names }: Workspace): readonly Problem[] =>
    pipe(
      Arr.fromIterable(Str.matchAll(patternOf(names))(source)),
      Arr.map((found) => ({
        file,
        ...positionOf(source)(found.index ?? START),
        rule: RULE,
        message: `names the workspace ${directory}. The root README describes the repository as a whole. Write what belongs to the workspace in ${directory}/README.md.`,
      })),
    );

/** @internal */
const checkRootReadme = Effect.fn("checkRootReadme")(function* checkRootReadme(root: string) {
  const files = yield* RepositoryFiles;
  const names = yield* files.listedFiles(root);
  const readmes = pipe(
    names,
    Arr.filter((name) => README.test(name)),
  );
  const manifests = pipe(
    names,
    Arr.filter((name) => Str.includes(SEPARATOR)(name) && files.basename(name) === MANIFEST_FILE),
  );
  const workspaces = yield* Effect.forEach(manifests, (name) => workspaceIn(root, name), {
    concurrency: READ_CONCURRENCY,
  });
  const found = yield* Effect.forEach(readmes, (name) => {
    const file = files.join(root, name);
    return files.readFile(file).pipe(
      Effect.map(
        Option.match({
          onNone: (): readonly Problem[] => [],
          onSome: (source) => pipe(workspaces, Arr.flatMap(problemsIn(file, source))),
        }),
      ),
    );
  });
  return Arr.flatten(found);
});

export { checkRootReadme };
