#!/usr/bin/env node
import { outputOf, writeOutputs } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Option,
  Order,
  Path,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";

import { closure, isChanged, nameOf, workspace } from "./lib/changes.ts";
import type { Tasks } from "./lib/changes.ts";

const MARKER = "released-";
const WORKFLOWS = [".github/workflows/release.yml", ".github/workflows/release-component.yml"];
const BUILD = "release:";
const CHECK = "release:check:";
const PUBLISH = "release:publish";
const CONFIG = "release-please-config.json";
const NO_ENVIRONMENT = "release";

const RUNNERS = {
  linux: "ubuntu-latest",
  windows: "windows-latest",
  macos: "macos-latest",
} as const satisfies Readonly<Record<string, string>>;

type Os = keyof typeof RUNNERS;

const SYSTEMS = Rec.keys(RUNNERS);

const ReleasePackage = Schema.Struct({ component: Schema.String });

const ReleaseConfig = Schema.fromJsonString(
  Schema.Struct({ packages: Schema.Record(Schema.String, ReleasePackage) }),
);

const Platform = Schema.Struct({ os: Schema.String, runner: Schema.String });

const CargoDependency = Schema.Struct({ path: Schema.optionalKey(Schema.String) });

const CargoPackage = Schema.Struct({
  manifest_path: Schema.String,
  dependencies: Schema.Array(CargoDependency),
});

const CargoMetadata = Schema.fromJsonString(
  Schema.Struct({ workspace_root: Schema.String, packages: Schema.Array(CargoPackage) }),
);

const Component = Schema.Struct({
  name: Schema.String,
  directory: Schema.String,
  environment: Schema.String,
  builds: Schema.Array(Platform),
  checks: Schema.Array(Platform),
  publish: Schema.Boolean,
});

const Components = Schema.fromJsonString(Schema.Array(Component));

const tasksOf = (tasks: Tasks, directory: string): readonly string[] =>
  pipe(
    Rec.values(tasks),
    Arr.filter((task) => task.package === directory),
    Arr.map(({ name }) => name),
  );

const platformsWith = (
  names: readonly string[],
  prefix: string,
): readonly (typeof Platform.Type)[] =>
  pipe(
    SYSTEMS,
    Arr.filter((os: Os) => Arr.contains(names, `${prefix}${os}`)),
    Arr.map((os: Os) => ({ os, runner: RUNNERS[os] })),
  );

const dependenciesOf =
  (tasks: Tasks) =>
  (id: string): readonly string[] =>
    pipe(
      Option.fromNullishOr(tasks[id]),
      Option.flatMap(({ dependsOn }) => Option.fromUndefinedOr(dependsOn)),
      Option.getOrElse((): readonly string[] => []),
    );

const reachedFrom = (tasks: Tasks, start: readonly string[]): readonly string[] =>
  pipe(
    start,
    closure(dependenciesOf(tasks)),
    Arr.flatMap((id) =>
      pipe(
        Option.fromNullishOr(tasks[id]),
        Option.map(({ package: directory }) => directory),
        Option.toArray,
      ),
    ),
    Arr.dedupe,
  );

const ownerIn =
  (directories: readonly string[]) =>
  (relative: string): Option.Option<string> =>
    pipe(
      directories,
      Arr.filter((directory) => Str.startsWith(`${directory}/`)(`${relative}/`)),
      Arr.sortWith((directory: string) => directory.length, Order.flip(Order.Number)),
      Arr.head,
    );

const cargoEdges = Effect.fn("cargoEdges")(function* cargoEdges(directories: readonly string[]) {
  const path = yield* Path.Path;
  const metadata = yield* outputOf({
    command: "cargo",
    args: ["metadata", "--format-version", "1", "--no-deps"],
  }).pipe(Effect.flatMap(Schema.decodeEffect(CargoMetadata)));
  const owner = (file: string): Option.Option<string> =>
    ownerIn(directories)(path.relative(metadata.workspace_root, file));
  return pipe(
    metadata.packages,
    Arr.flatMap(({ manifest_path, dependencies }) => {
      const from = owner(path.dirname(manifest_path));
      return pipe(
        dependencies,
        Arr.flatMap(({ path: to }) =>
          Option.toArray(Option.flatMap(Option.fromUndefinedOr(to), owner)),
        ),
        Arr.flatMap((to) =>
          pipe(
            from,
            Option.map((source) => [source, to] as const),
            Option.toArray,
          ),
        ),
        Arr.filter(([source, to]) => source !== to),
      );
    }),
  );
});

const environmentOf = Effect.fn("environmentOf")(function* environmentOf(
  root: string,
  directory: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const file = path.join(root, directory, CONFIG);
  const exists = yield* fileSystem.exists(file);
  if (!exists) {
    return NO_ENVIRONMENT;
  }
  const config = yield* fileSystem
    .readFileString(file)
    .pipe(Effect.flatMap(Schema.decodeEffect(ReleaseConfig)));
  return pipe(
    Rec.get(config.packages, directory),
    Option.map(({ component }) => `${component}-release`),
    Option.getOrElse(() => NO_ENVIRONMENT),
  );
});

runMain("release-components")(
  Effect.gen(function* releaseComponents() {
    const { workspaceRoot, packages, tasks } = yield* workspace;
    const edges = yield* cargoEdges(Rec.keys(packages));
    const extra = (directory: string): readonly string[] =>
      pipe(
        edges,
        Arr.filter(([from]) => from === directory),
        Arr.map(([, to]) => to),
      );
    const directories = pipe(
      Rec.values(tasks),
      Arr.filter(
        ({ name }) =>
          Str.startsWith(BUILD)(name) && Arr.contains(SYSTEMS, Str.slice(BUILD.length)(name)),
      ),
      Arr.map(({ package: directory }) => directory),
      Arr.dedupe,
    );
    const found = yield* pipe(
      directories,
      Effect.forEach((directory) =>
        Effect.gen(function* component() {
          const names = tasksOf(tasks, directory);
          const builds = platformsWith(names, BUILD);
          const ids = pipe(
            names,
            Arr.filter(Str.startsWith(BUILD)),
            Arr.map((name) => `${directory}#${name}`),
          );
          const name = nameOf(directory);
          const changed = yield* isChanged(
            { packages, marker: MARKER, workflows: WORKFLOWS, extra },
            { name, directories: reachedFrom(tasks, ids) },
          );
          const environment = yield* environmentOf(workspaceRoot, directory);
          return pipe(
            { name, directory, environment, builds, checks: platformsWith(names, CHECK) },
            (base) => ({ ...base, publish: Arr.contains(names, PUBLISH) }),
            Option.liftPredicate(() => changed),
          );
        }),
      ),
    );
    const components = yield* Schema.encodeEffect(Components)(Arr.getSomes(found));
    yield* writeOutputs({ components });
  }),
);
