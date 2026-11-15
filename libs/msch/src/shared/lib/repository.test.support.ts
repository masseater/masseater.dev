import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { Context, Effect, FileSystem, Layer, Path, Record as Rec } from "effect";
import type { Scope } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { RepositoryFiles, nodeRepositoryFiles } from "./repository-files.ts";

export class FixtureFiles extends Context.Service<
  FixtureFiles,
  {
    readonly makeTempDirectory: Effect.Effect<string, never, Scope.Scope>;
    readonly writeFile: (file: string, source: string) => Effect.Effect<void>;
    readonly symlink: (target: string, link: string) => Effect.Effect<void>;
    readonly commitAll: (root: string) => Effect.Effect<void>;
  }
>()("@r_masseater/msch/shared/lib/repository.test.support/FixtureFiles") {}

const fixtureFiles = Layer.effect(
  FixtureFiles,
  Effect.gen(function* fixtureFiles() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const git = (root: string, args: readonly string[]): Effect.Effect<void> =>
      Effect.gen(function* runGit() {
        const handle = yield* ChildProcess.make("git", args, { cwd: root, stdin: "ignore" });
        yield* handle.exitCode;
      }).pipe(
        Effect.scoped,
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Effect.orDie,
      );
    const makeParent = (file: string): Effect.Effect<void> =>
      fs.makeDirectory(path.dirname(file), { recursive: true }).pipe(Effect.orDie);
    return FixtureFiles.of({
      makeTempDirectory: fs.makeTempDirectoryScoped({ prefix: "msch-" }).pipe(Effect.orDie),
      writeFile: (file, source) =>
        makeParent(file).pipe(Effect.andThen(fs.writeFileString(file, source)), Effect.orDie),
      symlink: (target, link) =>
        makeParent(link).pipe(Effect.andThen(fs.symlink(target, link)), Effect.orDie),
      commitAll: (root) => git(root, ["init", "-q"]).pipe(Effect.andThen(git(root, ["add", "-A"]))),
    });
  }),
);

export const fixtureLayer = fixtureFiles.pipe(
  Layer.provideMerge(nodeRepositoryFiles),
  Layer.provide(nodeServicesLayer),
);

export const directoryWith = Effect.fn("directoryWith")(function* directoryWith(
  files: Readonly<Record<string, string>>,
) {
  const fixtures = yield* FixtureFiles;
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* fixtures.makeTempDirectory;
  yield* Effect.forEach(
    Rec.toEntries(files),
    ([fileName, source]) => fixtures.writeFile(repositoryFiles.join(root, fileName), source),
    { discard: true },
  );
  return root;
});

export const gitRepositoryWith = Effect.fn("gitRepositoryWith")(function* gitRepositoryWith(
  files: Readonly<Record<string, string>>,
) {
  const fixtures = yield* FixtureFiles;
  const root = yield* directoryWith(files);
  yield* fixtures.commitAll(root);
  return root;
});
