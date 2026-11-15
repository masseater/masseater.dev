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
import { Digest } from "effect/crypto";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { nodeServicesLayer } from "./node-services.ts";

const MISSING_SIZE = 0;
const GENERATED_PATHSPEC = ":(attr:linguist-generated)";
const LISTED_ARGS = ["--cached", "--others", "--exclude-standard"];

export const NODE_MODULES = "node_modules";

export class RepositoryFiles extends Context.Service<
  RepositoryFiles,
  {
    readonly readFile: (file: string) => Effect.Effect<Option.Option<string>>;
    readonly exists: (file: string) => Effect.Effect<boolean>;
    readonly realPath: (file: string) => Effect.Effect<string>;
    readonly readDirectory: (directory: string) => Effect.Effect<readonly string[]>;
    readonly walkDirectory: (directory: string) => Effect.Effect<readonly string[]>;
    readonly writeFile: (file: string, text: string) => Effect.Effect<void>;
    readonly removeFile: (file: string) => Effect.Effect<void>;
    readonly hash: (text: string) => Effect.Effect<string>;
    readonly generatedFiles: (root: string) => Effect.Effect<readonly string[]>;
    readonly listedFiles: (root: string) => Effect.Effect<readonly string[]>;
    readonly matchingFiles: (
      root: string,
      pathspecs: readonly string[],
    ) => Effect.Effect<readonly string[]>;
    readonly ignoredPaths: (
      root: string,
      paths: readonly string[],
    ) => Effect.Effect<readonly string[]>;
    readonly isDirectory: (file: string) => Effect.Effect<Option.Option<boolean>>;
    readonly fileSize: (file: string) => Effect.Effect<number>;
    readonly join: (...segments: readonly string[]) => string;
    readonly resolve: (...segments: readonly string[]) => string;
    readonly relative: (from: string, to: string) => string;
    readonly dirname: (file: string) => string;
    readonly basename: (file: string) => string;
  }
>()("@r_masseater/msch/shared/lib/repository-files/RepositoryFiles") {}

type GitPaths = (
  root: string,
  args: readonly string[],
  separator: string,
) => Effect.Effect<readonly string[]>;

const gitPathsService = Effect.gen(function* gitPathsService() {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const gitPaths: GitPaths = (root, args, separator) =>
    Effect.gen(function* listPaths() {
      const handle = yield* ChildProcess.make("git", args, {
        cwd: root,
        stdin: "ignore",
      });
      const listed = yield* handle.stdout.pipe(Stream.decodeText(), Stream.mkString);
      return pipe(Str.split(listed, separator), Arr.filter(Str.isNonEmpty));
    }).pipe(
      Effect.scoped,
      Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
      Effect.orElseSucceed((): readonly string[] => []),
    );
  return gitPaths;
});

type CacheOperations = Pick<
  typeof RepositoryFiles.Service,
  "walkDirectory" | "writeFile" | "removeFile" | "hash"
>;

const encoder = new TextEncoder();

const cacheOperations = (
  fs: FileSystem.FileSystem,
  path: Path.Path,
  digest: Digest.Digest["Service"],
): CacheOperations => ({
  walkDirectory: (directory) =>
    fs
      .readDirectory(directory, { recursive: true })
      .pipe(Effect.orElseSucceed((): readonly string[] => [])),
  writeFile: (file, text) =>
    fs
      .makeDirectory(path.dirname(file), { recursive: true })
      .pipe(Effect.andThen(fs.writeFileString(file, text)), Effect.ignore),
  removeFile: (file) => fs.remove(file, { force: true }).pipe(Effect.ignore),
  hash: (text) => digest.digestHex(Digest.sha256, encoder.encode(text)),
});

export const nodeRepositoryFiles = Layer.effect(
  RepositoryFiles,
  Effect.gen(function* nodeRepositoryFiles() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const digest = yield* Digest.Digest;
    const gitPaths = yield* gitPathsService;
    const gitFiles = (root: string, args: readonly string[]): Effect.Effect<readonly string[]> =>
      gitPaths(root, ["ls-files", "-z", ...args], "\0");
    return RepositoryFiles.of({
      generatedFiles: (root) =>
        gitFiles(root, ["--", GENERATED_PATHSPEC]).pipe(
          Effect.map(Arr.map((file) => path.join(root, file))),
        ),
      listedFiles: (root) => gitFiles(root, LISTED_ARGS),
      matchingFiles: (root, pathspecs) => gitFiles(root, [...LISTED_ARGS, "--", ...pathspecs]),
      ignoredPaths: (root, paths) => gitPaths(root, ["check-ignore", "--", ...paths], "\n"),
      readFile: (file) => fs.readFileString(file).pipe(Effect.option),
      exists: (file) => fs.exists(file).pipe(Effect.orElseSucceed(() => false)),
      realPath: (file) => fs.realPath(file).pipe(Effect.orElseSucceed(() => file)),
      readDirectory: (directory) =>
        fs.readDirectory(directory).pipe(Effect.orElseSucceed((): readonly string[] => [])),
      ...cacheOperations(fs, path, digest),
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
).pipe(Layer.provide(nodeServicesLayer), Layer.provide(Digest.layerWebCrypto));
