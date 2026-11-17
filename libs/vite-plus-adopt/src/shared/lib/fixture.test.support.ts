import {
  Effect,
  FileSystem,
  Path,
  Array as Arr,
  Record as Rec,
  pipe,
  Function as Fn,
  Stream,
} from "effect";
import type { Scope } from "effect";
import { Tar } from "effect/encoding";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

const DATA_FIRST_ARITY = 2;

/** @internal */
export type FixtureServices =
  | ChildProcessSpawner.ChildProcessSpawner
  | FileSystem.FileSystem
  | Path.Path
  | Scope.Scope;

const writeFiles = (
  root: string,
  files: Readonly<Record<string, string>>,
): Effect.Effect<void, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* write() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    yield* pipe(
      Rec.toEntries(files),
      (items) =>
        Effect.forEach(
          items,
          ([file, source]) => {
            const target = path.join(root, file);
            return fs
              .makeDirectory(path.dirname(target), { recursive: true })
              .pipe(Effect.andThen(fs.writeFileString(target, source)));
          },
          { concurrency: 1 },
        ),
      Effect.orDie,
    );
  });

/** @internal */
export const directoryWith = (
  files: Readonly<Record<string, string>>,
): Effect.Effect<string, never, FixtureServices> =>
  Effect.gen(function* directory() {
    const fs = yield* FileSystem.FileSystem;
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const root = yield* fs
      .makeTempDirectoryScoped({ prefix: "vite-plus-adopt-" })
      .pipe(Effect.orDie);
    yield* writeFiles(root, files);
    yield* spawner
      .exitCode(ChildProcess.make("git", ["init", "-q"], { cwd: root }))
      .pipe(Effect.orDie);
    return root;
  });

/** @internal */
export const commitEmpty: {
  (
    message: string,
  ): (root: string) => Effect.Effect<void, never, ChildProcessSpawner.ChildProcessSpawner>;
  (
    root: string,
    message: string,
  ): Effect.Effect<void, never, ChildProcessSpawner.ChildProcessSpawner>;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (
    root: string,
    message: string,
  ): Effect.Effect<void, never, ChildProcessSpawner.ChildProcessSpawner> =>
    Effect.gen(function* commit() {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      yield* spawner
        .exitCode(
          ChildProcess.make(
            "git",
            [
              "-c",
              "user.name=vite-plus-adopt",
              "-c",
              "user.email=vite-plus-adopt@example.com",
              "commit",
              "-q",
              "--allow-empty",
              "-m",
              message,
            ],
            { cwd: root },
          ),
        )
        .pipe(Effect.orDie);
    }),
);

/** @internal */
export const runGit: {
  (
    args: readonly string[],
  ): (root: string) => Effect.Effect<void, never, ChildProcessSpawner.ChildProcessSpawner>;
  (
    root: string,
    args: readonly string[],
  ): Effect.Effect<void, never, ChildProcessSpawner.ChildProcessSpawner>;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (
    root: string,
    args: readonly string[],
  ): Effect.Effect<void, never, ChildProcessSpawner.ChildProcessSpawner> =>
    Effect.gen(function* git() {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      yield* spawner.exitCode(ChildProcess.make("git", args, { cwd: root })).pipe(Effect.orDie);
    }),
);

/** @internal */
export const lines = (...rows: readonly string[]): string => `${Arr.join(rows, "\n")}\n`;

/** @internal */
export const NO_FOO_RULE = lines(
  "module.exports = (context) => ({",
  "  [context.Syntax.Str](node) {",
  '    if (context.getSource(node).includes("foo")) {',
  '      context.report(node, new context.RuleError("foo is not allowed"));',
  "    }",
  "  },",
  "});",
);

/** @internal */
export const tarGzArchive = (files: Readonly<Record<string, string>>): Effect.Effect<Uint8Array> =>
  Stream.fromIterable(
    pipe(
      Rec.toEntries(files),
      Arr.map(([name, source]) => Tar.file(name, source, { mode: 0o755 })),
    ),
  ).pipe(
    Stream.pipeThroughChannel(Tar.encode()),
    Stream.mkUint8Array,
    Effect.flatMap((tar) =>
      Effect.promise(() =>
        new Response(new Blob([tar]).stream().pipeThrough(new CompressionStream("gzip"))).bytes(),
      ),
    ),
    Effect.orDie,
  );
