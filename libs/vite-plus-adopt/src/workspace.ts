import {
  Effect,
  FileSystem,
  Path,
  Schema,
  Array as Arr,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";
import type { PlatformError } from "effect";
import type { ChildProcessSpawner } from "effect/process";
import { parse } from "yaml";

import { listGitFiles } from "./git.ts";

const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;

type DependencyField = (typeof DEPENDENCY_FIELDS)[number];

interface Dependency {
  readonly manifest: string;
  readonly field: DependencyField;
  readonly name: string;
  readonly specifier: string;
}

type WorkspaceServices =
  | ChildProcessSpawner.ChildProcessSpawner
  | FileSystem.FileSystem
  | Path.Path;

const Specifiers = Schema.optionalKey(Schema.Record(Schema.String, Schema.String));

const Manifest = Schema.Struct({
  dependencies: Specifiers,
  devDependencies: Specifiers,
  optionalDependencies: Specifiers,
  peerDependencies: Specifiers,
});

const Workspace = Schema.Struct({
  packages: Schema.optionalKey(Schema.Array(Schema.String)),
});

const decodeManifest = Schema.decodeEffect(Schema.fromJsonString(Manifest));

const decodeWorkspace = Schema.decodeUnknownEffect(Workspace);

const NEGATION = "!";

const manifestPathspec = (pattern: string): string => {
  if (Str.startsWith(NEGATION)(pattern)) {
    return `:(glob,exclude)${Str.slice(NEGATION.length)(pattern)}/package.json`;
  }
  return `:(glob)${pattern}/package.json`;
};

const listManifests = (
  root: string,
): Effect.Effect<
  readonly string[],
  PlatformError.PlatformError | Schema.SchemaError,
  WorkspaceServices
> =>
  Effect.gen(function* list() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const text = yield* fs.readFileString(path.join(root, "pnpm-workspace.yaml"));
    const raw: unknown = parse(text);
    const workspace = yield* decodeWorkspace(raw);
    const found = yield* listGitFiles(
      root,
      pipe(workspace.packages ?? [], Arr.map(manifestPathspec)),
    );
    return ["package.json", ...Arr.sort(found, Str.Order)];
  });

const dependenciesOf =
  (manifest: string) =>
  (specifiers: typeof Manifest.Type): readonly Dependency[] =>
    pipe(
      DEPENDENCY_FIELDS,
      Arr.flatMap((field) =>
        pipe(
          Rec.toEntries(specifiers[field] ?? {}),
          Arr.map(([name, specifier]) => ({ manifest, field, name, specifier })),
        ),
      ),
    );

const listDependencies = (
  root: string,
): Effect.Effect<
  readonly Dependency[],
  PlatformError.PlatformError | Schema.SchemaError,
  WorkspaceServices
> =>
  Effect.gen(function* list() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const manifests = yield* listManifests(root);
    const parsed = yield* pipe(
      manifests,
      Effect.forEach((manifest) =>
        fs
          .readFileString(path.join(root, manifest))
          .pipe(Effect.flatMap(decodeManifest), Effect.map(dependenciesOf(manifest))),
      ),
    );
    return Arr.flatten(parsed);
  });

export { listDependencies };
export type { Dependency, DependencyField, WorkspaceServices };
