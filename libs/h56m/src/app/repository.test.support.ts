import {
  Array as Arr,
  Effect,
  FileSystem,
  Function as Fn,
  Path,
  Record as Rec,
  String as Str,
} from "effect";
import type { PlatformError, Scope } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

const DATA_FIRST_ARITY = 2;

/** @internal */
export const TOKEN = Arr.join(["ghp", "4Fq8sLm2Zt9Wn6Rb1Yc3Xv7Hk5Pd0Ja8Qe2T"], "_");

/** @internal */
export type RepositoryServices =
  | ChildProcessSpawner.ChildProcessSpawner
  | FileSystem.FileSystem
  | Path.Path;

/** @internal */
export type Files = Readonly<Record<string, string>>;
/** @internal */
export type Repository<Success> = Effect.Effect<
  Success,
  PlatformError.PlatformError,
  RepositoryServices
>;

const IDENTITY = [
  "-c",
  "user.name=h56m",
  "-c",
  "user.email=h56m@example.invalid",
  "-c",
  "commit.gpgsign=false",
];

const gitIn = (root: string, args: readonly string[]): Repository<string> =>
  Effect.gen(function* run() {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const output = yield* spawner.string(
      ChildProcess.make("git", [...IDENTITY, ...args], { cwd: root, stdin: "ignore" }),
    );
    return Str.trim(output);
  });

const writeIn = (root: string, files: Files): Repository<void> =>
  Effect.gen(function* writeAll() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    yield* Effect.forEach(
      Rec.toEntries(files),
      ([name, text]) => fileSystem.writeFileString(path.join(root, name), text),
      { concurrency: 1, discard: true },
    );
  });

const commitIn = (root: string, files: Files): Repository<string> =>
  writeIn(root, files).pipe(
    Effect.andThen(gitIn(root, ["add", "-A"])),
    Effect.andThen(gitIn(root, ["commit", "-q", "-m", "change"])),
    Effect.andThen(gitIn(root, ["rev-parse", "HEAD"])),
  );

/** @internal */
export const git: {
  (args: readonly string[]): (root: string) => Repository<string>;
  (root: string, args: readonly string[]): Repository<string>;
} = Fn.dual(DATA_FIRST_ARITY, gitIn);

/** @internal */
export const write: {
  (files: Files): (root: string) => Repository<void>;
  (root: string, files: Files): Repository<void>;
} = Fn.dual(DATA_FIRST_ARITY, writeIn);

/** @internal */
export const commit: {
  (files: Files): (root: string) => Repository<string>;
  (root: string, files: Files): Repository<string>;
} = Fn.dual(DATA_FIRST_ARITY, commitIn);

/** @internal */
export const emptyRepository: Effect.Effect<
  string,
  PlatformError.PlatformError,
  RepositoryServices | Scope.Scope
> = Effect.gen(function* emptyRepository() {
  const fileSystem = yield* FileSystem.FileSystem;
  const root = yield* fileSystem.makeTempDirectoryScoped({ prefix: "h56m-" });
  yield* gitIn(root, ["init", "-q", "-b", "main"]);
  return root;
});
