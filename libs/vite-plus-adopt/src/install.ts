import { untar } from "@andrewbranch/untar.js";
import { Array as Arr, Effect, FileSystem, Path, pipe } from "effect";
import type { Option, PlatformError } from "effect";
import { encode as encodeHex } from "effect/encoding/Hex";
import { HttpClient } from "effect/http";
import { unzip } from "fflate";

import { attempt } from "./attempt.ts";
import { PLATFORMS } from "./binaries.ts";
import type { Binary, BinaryAsset, Platform } from "./binaries.ts";
import { configMissing, toolFailed } from "./errors.ts";
import type { VpToolsError } from "./errors.ts";
import { VendorDirectory } from "./vendor.ts";

type Entries = ReadonlyMap<string, Uint8Array>;

interface Download {
  readonly binary: Binary;
  readonly platform: Platform;
  readonly data: Uint8Array;
}

type InstallServices = FileSystem.FileSystem | Path.Path;

type InstallError = VpToolsError | PlatformError.PlatformError;

const EXECUTABLE = 0o755;

const NOT_INSTALLED =
  "was not installed. Allow the postinstall of @r_masseater/vite-plus-adopt in allowBuilds of pnpm-workspace.yaml and run vp install.";

const currentPlatform = (): Option.Option<Platform> =>
  Arr.findFirst(PLATFORMS, (platform) => platform === `${process.platform}-${process.arch}`);

const executableName = (binary: Binary, platform: Platform): string => {
  if (platform === "win32-x64") {
    return `${binary.name}.exe`;
  }
  return binary.name;
};

const assetOf = ({ binary, platform }: Download): BinaryAsset => binary.assets[platform];

const download = (
  binary: Binary,
  asset: BinaryAsset,
): Effect.Effect<Uint8Array, VpToolsError, HttpClient.HttpClient> =>
  Effect.gen(function* fetchAsset() {
    const client = HttpClient.filterStatusOk(yield* HttpClient.HttpClient);
    const response = yield* client.get(asset.url);
    return new Uint8Array(yield* response.arrayBuffer);
  }).pipe(Effect.mapError(toolFailed(binary.name)));

const verify = (fetched: Download): Effect.Effect<Download, VpToolsError> => {
  const asset = assetOf(fetched);
  const failed = toolFailed(fetched.binary.name);
  const data = new Uint8Array(fetched.data);
  return attempt(fetched.binary.name)(() => crypto.subtle.digest("SHA-256", data)).pipe(
    Effect.map((digest) => encodeHex(new Uint8Array(digest))),
    Effect.filterOrFail(
      (digest) => digest === asset.sha256,
      (digest) => failed(`${asset.url} has SHA-256 ${digest}, expected ${asset.sha256}`),
    ),
    Effect.as(fetched),
  );
};

const gunzipped = (data: Uint8Array): Effect.Effect<ArrayBuffer, VpToolsError> => {
  const compressed = new Blob([new Uint8Array(data)]).stream();
  return attempt("gunzip")(() =>
    new Response(compressed.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer(),
  );
};

const tarEntries = (data: Uint8Array): Effect.Effect<Entries, VpToolsError> =>
  gunzipped(data).pipe(
    Effect.map(untar),
    Effect.map(
      (files) =>
        new Map(
          pipe(
            files,
            Arr.map((file) => [file.name, file.fileData] as const),
          ),
        ),
    ),
  );

const zipEntries = (data: Uint8Array): Effect.Effect<Entries, VpToolsError> =>
  Effect.callback<Entries, VpToolsError>((resume) => {
    unzip(data, (failure, files) => {
      if (failure === null) {
        const entries: Entries = new Map(Object.entries(files));
        resume(Effect.succeed(entries));
        return;
      }
      resume(Effect.fail(toolFailed("unzip")(failure)));
    });
  });

const entriesOf = (
  asset: BinaryAsset,
): ((data: Uint8Array) => Effect.Effect<Entries, VpToolsError>) => {
  if (asset.archive === "zip") {
    return zipEntries;
  }
  return tarEntries;
};

const extract = (fetched: Download): Effect.Effect<Uint8Array, VpToolsError> => {
  const asset = assetOf(fetched);
  const executable = executableName(fetched.binary, fetched.platform);
  return entriesOf(asset)(fetched.data).pipe(
    Effect.flatMap((files) => Effect.fromNullishOr(files.get(executable))),
    Effect.mapError(() => toolFailed(fetched.binary.name)(`${asset.url} has no ${executable}`)),
  );
};

const binaryPath = (binary: Binary, platform: Platform): Effect.Effect<string, never, Path.Path> =>
  Effect.gen(function* vendoredPath() {
    const path = yield* Path.Path;
    const vendor = yield* VendorDirectory;
    return path.join(vendor, binary.name, binary.version, executableName(binary, platform));
  });

const place = (
  fetched: Download,
  bytes: Uint8Array,
): Effect.Effect<void, PlatformError.PlatformError, InstallServices> =>
  Effect.gen(function* write() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const file = yield* binaryPath(fetched.binary, fetched.platform);
    yield* fs.makeDirectory(path.dirname(file), { recursive: true });
    const partial = `${file}.${crypto.randomUUID()}.partial`;
    yield* fs.writeFile(partial, bytes);
    yield* fs.chmod(partial, EXECUTABLE);
    yield* fs.rename(partial, file);
  });

const unpack = (fetched: Download): Effect.Effect<void, InstallError, InstallServices> =>
  verify(fetched).pipe(
    Effect.flatMap(extract),
    Effect.flatMap((bytes) => place(fetched, bytes)),
  );

const platformOf = (binary: Binary): Effect.Effect<Platform, VpToolsError> =>
  pipe(
    currentPlatform(),
    Effect.fromOption,
    Effect.mapError(() =>
      toolFailed(binary.name)(`no release for ${process.platform}-${process.arch}`),
    ),
  );

const isPlaced = (
  binary: Binary,
  platform: Platform,
): Effect.Effect<boolean, PlatformError.PlatformError, InstallServices> =>
  Effect.gen(function* placed() {
    const fs = yield* FileSystem.FileSystem;
    return yield* fs.exists(yield* binaryPath(binary, platform));
  });

const installBinary = (
  binary: Binary,
): Effect.Effect<
  void,
  VpToolsError | PlatformError.PlatformError,
  FileSystem.FileSystem | HttpClient.HttpClient | Path.Path
> =>
  Effect.gen(function* install() {
    const platform = yield* platformOf(binary);
    if (yield* isPlaced(binary, platform)) {
      return;
    }
    const data = yield* download(binary, binary.assets[platform]);
    yield* unpack({ binary, platform, data });
  });

const locateBinary = (
  binary: Binary,
): Effect.Effect<
  string,
  VpToolsError | PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* locate() {
    const platform = yield* platformOf(binary);
    if (!(yield* isPlaced(binary, platform))) {
      return yield* Effect.fail(configMissing(`${binary.name} ${binary.version} ${NOT_INSTALLED}`));
    }
    return yield* binaryPath(binary, platform);
  });

export { installBinary, locateBinary };
