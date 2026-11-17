import { Array as Arr, Effect, Option, Schema, Stream, String as Str, pipe } from "effect";
import { ChildProcess } from "effect/process";

const SEPARATOR = "/";

const CrateTarget = Schema.Struct({ kind: Schema.Array(Schema.String) });
const CrateDependency = Schema.Struct({ path: Schema.optional(Schema.String) });
const CrateEntry = Schema.Struct({
  name: Schema.String,
  version: Schema.String,
  manifest_path: Schema.String,
  targets: Schema.Array(CrateTarget),
  dependencies: Schema.Array(CrateDependency),
});
const CrateList = Schema.fromJsonString(Schema.Struct({ packages: Schema.Array(CrateEntry) }));
const decodeCrateList = Schema.decodeUnknownEffect(CrateList);

export interface Crate {
  readonly name: string;
  readonly version: string;
  readonly manifest: string;
  readonly kinds: readonly string[];
  readonly pathDependencies: readonly string[];
}

const crateOf = (crate: typeof CrateEntry.Type): Crate => ({
  name: crate.name,
  version: crate.version,
  manifest: crate.manifest_path,
  kinds: pipe(
    crate.targets,
    Arr.flatMap(({ kind }) => kind),
    Arr.dedupe,
  ),
  pathDependencies: pipe(
    crate.dependencies,
    Arr.flatMap(({ path }) => Option.toArray(Option.fromUndefinedOr(path))),
  ),
});

/** @internal */
export const cratesIn = Effect.fn("cratesIn")(function* cratesIn(root: string) {
  const handle = yield* ChildProcess.make(
    "cargo",
    ["metadata", "--no-deps", "--format-version", "1", "--offline"],
    { cwd: root, extendEnv: true, stdin: "ignore" },
  );
  const output = yield* handle.stdout.pipe(Stream.decodeText(), Stream.mkString);
  const list = yield* decodeCrateList(output);
  return pipe(list.packages, Arr.map(crateOf));
}, Effect.scoped);

/** @internal */
export const owningWorkspace =
  (directories: readonly string[]) =>
  (directory: string): Option.Option<string> => {
    const owners = pipe(
      directories,
      Arr.filter(
        (workspace) =>
          directory === workspace || Str.startsWith(`${workspace}${SEPARATOR}`)(directory),
      ),
    );
    return Arr.last(Arr.sort(owners, Str.Order));
  };
