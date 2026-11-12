import {
  Array as Arr,
  Context,
  Effect,
  FileSystem,
  Layer,
  Path,
  Stream,
  String as Str,
  pipe,
} from "effect";
import type { Option } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { nodeServicesLayer } from "./node-services.ts";

const MISSING_SIZE = 0;
const GENERATED_PATHSPEC = ":(attr:linguist-generated)";
const LISTED_ARGS = ["--cached", "--others", "--exclude-standard"];

class RepositoryFiles extends Context.Service<
  RepositoryFiles,
  {
    readonly readFile: (file: string) => Effect.Effect<Option.Option<string>>;
    readonly exists: (file: string) => Effect.Effect<boolean>;
    readonly realPath: (file: string) => Effect.Effect<string>;
    readonly readDirectory: (directory: string) => Effect.Effect<readonly string[]>;
    readonly generatedFiles: (root: string) => Effect.Effect<readonly string[]>;
    readonly listedFiles: (root: string) => Effect.Effect<readonly string[]>;
    readonly isDirectory: (file: string) => Effect.Effect<Option.Option<boolean>>;
    readonly fileSize: (file: string) => Effect.Effect<number>;
    readonly join: (...segments: readonly string[]) => string;
    readonly resolve: (...segments: readonly string[]) => string;
    readonly relative: (from: string, to: string) => string;
    readonly dirname: (file: string) => string;
    readonly basename: (file: string) => string;
  }
>()("@r_masseater/msch/repository-files/RepositoryFiles") {}

const nodeRepositoryFiles = Layer.effect(
  RepositoryFiles,
  Effect.gen(function* nodeRepositoryFiles() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const gitFiles = (root: string, args: readonly string[]): Effect.Effect<readonly string[]> =>
      Effect.gen(function* listFiles() {
        const handle = yield* ChildProcess.make("git", ["ls-files", "-z", ...args], {
          cwd: root,
          stdin: "ignore",
        });
        const listed = yield* handle.stdout.pipe(Stream.decodeText(), Stream.mkString);
        return pipe(Str.split(listed, "\0"), Arr.filter(Str.isNonEmpty));
      }).pipe(
        Effect.scoped,
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Effect.orElseSucceed((): readonly string[] => []),
      );
    return RepositoryFiles.of({
      generatedFiles: (root) =>
        gitFiles(root, ["--", GENERATED_PATHSPEC]).pipe(
          Effect.map(Arr.map((file) => path.join(root, file))),
        ),
      listedFiles: (root) => gitFiles(root, LISTED_ARGS),
      readFile: (file) => fs.readFileString(file).pipe(Effect.option),
      exists: (file) => fs.exists(file).pipe(Effect.orElseSucceed(() => false)),
      realPath: (file) => fs.realPath(file).pipe(Effect.orElseSucceed(() => file)),
      readDirectory: (directory) =>
        fs.readDirectory(directory).pipe(Effect.orElseSucceed((): readonly string[] => [])),
      isDirectory: (file) =>
        fs.stat(file).pipe(
          Effect.map((info) => info.type === "Directory"),
          Effect.option,
        ),
      fileSize: (file) =>
        fs.stat(file).pipe(
          Effect.map((info) => Number(info.size)),
          Effect.orElseSucceed(() => MISSING_SIZE),
        ),
      join: (...segments) => path.join(...segments),
      resolve: (...segments) => path.resolve(...segments),
      relative: (from, to) => path.relative(from, to),
      dirname: (file) => path.dirname(file),
      basename: (file) => path.basename(file),
    });
  }),
).pipe(Layer.provide(nodeServicesLayer));

export { RepositoryFiles, nodeRepositoryFiles };
