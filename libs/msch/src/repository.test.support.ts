import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import {
  Context,
  Effect,
  FileSystem,
  Layer,
  Path,
  Schema,
  Array as Arr,
  Record as Rec,
  pipe,
} from "effect";
import type { Scope } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { checkRepository } from "./check.ts";
import { RepositoryFiles, nodeRepositoryFiles } from "./repository-files.ts";

class FixtureFiles extends Context.Service<
  FixtureFiles,
  {
    readonly makeTempDirectory: Effect.Effect<string, never, Scope.Scope>;
    readonly writeFile: (file: string, source: string) => Effect.Effect<void>;
    readonly symlink: (target: string, link: string) => Effect.Effect<void>;
    readonly commitAll: (root: string) => Effect.Effect<void>;
  }
>()("@msch/core/repository.test.support/FixtureFiles") {}

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

const fixtureLayer = fixtureFiles.pipe(
  Layer.provideMerge(nodeRepositoryFiles),
  Layer.provide(nodeServicesLayer),
);

const stringifyUnknown = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const defaultFiles = Effect.gen(function* defaultFiles() {
  const packageJson = yield* stringifyUnknown({ name: "fixture" });
  const tsconfig = yield* stringifyUnknown({
    compilerOptions: {
      strict: true,
      module: "nodenext",
      moduleResolution: "nodenext",
      target: "esnext",
      noEmit: true,
      skipLibCheck: true,
    },
    include: ["src"],
  });
  return { "package.json": packageJson, "tsconfig.json": tsconfig };
});

const directoryWith = Effect.fn("directoryWith")(function* directoryWith(
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

const fixtureRepository = Effect.fn("fixtureRepository")(function* fixtureRepository(
  files: Readonly<Record<string, string>>,
) {
  const fixtures = yield* FixtureFiles;
  const repositoryFiles = yield* RepositoryFiles;
  const defaults = yield* defaultFiles;
  const root = yield* directoryWith({ ...defaults, ...files });
  yield* fixtures.symlink(
    repositoryFiles.resolve(import.meta.dirname, "..", "node_modules", "effect"),
    repositoryFiles.join(root, "node_modules", "effect"),
  );
  return root;
});

const findingsIn = Effect.fn("findingsIn")(function* findingsIn(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* fixtureRepository(files);
  const problems = yield* checkRepository(root);
  return pipe(
    problems,
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const findingsInGitRepository = Effect.fn("findingsInGitRepository")(
  function* findingsInGitRepository(files: Readonly<Record<string, string>>) {
    const fixtures = yield* FixtureFiles;
    const repositoryFiles = yield* RepositoryFiles;
    const root = yield* fixtureRepository(files);
    yield* fixtures.commitAll(root);
    const problems = yield* checkRepository(root);
    return pipe(
      problems,
      Arr.map(
        (problem) =>
          `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
      ),
    );
  },
);

export { directoryWith, findingsIn, findingsInGitRepository, fixtureLayer };
