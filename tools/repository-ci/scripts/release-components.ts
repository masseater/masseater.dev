#!/usr/bin/env node
import { getJson, outputOf, warn, writeOutputs } from "@masseater.dev/github-workflow";
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

import { closure, isChanged, nameOf, workspace } from "./changes.ts";
import type { Tasks } from "./changes.ts";
import { released } from "./deployment.ts";

const WORKFLOWS = [".github/workflows/release.yml", ".github/workflows/release-component.yml"];
const BUILD = "release:";
const CHECK = "release:check:";
const PUBLISH = "release:publish";
const CONFIG = "release-please-config.json";
const MANIFEST = ".release-please-manifest.json";
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

const Manifest = Schema.fromJsonString(Schema.Record(Schema.String, Schema.String));

const PublishedRelease = Schema.Struct({ assets: Schema.Array(Schema.Unknown) });

type Release = Readonly<{ component: string; version: string }>;

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
  build: Schema.Boolean,
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

const releaseOf = Effect.fn("releaseOf")(function* releaseOf(root: string, directory: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const config = path.join(root, directory, CONFIG);
  const exists = yield* fileSystem.exists(config);
  if (!exists) {
    return Option.none<Release>();
  }
  const { packages } = yield* fileSystem
    .readFileString(config)
    .pipe(Effect.flatMap(Schema.decodeEffect(ReleaseConfig)));
  const manifest = yield* fileSystem
    .readFileString(path.join(root, directory, MANIFEST))
    .pipe(Effect.flatMap(Schema.decodeEffect(Manifest)));
  return Option.all({
    component: pipe(
      Rec.get(packages, directory),
      Option.map(({ component }) => component),
    ),
    version: Rec.get(manifest, directory),
  });
});

const environmentOf = (release: Option.Option<Release>): string =>
  pipe(
    release,
    Option.map(({ component }) => `${component}-release`),
    Option.getOrElse(() => NO_ENVIRONMENT),
  );

const unpublished = Effect.fn("unpublished")(function* unpublished(
  release: Option.Option<Release>,
) {
  if (Option.isNone(release)) {
    return false;
  }
  const { component, version } = release.value;
  return yield* getJson(PublishedRelease)(`releases/tags/${component}-v${version}`).pipe(
    Effect.map(({ assets }) => !Arr.isArrayNonEmpty(assets)),
    Effect.tapError(() => warn(`${component} v${version} has no release yet, so it is built`)),
    Effect.orElseSucceed(() => true),
  );
});

const builtWhen = Effect.fn("builtWhen")(function* builtWhen({
  publish,
  changed,
  release,
}: Readonly<{ publish: boolean; changed: boolean; release: Option.Option<Release> }>) {
  if (publish) {
    return yield* unpublished(release);
  }
  return changed;
});

const idsOf = (names: readonly string[], directory: string): readonly string[] =>
  pipe(
    names,
    Arr.filter(Str.startsWith(BUILD)),
    Arr.map((name) => `${directory}#${name}`),
  );

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
          const name = nameOf(directory);
          const changed = yield* isChanged(
            { packages, record: released, workflows: WORKFLOWS, extra },
            { name, directories: reachedFrom(tasks, idsOf(names, directory)) },
          );
          const release = yield* releaseOf(workspaceRoot, directory);
          const publish = Arr.contains(names, PUBLISH);
          const build = yield* builtWhen({ publish, changed, release });
          return pipe(
            { name, directory, environment: environmentOf(release), builds },
            (base) => ({ ...base, checks: platformsWith(names, CHECK), publish, build }),
            Option.liftPredicate(() => changed || build),
          );
        }),
      ),
    );
    const components = yield* Schema.encodeEffect(Components)(Arr.getSomes(found));
    yield* writeOutputs({ components });
  }),
);
