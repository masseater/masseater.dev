import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";
import { parse } from "yaml";

import { RepositoryFiles } from "./repository-files.ts";

const WORKSPACE_FILE = "pnpm-workspace.yaml";
const MANIFEST_FILE = "package.json";
const NEGATION = "!";

const WorkspaceFile = Schema.Struct({ packages: Schema.optionalKey(Schema.Array(Schema.String)) });
const decodeWorkspaceFile = Schema.decodeUnknownOption(WorkspaceFile);

const manifestPathspec = (pattern: string): string => {
  if (Str.startsWith(NEGATION)(pattern)) {
    return `:(glob,exclude)${Str.slice(NEGATION.length)(pattern)}/${MANIFEST_FILE}`;
  }
  return `:(glob)${pattern}/${MANIFEST_FILE}`;
};

const packagesOf = (text: string): readonly string[] => {
  const raw: unknown = parse(text);
  return pipe(
    decodeWorkspaceFile(raw),
    Option.flatMap(({ packages }) => Option.fromUndefinedOr(packages)),
    Option.getOrElse((): readonly string[] => []),
  );
};

/** @internal */
const workspaceDirectories = Effect.fn("workspaceDirectories")(function* workspaceDirectories(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(files.join(root, WORKSPACE_FILE));
  const patterns = pipe(
    text,
    Option.map(packagesOf),
    Option.getOrElse((): readonly string[] => []),
  );
  if (!Arr.isReadonlyArrayNonEmpty(patterns)) {
    return [];
  }
  const manifests = yield* files.matchingFiles(root, pipe(patterns, Arr.map(manifestPathspec)));
  const directories = pipe(
    manifests,
    Arr.map((manifest) => files.dirname(manifest)),
  );
  return Arr.sort(directories, Str.Order);
});

export { workspaceDirectories };
