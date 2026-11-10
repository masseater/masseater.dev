import { Effect, FileSystem, Path, Array as Arr, Record as Rec, pipe } from "effect";
import type { Scope } from "effect";
import { encode as encodeHex } from "effect/encoding/Hex";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import { zip } from "fflate";

type FixtureServices =
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
      Effect.forEach(([file, source]) => {
        const target = path.join(root, file);
        return fs
          .makeDirectory(path.dirname(target), { recursive: true })
          .pipe(Effect.andThen(fs.writeFileString(target, source)));
      }),
      Effect.orDie,
    );
  });

const directoryWith = (
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

const commitEmpty = (
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
  });

const runGit = (
  root: string,
  args: readonly string[],
): Effect.Effect<void, never, ChildProcessSpawner.ChildProcessSpawner> =>
  Effect.gen(function* git() {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    yield* spawner.exitCode(ChildProcess.make("git", args, { cwd: root })).pipe(Effect.orDie);
  });

const lines = (...rows: readonly string[]): string => `${Arr.join(rows, "\n")}\n`;

const zipArchive = (files: Readonly<Record<string, string>>): Effect.Effect<Uint8Array> =>
  Effect.callback<Uint8Array>((resume) => {
    const encoder = new TextEncoder();
    const entries = pipe(
      files,
      Rec.map((source) => encoder.encode(source)),
    );
    zip(entries, (_failure, zipped) => {
      resume(Effect.succeed(zipped));
    });
  });

const sha256Hex = (data: Uint8Array): Effect.Effect<string> => {
  const copy = new Uint8Array(data);
  return Effect.promise(() => crypto.subtle.digest("SHA-256", copy)).pipe(
    Effect.map((digest) => encodeHex(new Uint8Array(digest))),
  );
};

export { commitEmpty, directoryWith, lines, runGit, sha256Hex, zipArchive };
export type { FixtureServices };
