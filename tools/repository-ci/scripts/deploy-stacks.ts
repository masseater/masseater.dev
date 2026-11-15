#!/usr/bin/env node
import { getJson, outputOf, warn, writeOutputs } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";
import type { ChildProcessSpawner } from "effect/process";

const TASK = "deploy:production";
const MARKER = "deployed-";
const SHA = /^[0-9a-f]{40}$/u;
const ROOT = ".";

const Task = Schema.Struct({
  package: Schema.String,
  dependsOn: Schema.optionalKey(Schema.Array(Schema.String)),
});

const Plan = Schema.fromJsonString(Schema.Struct({ plan: Schema.Record(Schema.String, Task) }));

const Package = Schema.Struct({
  dependencies: Schema.optionalKey(Schema.Array(Schema.String)),
  devDependencies: Schema.optionalKey(Schema.Array(Schema.String)),
});

const Workspace = Schema.fromJsonString(
  Schema.Struct({ packages: Schema.Record(Schema.String, Package) }),
);

const Caches = Schema.Struct({
  actions_caches: Schema.Array(Schema.Struct({ key: Schema.String })),
});

const Stacks = Schema.fromJsonString(
  Schema.Array(Schema.Struct({ name: Schema.String, filters: Schema.String })),
);

type Tasks = (typeof Plan.Type)["plan"];

type Packages = (typeof Workspace.Type)["packages"];

type Labels = Readonly<Record<string, string>>;

type Stack = Readonly<{ name: string; filters: string; directories: readonly string[] }>;

const dependenciesOf = (task: typeof Task.Type): readonly string[] => task.dependsOn ?? [];

const edgesOf = ([id, task]: readonly [string, typeof Task.Type]): readonly (readonly [
  string,
  string,
])[] =>
  pipe(
    dependenciesOf(task),
    Arr.map((dependency) => [id, dependency] as const),
  );

const relabel =
  (from: string, to: string) =>
  (label: string): string =>
    pipe(
      label,
      Option.liftPredicate((current) => current === from),
      Option.as(to),
      Option.getOrElse(() => label),
    );

const joined = (labels: Labels, [left, right]: readonly [string, string]): Labels =>
  pipe(labels, Rec.map(relabel(labels[right] ?? right, labels[left] ?? left)));

const nameOf = (directory: string): string =>
  pipe(
    Str.split(directory, "/"),
    Arr.last,
    Option.getOrElse(() => directory),
  );

const stacksOf = (tasks: Tasks): readonly Stack[] => {
  const ids = Rec.keys(tasks);
  const needed = pipe(Rec.values(tasks), Arr.flatMap(dependenciesOf));
  let labels: Labels = Rec.fromIterableWith(ids, (id) => [id, id]);
  for (const edge of Arr.flatMap(Rec.toEntries(tasks), edgesOf)) {
    labels = joined(labels, edge);
  }
  const directoryOf = (id: string): readonly string[] =>
    pipe(
      Option.fromNullishOr(tasks[id]),
      Option.map(({ package: directory }) => directory),
      Option.toArray,
    );
  return pipe(
    Arr.groupBy(ids, (id) => labels[id] ?? id),
    Rec.values,
    Arr.map((members) => {
      const roots = pipe(
        members,
        Arr.filter((id) => !Arr.contains(needed, id)),
        Arr.flatMap(directoryOf),
      );
      return {
        name: pipe(roots, Arr.map(nameOf), Arr.join("+")),
        filters: pipe(
          roots,
          Arr.map((directory) => `--filter=./${directory}`),
          Arr.join(" "),
        ),
        directories: pipe(members, Arr.flatMap(directoryOf)),
      };
    }),
  );
};

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

const SHARED: readonly ((file: string) => boolean)[] = [
  (file) => file === ".github/workflows/deploy.yml",
  Str.startsWith(".github/actions/"),
  Str.startsWith("patches/"),
  (file) => !Str.includes("/")(file) && !Str.endsWith(".md")(file),
];

const isShared = (file: string): boolean =>
  pipe(
    SHARED,
    Arr.some((matches) => matches(file)),
  );

const lastDeployed = Effect.fn("lastDeployed")(
  function* lastDeployed(name: string) {
    const prefix = `${MARKER}${name}-`;
    const { actions_caches } = yield* getJson(Caches)(
      `actions/caches?ref=refs/heads/main&key=${encodeURIComponent(prefix)}&sort=created_at&direction=desc&per_page=100`,
    );
    return pipe(
      actions_caches,
      Arr.map(({ key }) => Str.slice(prefix.length)(key)),
      Arr.findFirst((sha) => SHA.test(sha)),
    );
  },
  Effect.tapError(() => warn("The deploy markers could not be read, so every stack deploys")),
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

const touches =
  (directories: readonly string[]) =>
  (file: string): boolean =>
    isShared(file) ||
    pipe(
      directories,
      Arr.some((directory) => Str.startsWith(`${directory}/`)(file)),
    );

const isChanged = Effect.fn("isChanged")(function* isChanged(packages: Packages, stack: Stack) {
  const last = yield* lastDeployed(stack.name);
  const files = yield* pipe(
    last,
    Option.match({
      onNone: () => Effect.succeedNone,
      onSome: changedSince,
    }),
  );
  const touched = touches(
    pipe(
      closureOf(packages, stack.directories),
      Arr.filter((directory) => directory !== ROOT),
    ),
  );
  return pipe(
    files,
    Option.match({
      onNone: () => true,
      onSome: (changed: readonly string[]) => pipe(changed, Arr.some(touched)),
    }),
  );
});

runMain("deploy-stacks")(
  Effect.gen(function* deployStacks() {
    const plan = yield* outputOf({
      command: "vp",
      args: ["run", "--dry-run", "--json", "-r", TASK],
    }).pipe(Effect.flatMap(Schema.decodeEffect(Plan)));
    const { packages } = yield* outputOf({ command: "vp", args: ["run", "--json"] }).pipe(
      Effect.flatMap(Schema.decodeEffect(Workspace)),
    );
    const changed = yield* Effect.filter(stacksOf(plan.plan), (stack) =>
      isChanged(packages, stack),
    );
    const stacks = yield* Schema.encodeEffect(Stacks)(
      pipe(
        changed,
        Arr.map(({ name, filters }) => ({ name, filters })),
      ),
    );
    yield* writeOutputs({ stacks });
  }),
);
