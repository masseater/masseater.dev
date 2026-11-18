import { Array as Arr, Effect, FileSystem, Option, Path, String as Str, pipe } from "effect";

import { run } from "#/shared/lib/command.ts";

import { download } from "./download.ts";
import { REDIST, archiveOf, manifestOf } from "./manifest.ts";
import type { ArchiveEntry, CudaManifest } from "./manifest.ts";
import type { Platform } from "./platform.ts";

const COMPONENTS = [
  "cuda_nvcc",
  "cuda_crt",
  "cccl",
  "libnvvm",
  "cuda_cudart",
  "libcublas",
  "libcurand",
  "cuda_nvrtc",
];

const RUNTIME_PREFIXES = ["cublas", "curand", "nvrtc"];

const ONE_AT_A_TIME = { concurrency: 1, discard: true } as const;

/** @internal */
export interface Cache {
  readonly platform: Platform;
  readonly directory: string;
}

const unpack = Effect.fn("cuda.unpack")(function* unpack(
  { platform, directory }: Cache,
  archive: ArchiveEntry,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const toolkit = path.join(directory, "toolkit");
  const file = path.join(directory, path.basename(archive.relative_path));
  yield* fileSystem.makeDirectory(toolkit, { recursive: true });
  yield* download({ url: `${REDIST}/${archive.relative_path}`, file, sha256: archive.sha256 });
  yield* run({ file: platform.tar, args: ["-xf", file, "-C", toolkit, "--strip-components=1"] });
  yield* fileSystem.remove(file);
});

const extracted = Effect.fn("cuda.extract")(function* extracted(
  cache: Cache,
  manifest: CudaManifest,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* Effect.forEach(
    COMPONENTS,
    (name) =>
      Effect.gen(function* component() {
        const archive = yield* archiveOf({ manifest, name, platform: cache.platform.key });
        const marker = path.join(cache.directory, "toolkit", `.${archive.sha256}`);
        if (yield* fileSystem.exists(marker)) {
          return;
        }
        yield* unpack(cache, archive);
        yield* fileSystem.writeFileString(marker, name);
      }),
    ONE_AT_A_TIME,
  );
});

/** @internal */
export const toolkitOf = Effect.fn("cuda.toolkit")(function* toolkitOf(
  cache: Cache,
  version: string,
) {
  const path = yield* Path.Path;
  const manifest = yield* manifestOf(version);
  yield* extracted(cache, manifest);
  return path.join(cache.directory, "toolkit");
});

const isRuntime =
  (platform: Platform) =>
  (name: string): boolean =>
    Str.includes(platform.extension)(name) &&
    pipe(
      RUNTIME_PREFIXES,
      Arr.some((prefix) => Str.startsWith(prefix)(Str.replace(/^lib/u, "")(name))),
    );

const runtimeFiles = Effect.fn("cuda.runtime-files")(function* runtimeFiles(
  platform: Platform,
  toolkit: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const directories = yield* Effect.filter(
    pipe(
      platform.libraries,
      Arr.map((directory) => path.join(toolkit, directory)),
    ),
    (directory) => fileSystem.exists(directory),
  );
  const listed = yield* Effect.forEach(
    directories,
    (directory) =>
      fileSystem
        .readDirectory(directory)
        .pipe(Effect.map(Arr.map((name) => path.join(directory, name)))),
    { concurrency: 1 },
  );
  return pipe(
    Arr.flatten(listed),
    Arr.filter((file) => isRuntime(platform)(path.basename(file))),
  );
});

/** @internal */
export const copyRuntime = Effect.fn("cuda.copy-runtime")(function* copyRuntime(
  platform: Platform,
  toolkit: string,
  destination: Option.Option<string>,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  if (Option.isNone(destination)) {
    return;
  }
  const files = yield* runtimeFiles(platform, toolkit);
  yield* fileSystem.makeDirectory(destination.value, { recursive: true });
  yield* Effect.forEach(
    files,
    (file) => fileSystem.copyFile(file, path.join(destination.value, path.basename(file))),
    ONE_AT_A_TIME,
  );
});
