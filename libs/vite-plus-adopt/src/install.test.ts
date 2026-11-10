import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { assertTrue, strictEqual } from "@effect/vitest/utils";
import { Effect, Exit, FileSystem, String as Str } from "effect";
import type { Path, PlatformError } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import type { Binary, BinaryAsset } from "./binaries.ts";
import { sha256Hex, zipArchive } from "./fixture.test.support.ts";
import { installBinary, locateBinary } from "./install.ts";
import { VendorDirectory } from "./vendor.ts";

type FixtureServices = ChildProcessSpawner.ChildProcessSpawner | FileSystem.FileSystem | Path.Path;

interface Installed {
  readonly before: Exit.Exit<string, unknown>;
  readonly installed: Exit.Exit<void, unknown>;
  readonly after: Exit.Exit<string, unknown>;
}

const SCRIPT = "#!/bin/sh\necho fixture\n";

const SHA256_HEX_LENGTH = 64;

const WRONG_DIGEST = Str.repeat(SHA256_HEX_LENGTH)("0");

const archive = zipArchive({ fixture: SCRIPT, "fixture.exe": SCRIPT });

const fixtureBinary = (asset: BinaryAsset): Binary => ({
  name: "fixture",
  version: "1.0.0",
  assets: {
    "darwin-arm64": asset,
    "darwin-x64": asset,
    "linux-arm64": asset,
    "linux-x64": asset,
    "win32-x64": asset,
  },
});

const installFixture = (
  digest: (data: Uint8Array) => Effect.Effect<string>,
): Effect.Effect<Installed, never, FixtureServices> =>
  Effect.gen(function* installArchive() {
    const data = yield* archive;
    const binary = fixtureBinary({
      url: "https://example.invalid/fixture.zip",
      sha256: yield* digest(data),
      archive: "zip",
    });
    const before = yield* Effect.exit(locateBinary(binary));
    const body = new Uint8Array(data);
    const release = HttpClient.make((request) => {
      const response = HttpClientResponse.fromWeb(request, new Response(body));
      return Effect.succeed(response);
    });
    const installed = yield* Effect.exit(
      installBinary(binary).pipe(Effect.provideService(HttpClient.HttpClient, release)),
    );
    const after = yield* Effect.exit(locateBinary(binary));
    return { before, installed, after };
  });

const output = (
  file: string,
): Effect.Effect<string, PlatformError.PlatformError, FixtureServices> =>
  Effect.gen(function* run() {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    return yield* spawner.string(ChildProcess.make(file, []));
  });

const placesTheVerifiedBinary = Effect.gen(function* placesTheVerifiedBinary() {
  const { before, installed, after } = yield* installFixture(sha256Hex);
  assertTrue(Exit.isFailure(before));
  assertTrue(Exit.isSuccess(installed));
  const file = yield* Exit.match(after, { onFailure: Effect.failCause, onSuccess: Effect.succeed });
  strictEqual(yield* output(file), "fixture\n");
});

const refusesAMismatchedDigest = Effect.gen(function* refusesAMismatchedDigest() {
  const { installed, after } = yield* installFixture(() => Effect.succeed(WRONG_DIGEST));
  assertTrue(Exit.isFailure(installed));
  assertTrue(Exit.isFailure(after));
});

const inVendorDirectory = <Value, Failure>(
  test: Effect.Effect<Value, Failure, FixtureServices>,
): Effect.Effect<Value, Failure | PlatformError.PlatformError, FixtureServices> =>
  Effect.gen(function* run() {
    const fs = yield* FileSystem.FileSystem;
    const vendor = yield* fs.makeTempDirectoryScoped({ prefix: "vite-plus-adopt-vendor-" });
    return yield* test.pipe(Effect.provideService(VendorDirectory, vendor));
  }).pipe(Effect.scoped);

layer(nodeServicesLayer)("binary install", (it) => {
  it.effect("downloads, verifies and places an executable where commands look for it", () =>
    inVendorDirectory(placesTheVerifiedBinary),
  );
  it.effect("refuses an archive whose SHA-256 differs and places nothing", () =>
    inVendorDirectory(refusesAMismatchedDigest),
  );
});
