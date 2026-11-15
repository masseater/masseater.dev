#!/usr/bin/env node
import { writeOutputs } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Option,
  Path,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";

import { isChanged, nameOf, workspace } from "./changes.ts";
import type { Tasks } from "./changes.ts";

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

const ReleaseConfig = Schema.fromJsonString(
  Schema.Struct({
    packages: Schema.Record(Schema.String, Schema.Struct({ component: Schema.String })),
  }),
);

const Platform = Schema.Struct({ os: Schema.String, runner: Schema.String });

const Components = Schema.fromJsonString(
  Schema.Array(
    Schema.Struct({
      name: Schema.String,
      directory: Schema.String,
      environment: Schema.String,
      builds: Schema.Array(Platform),
      checks: Schema.Array(Platform),
      publish: Schema.Boolean,
    }),
  ),
);

const tasksOf = (tasks: Tasks, directory: string): readonly string[] =>
  pipe(
    Rec.values(tasks),
    Arr.filter((task) => task.package === directory),
    Arr.map(({ name }) => name),
  );

const platformsWith = (names: readonly string[], prefix: string): readonly typeof Platform.Type[] =>
  pipe(
    SYSTEMS,
    Arr.filter((os: Os) => Arr.contains(names, `${prefix}${os}`)),
    Arr.map((os: Os) => ({ os, runner: RUNNERS[os] })),
  );

const reachedFrom = (tasks: Tasks, start: readonly string[]): readonly string[] => {
  const seen = new Set(start);
  const queue = [...start];
  for (const id of queue) {
    for (const next of tasks[id]?.dependsOn ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return pipe(
    [...seen],
    Arr.flatMap((id) =>
      pipe(
        Option.fromNullishOr(tasks[id]),
        Option.map(({ package: directory }) => directory),
        Option.toArray,
      ),
    ),
    Arr.dedupe,
  );
};

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
  const config = yield* fileSystem.readFileString(file).pipe(
    Effect.flatMap(Schema.decodeEffect(ReleaseConfig)),
  );
  return pipe(
    Rec.get(config.packages, directory),
    Option.map(({ component }) => `${component}-release`),
    Option.getOrElse(() => NO_ENVIRONMENT),
  );
});

runMain("release-components")(
  Effect.gen(function* releaseComponents() {
    const { workspaceRoot, packages, tasks } = yield* workspace;
    const directories = pipe(
      Rec.values(tasks),
      Arr.filter(
        ({ name }) =>
          Str.startsWith(BUILD)(name) && Arr.contains(SYSTEMS, Str.slice(BUILD.length)(name)),
      ),
      Arr.map(({ package: directory }) => directory),
      Arr.dedupe,
    );
    const found = yield* Effect.forEach(directories, (directory) =>
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
          { packages, marker: MARKER, workflows: WORKFLOWS },
          { name, directories: reachedFrom(tasks, ids) },
        );
        const environment = yield* environmentOf(workspaceRoot, directory);
        return pipe(
          { name, directory, environment, builds, checks: platformsWith(names, CHECK) },
          (base) => ({ ...base, publish: Arr.contains(names, PUBLISH) }),
          Option.liftPredicate(() => changed),
        );
      }),
    );
    const components = yield* Schema.encodeEffect(Components)(Arr.getSomes(found));
    yield* writeOutputs({ components });
  }),
);
