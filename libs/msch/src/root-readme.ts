import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";

import { MANIFEST_FILE } from "./dependencies.ts";
import type { Problem, RuleName } from "./problem.ts";
import { RepositoryFiles } from "./repository-files.ts";
import { positionOf } from "./text-position.ts";

const RULE: RuleName = "root-readme";
const SEPARATOR = "/";
const ALTERNATIVE = "|";
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
  readonly pattern: RegExp;
}

const patternOf = (names: readonly string[]): RegExp => {
  const alternatives = pipe(names, Arr.map(Str.replaceAll(SPECIAL, String.raw`\$&`)));
  return new RegExp(
    `(?<![\\p{L}\\p{N}_-])(?:${Arr.join(alternatives, ALTERNATIVE)})(?![\\p{L}\\p{N}_-])`,
    "gu",
  );
};

const packageNameIn = (text: Option.Option<string>): Option.Option<string> =>
  pipe(
    text,
    Option.flatMap(Schema.decodeOption(NamedManifest)),
    Option.flatMap((manifest) => Option.fromUndefinedOr(manifest.name)),
  );

const workspaceIn = Effect.fn("workspaceIn")(function* workspaceIn(root: string, name: string) {
  const files = yield* RepositoryFiles;
  const directory = files.dirname(name);
  const text = yield* files.readFile(files.join(root, name));
  const packageName = packageNameIn(text);
  const unscoped = pipe(packageName, Option.map(Str.replace(SCOPE, "")));
  const names = pipe(
    [Option.some(directory), Option.some(files.basename(directory)), packageName, unscoped],
    Arr.getSomes,
    Arr.dedupe,
  );
  return { directory, pattern: patternOf(names) };
});

const messageFor = (directory: string): string =>
  `names the workspace ${directory}. The root README describes the repository as a whole. Write what belongs to the workspace in ${directory}/README.md.`;

const problemsIn =
  (file: string, source: string) =>
  ({ directory, pattern }: Workspace): readonly Problem[] => {
    const message = messageFor(directory);
    const at = positionOf(source);
    return pipe(
      Arr.fromIterable(Str.matchAll(pattern)(source)),
      Arr.map((found) => ({ file, ...at(found.index ?? START), rule: RULE, message })),
    );
  };

const problemsInReadme = Effect.fn("problemsInReadme")(function* problemsInReadme(
  file: string,
  workspaces: readonly Workspace[],
) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(file);
  return pipe(
    text,
    Option.match({
      onNone: (): readonly Problem[] => [],
      onSome: (source) => pipe(workspaces, Arr.flatMap(problemsIn(file, source))),
    }),
  );
});

/** @internal */
export const checkRootReadme = Effect.fn("checkRootReadme")(function* checkRootReadme(
  root: string,
) {
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
  const found = yield* Effect.forEach(
    readmes,
    (name) => problemsInReadme(files.join(root, name), workspaces),
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.flatten(found);
});
