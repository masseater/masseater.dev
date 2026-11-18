import { Array as Arr, Effect, FileSystem, Option, Path, String as Str, pipe } from "effect";
import { Digest } from "effect/crypto";

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

const RUNTIME = [
  { component: "libcublas", prefix: "cublas" },
  { component: "libcurand", prefix: "curand" },
  { component: "cuda_nvrtc", prefix: "nvrtc" },
];

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
  return { toolkit: path.join(cache.directory, "toolkit"), manifest };
});

const runtimeOf =
  (platform: Platform) =>
  (name: string): Option.Option<string> =>
    Str.includes(platform.extension)(name)
      ? pipe(
          RUNTIME,
          Arr.findFirst(({ prefix }) => Str.startsWith(prefix)(Str.replace(/^lib/u, "")(name))),
          Option.map(({ component }) => component),
        )
      : Option.none();

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
    Arr.filterMap((file) =>
      pipe(
        runtimeOf(platform)(path.basename(file)),
        Option.map((component) => ({ file, component })),
      ),
    ),
  );
});

/** @internal */
export interface Runtime {
  readonly platform: Platform;
  readonly toolkit: string;
  readonly manifest: CudaManifest;
}

const pinned = Effect.fn("cuda.pin")(function* pinned(
  { platform, manifest }: Runtime,
  { file, component }: Readonly<{ file: string; component: string }>,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const digest = yield* Digest.Digest;
  const archive = yield* archiveOf({ manifest, name: component, platform: platform.key });
  const bytes = yield* fileSystem.readFile(file);
  return {
    name: path.basename(file),
    archive: `${REDIST}/${archive.relative_path}`,
    sha256: yield* digest.digestHex(Digest.sha256, bytes),
    size: bytes.byteLength,
  };
});

/** @internal */
export const writeRuntime = Effect.fn("cuda.write-runtime")(function* writeRuntime(
  runtime: Runtime,
  destination: Option.Option<string>,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  if (Option.isNone(destination)) {
    return;
  }
  const files = yield* runtimeFiles(runtime.platform, runtime.toolkit);
  const entries = yield* Effect.forEach(files, (file) => pinned(runtime, file), {
    concurrency: 1,
  });
  yield* fileSystem.makeDirectory(destination.value, { recursive: true });
  yield* fileSystem.writeFileString(
    path.join(destination.value, "runtime.json"),
    `${JSON.stringify({ files: entries }, undefined, 2)}\n`,
  );
});
