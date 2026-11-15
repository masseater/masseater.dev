import { Array as Arr, Effect, Option, Order, Schema, String as Str, pipe } from "effect";

import {
  MANIFEST_FILE,
  readManifest,
  workspaceDependencies,
} from "#/entities/package/@x/project.ts";
import { NODE_MODULES, RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { packageDirectoryOf, parseConfig } from "./project.ts";
import type { Workspace } from "./project.ts";

export interface ProjectInputs {
  readonly options: string;
  readonly files: readonly string[];
  readonly dependencies: readonly string[];
}

const SEPARATOR = "/";
const SCOPE_PREFIX = "@";
const HIDDEN_PREFIX = ".";

const encodeOptions = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

export const nearestManifestDirectory = Effect.fn("nearestManifestDirectory")(
  function* nearestManifestDirectory(start: string) {
    const files = yield* RepositoryFiles;
    let directory = start;
    let parent = files.dirname(directory);
    while (parent !== directory && !(yield* files.exists(files.join(directory, MANIFEST_FILE)))) {
      directory = parent;
      parent = files.dirname(directory);
    }
    return directory;
  },
);

const dependenciesOf = Effect.fn("dependenciesOf")(function* dependenciesOf(directory: string) {
  const files = yield* RepositoryFiles;
  const manifest = yield* readManifest(directory);
  const names = Option.match(manifest, {
    onNone: (): readonly string[] => [],
    onSome: workspaceDependencies,
  });
  return yield* pipe(
    names,
    Effect.forEach((name) => files.realPath(files.join(directory, NODE_MODULES, name))),
  );
});

const workspaceClosure = Effect.fn("workspaceClosure")(function* workspaceClosure(start: string) {
  const seen = new Set([start]);
  const queue = [start];
  for (const directory of queue) {
    const next = yield* dependenciesOf(directory);
    for (const dependency of next) {
      if (!seen.has(dependency)) {
        seen.add(dependency);
        queue.push(dependency);
      }
    }
  }
  return [...seen];
});

const isUnder =
  (prefixes: readonly string[]) =>
  (file: string): boolean =>
    pipe(
      prefixes,
      Arr.some((prefix) => Str.startsWith(prefix)(file)),
    );

const closureOf = Effect.fn("closureOf")(function* closureOf(root: string, configPath: string) {
  const files = yield* RepositoryFiles;
  const directory = yield* packageDirectoryOf(root)(files.dirname(configPath));
  const directories = yield* workspaceClosure(directory);
  const prefixes = pipe(
    directories,
    Arr.map((found) => `${files.relative(root, found)}${SEPARATOR}`),
  );
  return { directories, prefixes };
});

const scopedNames =
  (modules: string) =>
  (name: string): Effect.Effect<readonly string[], never, RepositoryFiles> =>
    Effect.gen(function* listScope() {
      const files = yield* RepositoryFiles;
      if (!Str.startsWith(SCOPE_PREFIX)(name)) {
        return [name];
      }
      const scoped = yield* files.readDirectory(files.join(modules, name));
      return pipe(
        scoped,
        Arr.map((entry) => `${name}${SEPARATOR}${entry}`),
      );
    });

const installedNames = Effect.fn("installedNames")(function* installedNames(modules: string) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.readDirectory(modules);
  const nested = yield* pipe(
    listed,
    Arr.filter((name) => !Str.startsWith(HIDDEN_PREFIX)(name)),
    Effect.forEach(scopedNames(modules)),
  );
  return Arr.flatten(nested);
});

const installedPackages = Effect.fn("installedPackages")(function* installedPackages(
  root: string,
  directory: string,
) {
  const files = yield* RepositoryFiles;
  const modules = files.join(directory, NODE_MODULES);
  const names = yield* installedNames(modules);
  return yield* pipe(
    names,
    Effect.forEach((name) =>
      files
        .realPath(files.join(modules, name))
        .pipe(Effect.map((found) => files.relative(root, found))),
    ),
  );
});

const dependencyVersions = Effect.fn("dependencyVersions")(function* dependencyVersions(
  root: string,
  directories: readonly string[],
) {
  const installed = yield* pipe(
    Arr.dedupe([root, ...directories]),
    Effect.forEach((directory) => installedPackages(root, directory)),
  );
  return Arr.sort(Arr.dedupe(Arr.flatten(installed)), Order.String);
});

export interface InputScope {
  readonly workspace: Workspace;
  readonly listed: readonly string[];
}

export const projectInputs =
  ({ workspace: { compiler, root }, listed }: InputScope) =>
  (configPath: string): Effect.Effect<Option.Option<ProjectInputs>, never, RepositoryFiles> =>
    Effect.gen(function* collectInputs() {
      const files = yield* RepositoryFiles;
      const parsed = parseConfig(compiler.api)(configPath);
      if (Option.isNone(parsed)) {
        return Option.none();
      }
      const closure = yield* closureOf(root, configPath);
      const dependencies = yield* dependencyVersions(root, closure.directories);
      const options = yield* encodeOptions(parsed.value.options).pipe(
        Effect.orElseSucceed(() => ""),
      );
      const sources = pipe(
        parsed.value.fileNames,
        Arr.map((fileName) => files.relative(root, fileName)),
      );
      const shared = pipe(listed, Arr.filter(isUnder(closure.prefixes)));
      return Option.some({
        options,
        files: Arr.sort(Arr.dedupe([...sources, ...shared]), Order.String),
        dependencies,
      });
    });
