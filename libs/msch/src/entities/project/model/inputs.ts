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
}

const SEPARATOR = "/";

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
    !Str.includes(SEPARATOR)(file) ||
    pipe(
      prefixes,
      Arr.some((prefix) => Str.startsWith(prefix)(file)),
    );

const prefixesOf = Effect.fn("prefixesOf")(function* prefixesOf(root: string, configPath: string) {
  const files = yield* RepositoryFiles;
  const directory = yield* packageDirectoryOf(root)(files.dirname(configPath));
  const directories = yield* workspaceClosure(directory);
  return pipe(
    directories,
    Arr.map((found) => `${files.relative(root, found)}${SEPARATOR}`),
  );
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
      const prefixes = yield* prefixesOf(root, configPath);
      const options = yield* encodeOptions(parsed.value.options).pipe(
        Effect.orElseSucceed(() => ""),
      );
      const sources = pipe(
        parsed.value.fileNames,
        Arr.map((fileName) => files.relative(root, fileName)),
      );
      const shared = pipe(listed, Arr.filter(isUnder(prefixes)));
      return Option.some({
        options,
        files: Arr.sort(Arr.dedupe([...sources, ...shared]), Order.String),
      });
    });
