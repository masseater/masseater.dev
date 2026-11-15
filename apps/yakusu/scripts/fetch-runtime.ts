import { run } from "@masseater.dev/component-release";
import { runMain } from "@masseater.dev/node-main";
import { Effect, FileSystem, Layer, Path, String as Str, pipe } from "effect";
import { Command } from "effect/cli";
import { Digest } from "effect/crypto";

import { LLAMA_TAG, verifiedArchive } from "./archive.ts";
import type { Asset } from "./archive.ts";
import { keepServerClosure } from "./closure.ts";
import type { Directories } from "./closure.ts";
import { save } from "./download.ts";
import { shipMsvcRuntime } from "./msvc.ts";
import { platform } from "./platform.ts";
import type { Platform } from "./platform.ts";

const MODEL_REPOSITORY = "pfnet/plamo-3-translate-0.8b-GGUF";
const MODEL_REVISION = "1cf96ae02133958a20074bfdfab76517bb737d00";
const ZIP = ".zip";

const ASSETS: Readonly<Record<Platform, Asset>> = {
  "linux-x64": {
    name: `llama-${LLAMA_TAG}-bin-ubuntu-x64.tar.gz`,
    sha256: "61672e52aefe54ef3f90babf6a9fa4489f019ae61a5bdcd55d91caa6dc6e1cee",
  },
  "macos-arm64": {
    name: `llama-${LLAMA_TAG}-bin-macos-arm64.tar.gz`,
    sha256: "253fd52bd0127e1d6627c35aec75694a94c72e3ce552c016dbb3b54be9084b3c",
  },
  "windows-x64": {
    name: `llama-${LLAMA_TAG}-bin-win-cpu-x64.zip`,
    sha256: "58e0dfefb963c0031ee10a390db6203f9a225528000b2fd6a5d16c20aa044384",
  },
};

const LICENSES = [
  {
    url: `https://huggingface.co/${MODEL_REPOSITORY}/resolve/${MODEL_REVISION}/LICENSE/ja`,
    name: "PLaMo-Community-License-ja.txt",
  },
  {
    url: `https://huggingface.co/${MODEL_REPOSITORY}/resolve/${MODEL_REVISION}/LICENSE/en`,
    name: "PLaMo-Community-License-en.txt",
  },
  {
    url: `https://raw.githubusercontent.com/ggml-org/llama.cpp/${LLAMA_TAG}/LICENSE`,
    name: "llama.cpp-LICENSE.txt",
  },
];

type Extraction = Readonly<{ archive: string; llama: string }>;

const extract = ({ archive, llama }: Extraction): ReturnType<typeof run> => {
  if (Str.endsWith(ZIP)(archive)) {
    return run({ file: "unzip", args: ["-q", archive, "-d", llama] });
  }
  return run({ file: "tar", args: ["-xzf", archive, "-C", llama, "--strip-components=1"] });
};

const freshDirectories = Effect.fn("runtime.freshDirectories")(function* freshDirectories({
  llama,
  licenses,
}: Directories) {
  const fileSystem = yield* FileSystem.FileSystem;
  yield* fileSystem.remove(llama, { recursive: true, force: true });
  yield* fileSystem.makeDirectory(llama, { recursive: true });
  yield* fileSystem.makeDirectory(licenses, { recursive: true });
});

const saveLicenses = Effect.fn("runtime.saveLicenses")(function* saveLicenses(licenses: string) {
  const path = yield* Path.Path;
  yield* pipe(
    LICENSES,
    Effect.forEach(({ url, name }) => save({ url, to: path.join(licenses, name) })),
  );
});

const fetchRuntime = Effect.fn("runtime.fetch")(function* fetchRuntime(target: Platform) {
  const path = yield* Path.Path;
  const resources = path.resolve("src-tauri", "resources");
  const directories = {
    llama: path.join(resources, "llama"),
    licenses: path.join(resources, "licenses"),
  };
  const archive = yield* verifiedArchive({
    asset: ASSETS[target],
    archives: path.join(resources, "archives"),
  });
  yield* freshDirectories(directories);
  yield* extract({ archive, llama: directories.llama });
  yield* keepServerClosure(directories);
  if (target === "windows-x64") {
    yield* shipMsvcRuntime(directories.llama);
  }
  yield* saveLicenses(directories.licenses);
});

const command = Command.make("fetch-runtime", { target: platform }, ({ target }) =>
  Effect.gen(function* runtime() {
    const digest = yield* Layer.build(Digest.layerWebCrypto);
    yield* fetchRuntime(target).pipe(Effect.provideContext(digest));
  }).pipe(Effect.scoped),
);

runMain("yakusu-fetch-runtime")(Command.run(command, { version: "0.0.0" }));
