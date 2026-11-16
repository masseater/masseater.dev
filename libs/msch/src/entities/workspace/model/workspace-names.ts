import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";

import { MANIFEST_FILE } from "#/entities/package/@x/workspace.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const SEPARATOR = "/";
const ALTERNATIVE = "|";
const SCOPE = /^@[^/]+\//u;
const SPECIAL = /[$()*+.?[\\\]^{|}]/gu;
const READ_CONCURRENCY = 16;
const NamedManifest = Schema.fromJsonString(
  Schema.Struct({ name: Schema.optional(Schema.String) }),
);

export interface NamedWorkspace {
  readonly directory: string;
  readonly names: readonly string[];
  readonly packageName: Option.Option<string>;
}

/** @internal */
export const patternOf = (names: readonly string[]): RegExp => {
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
  return { directory, names, packageName };
});

/** @internal */
export const namedWorkspaces = Effect.fn("namedWorkspaces")(function* namedWorkspaces(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const manifests = pipe(
    listed,
    Arr.filter((name) => Str.includes(SEPARATOR)(name) && files.basename(name) === MANIFEST_FILE),
  );
  const found: readonly NamedWorkspace[] = yield* Effect.forEach(
    manifests,
    (name) => workspaceIn(root, name),
    { concurrency: READ_CONCURRENCY },
  );
  return found;
});
