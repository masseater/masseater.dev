import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
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

const GENERATED_PATHSPEC = ":(attr:linguist-generated)";

class RepositoryFiles extends Context.Service<
  RepositoryFiles,
  {
    readonly readFile: (file: string) => Effect.Effect<Option.Option<string>>;
    readonly exists: (file: string) => Effect.Effect<boolean>;
    readonly realPath: (file: string) => Effect.Effect<string>;
    readonly readDirectory: (directory: string) => Effect.Effect<readonly string[]>;
    readonly generatedFiles: (root: string) => Effect.Effect<readonly string[]>;
    readonly isDirectory: (file: string) => Effect.Effect<Option.Option<boolean>>;
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
    const generatedFiles = (root: string): Effect.Effect<readonly string[]> =>
      Effect.gen(function* listGenerated() {
        const handle = yield* ChildProcess.make(
          "git",
          ["ls-files", "-z", "--", GENERATED_PATHSPEC],
          {
            cwd: root,
            stdin: "ignore",
          },
        );
        const listed = yield* handle.stdout.pipe(Stream.decodeText(), Stream.mkString);
        return pipe(
          Str.split(listed, "\0"),
          Arr.filter(Str.isNonEmpty),
          Arr.map((file) => path.join(root, file)),
        );
      }).pipe(
        Effect.scoped,
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Effect.orElseSucceed((): readonly string[] => []),
      );
    return RepositoryFiles.of({
      generatedFiles,
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
      join: (...segments) => path.join(...segments),
      resolve: (...segments) => path.resolve(...segments),
      relative: (from, to) => path.relative(from, to),
      dirname: (file) => path.dirname(file),
      basename: (file) => path.basename(file),
    });
  }),
).pipe(Layer.provide(nodeServicesLayer));

export { RepositoryFiles, nodeRepositoryFiles };
