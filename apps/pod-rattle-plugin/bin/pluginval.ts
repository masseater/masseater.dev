import { run } from "@masseater.dev/component-release";
import { runMain } from "@masseater.dev/node-main";
import { Effect, FileSystem, Layer, Match, pipe } from "effect";
import { Digest } from "effect/crypto";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";

import { VST3, bundlesWith } from "./lib/bundled.ts";

const VERSION = "v1.0.4";
const ARCHIVE = "pluginval.zip";
const TIMEOUT_MS = "300000";
const STRICTNESS = "10";
const REPORT = "release-reports/pluginval";

type Command = readonly [string, ...string[]];

type Release = Readonly<{ asset: string; sha256: string; extract: Command; command: Command }>;

const UNZIP: Command = ["unzip", "-q", ARCHIVE];

const LINUX: Release = {
  asset: "pluginval_Linux.zip",
  sha256: "c01c49d8063965c4c2dea8324468336768f5c9139e0b1caebde14c2400b55352",
  extract: UNZIP,
  command: ["xvfb-run", "-a", "./pluginval"],
};

const WINDOWS: Release = {
  asset: "pluginval_Windows.zip",
  sha256: "c08e61ce3b96db41636f8ec7e76f4c7e2c13ebdac7fa1b5a1f52b4f32ec715ab",
  extract: ["tar", "-xf", ARCHIVE],
  command: ["./pluginval.exe"],
};

const MACOS: Release = {
  asset: "pluginval_macOS.zip",
  sha256: "3c4c533bda0c5059eea3ddaea752d757ee2025041f0f47e6bcb0e87f6082b29f",
  extract: UNZIP,
  command: ["./pluginval.app/Contents/MacOS/pluginval"],
};

const release: Release = pipe(
  Match.value(process.platform),
  Match.when("win32", () => WINDOWS),
  Match.when("darwin", () => MACOS),
  Match.orElse(() => LINUX),
);

const verified = Effect.gen(function* verified() {
  const client = yield* HttpClient.HttpClient;
  const digest = yield* Digest.Digest;
  const url = `https://github.com/Tracktion/pluginval/releases/download/${VERSION}/${release.asset}`;
  const response = yield* Effect.flatMap(client.get(url), HttpClientResponse.filterStatusOk);
  const body = yield* response.arrayBuffer;
  const bytes = new Uint8Array(body);
  const actual = yield* digest.digestHex(Digest.sha256, bytes);
  if (actual !== release.sha256) {
    return yield* Effect.die(`${release.asset} has sha256 ${actual}, expected ${release.sha256}`);
  }
  return bytes;
});

const download = Effect.gen(function* download() {
  const fileSystem = yield* FileSystem.FileSystem;
  const bytes = yield* verified;
  yield* fileSystem.writeFile(ARCHIVE, bytes);
  const [file, ...args] = release.extract;
  return yield* run({ file, args });
});

const validate = (bundle: string): ReturnType<typeof run> => {
  const [file, ...prefix] = release.command;
  const options = ["--strictness-level", STRICTNESS, "--validate-in-process"];
  return run({
    file,
    args: [...prefix, ...options, "--timeout-ms", TIMEOUT_MS, "--output-dir", REPORT, bundle],
  });
};

runMain("pod-rattle-pluginval")(
  Effect.gen(function* pluginval() {
    const http = yield* Layer.build(Layer.mergeAll(FetchHttpClient.layer, Digest.layerWebCrypto));
    yield* download.pipe(Effect.provideContext(http));
    const bundles = yield* bundlesWith(VST3);
    yield* Effect.forEach(bundles, validate, { discard: true });
  }).pipe(Effect.scoped),
);
