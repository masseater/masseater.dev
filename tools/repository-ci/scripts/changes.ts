import { getJson, outputOf, warn } from "@masseater.dev/github-workflow";
import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";
import type { ChildProcessSpawner } from "effect/process";

const SHA = /^[0-9a-f]{40}$/u;
const ROOT = ".";

const Package = Schema.Struct({
  dependencies: Schema.optionalKey(Schema.Array(Schema.String)),
  devDependencies: Schema.optionalKey(Schema.Array(Schema.String)),
});

const Task = Schema.Struct({
  package: Schema.String,
  name: Schema.String,
  dependsOn: Schema.optionalKey(Schema.Array(Schema.String)),
});

/** @internal */
export const Workspace = Schema.fromJsonString(
  Schema.Struct({
    workspaceRoot: Schema.String,
    packages: Schema.Record(Schema.String, Package),
    tasks: Schema.Record(Schema.String, Task),
  }),
);

/** @internal */
export type Packages = (typeof Workspace.Type)["packages"];

/** @internal */
export type Tasks = (typeof Workspace.Type)["tasks"];

const Caches = Schema.Struct({
  actions_caches: Schema.Array(Schema.Struct({ key: Schema.String })),
});

/** @internal */
export const workspace = outputOf({ command: "vp", args: ["run", "--json"] }).pipe(
  Effect.flatMap(Schema.decodeEffect(Workspace)),
);

const neighborsOf = (packages: Packages, directory: string): readonly string[] => {
  const { dependencies = [], devDependencies = [] } = packages[directory] ?? {};
  return [...dependencies, ...devDependencies];
};

const closureOf = (packages: Packages, start: readonly string[]): readonly string[] => {
  const seen = new Set(start);
  const queue = [...start];
  for (const directory of queue) {
    for (const next of neighborsOf(packages, directory)) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return [...seen];
};

const isShared =
  (workflows: readonly string[]) =>
  (file: string): boolean =>
    Arr.contains(workflows, file) ||
    Str.startsWith(".github/actions/")(file) ||
    Str.startsWith("patches/")(file) ||
    (!Str.includes("/")(file) && !Str.endsWith(".md")(file));

const lastMarked = Effect.fn("lastMarked")(
  function* lastMarked(prefix: string) {
    const { actions_caches } = yield* getJson(Caches)(
      `actions/caches?ref=refs/heads/main&key=${encodeURIComponent(prefix)}&sort=created_at&direction=desc&per_page=100`,
    );
    return pipe(
      actions_caches,
      Arr.map(({ key }) => Str.slice(prefix.length)(key)),
      Arr.findFirst((sha) => SHA.test(sha)),
    );
  },
  Effect.tapError(() => warn("The markers could not be read, so every stack counts as changed")),
  Effect.orElseSucceed(Option.none),
);

const changedSince = (
  sha: string,
): Effect.Effect<
  Option.Option<readonly string[]>,
  never,
  ChildProcessSpawner.ChildProcessSpawner
> =>
  outputOf({ command: "git", args: ["diff", "--name-only", "--no-renames", sha, "HEAD"] }).pipe(
    Effect.map((output) => pipe(Str.split("\n")(output), Arr.filter(Str.isNonEmpty))),
    Effect.option,
  );

/** @internal */
export type Changes = Readonly<{
  packages: Packages;
  marker: string;
  workflows: readonly string[];
}>;

/** @internal */
export const isChanged = Effect.fn("isChanged")(function* isChanged(
  { packages, marker, workflows }: Changes,
  stack: Readonly<{ name: string; directories: readonly string[] }>,
) {
  const last = yield* lastMarked(`${marker}${stack.name}-`);
  const files = yield* pipe(
    last,
    Option.match({
      onNone: () => Effect.succeedNone,
      onSome: changedSince,
    }),
  );
  const directories = pipe(
    closureOf(packages, stack.directories),
    Arr.filter((directory) => directory !== ROOT),
  );
  const touched = (file: string): boolean =>
    isShared(workflows)(file) ||
    pipe(
      directories,
      Arr.some((directory) => Str.startsWith(`${directory}/`)(file)),
    );
  return pipe(
    files,
    Option.match({
      onNone: () => true,
      onSome: (changed: readonly string[]) => pipe(changed, Arr.some(touched)),
    }),
  );
});

/** @internal */
export const nameOf = (directory: string): string =>
  pipe(
    Str.split(directory, "/"),
    Arr.last,
    Option.getOrElse(() => directory),
  );
