#!/usr/bin/env node
import { runMain } from "@masseater.dev/node-main";
import {
  Array as Arr,
  Console,
  Effect,
  FileSystem,
  Option,
  Path,
  String as Str,
  pipe,
} from "effect";
import { Argument, Command } from "effect/cli";

import { shipMsvcRuntime } from "./msvc-runtime.ts";
import type { Entry } from "./runtime-files.ts";
import { RuntimeFailed, download, entries, isLink, named, succeeds } from "./runtime-files.ts";

const LLAMA_TAG = "b12228";
const MODEL_LICENSE =
  "https://huggingface.co/pfnet/plamo-3-translate-0.8b-GGUF/resolve/1cf96ae02133958a20074bfdfab76517bb737d00/LICENSE";
const HEX = 16;
const BYTE_DIGITS = 2;
const LICENSE_PREFIX = "LICENSE-";
const BUNDLED_LICENSE = /^LICENSE-/u;
const WINDOWS_TAR = "C:/Windows/System32/tar.exe";
const LIBRARY = /\.(?:so(?:\.\d+)*|dylib|dll)$/iu;
const SERVER = /^llama-server(?:\.exe)?$|ggml-cpu/u;

type Platform = Readonly<{ asset: string; sha256: string; windows: boolean }>;

const platform = Argument.ChoiceWithValue("platform", [
  [
    "linux-x64",
    {
      asset: `llama-${LLAMA_TAG}-bin-ubuntu-x64.tar.gz`,
      sha256: "61672e52aefe54ef3f90babf6a9fa4489f019ae61a5bdcd55d91caa6dc6e1cee",
      windows: false,
    },
  ],
  [
    "macos-arm64",
    {
      asset: `llama-${LLAMA_TAG}-bin-macos-arm64.tar.gz`,
      sha256: "253fd52bd0127e1d6627c35aec75694a94c72e3ce552c016dbb3b54be9084b3c",
      windows: false,
    },
  ],
  [
    "windows-x64",
    {
      asset: `llama-${LLAMA_TAG}-bin-win-cpu-x64.zip`,
      sha256: "58e0dfefb963c0031ee10a390db6203f9a225528000b2fd6a5d16c20aa044384",
      windows: true,
    },
  ],
]);

const LICENSES: readonly (readonly [string, string])[] = [
  ["PLaMo-Community-License-ja.txt", `${MODEL_LICENSE}/ja`],
  ["PLaMo-Community-License-en.txt", `${MODEL_LICENSE}/en`],
  [
    "llama.cpp-LICENSE.txt",
    `https://raw.githubusercontent.com/ggml-org/llama.cpp/${LLAMA_TAG}/LICENSE`,
  ],
];

const hex = (byte: number): string => Str.padStart(BYTE_DIGITS, "0")(byte.toString(HEX));

const toHex = (digest: ArrayBuffer): string =>
  pipe([...new Uint8Array(digest)], Arr.map(hex), Arr.join(""));

const sha256 = (bytes: Uint8Array<ArrayBuffer>): Effect.Effect<string> =>
  Effect.promise(() => crypto.subtle.digest("SHA-256", bytes)).pipe(Effect.map(toHex));

const isFresh = Effect.fn("isFresh")(function* isFresh(archive: string, target: Platform) {
  const fs = yield* FileSystem.FileSystem;
  const cached = yield* fs.readFile(archive).pipe(Effect.option);
  if (Option.isNone(cached)) {
    return false;
  }
  const actual = yield* sha256(new Uint8Array(cached.value));
  return actual === target.sha256;
});

const downloadArchive = Effect.fn("downloadArchive")(function* downloadArchive(
  archive: string,
  target: Platform,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const bytes = yield* download(
    `https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_TAG}/${target.asset}`,
  );
  const actual = yield* sha256(bytes);
  if (actual !== target.sha256) {
    return yield* RuntimeFailed.make({ message: `${target.asset} has sha256 ${actual}` });
  }
  yield* fs.remove(path.dirname(archive), { recursive: true, force: true });
  yield* fs.makeDirectory(path.dirname(archive), { recursive: true });
  return yield* fs.writeFile(archive, bytes);
});

const extract = Effect.fn("extract")(function* extract(
  archive: string,
  llama: string,
  target: Platform,
) {
  const fs = yield* FileSystem.FileSystem;
  yield* fs.remove(llama, { recursive: true, force: true });
  yield* fs.makeDirectory(llama, { recursive: true });
  if (target.windows) {
    return yield* succeeds(WINDOWS_TAR, ["-xf", archive, "-C", llama]);
  }
  return yield* succeeds("tar", ["-xzf", archive, "-C", llama, "--strip-components=1"]);
});

const moveLicenses = Effect.fn("moveLicenses")(function* moveLicenses(
  llama: string,
  licenses: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const found = yield* entries(llama).pipe(Effect.map(named(BUNDLED_LICENSE)));
  const renamed = (name: string): string =>
    path.join(licenses, `${Str.slice(LICENSE_PREFIX.length)(name)}-LICENSE.txt`);
  yield* Effect.forEach(found, ({ name, file }) => fs.rename(file, renamed(name)), {
    discard: true,
  });
});

const links = Effect.fn("links")(function* links(llama: string) {
  const all = yield* entries(llama);
  return yield* pipe(
    all,
    Effect.filter(({ file }) => isLink(file)),
  );
});

const flattenLinks = Effect.fn("flattenLinks")(function* flattenLinks(llama: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const found = yield* links(llama);
  const resolved = yield* pipe(
    found,
    Effect.forEach(({ file }) =>
      fs.readLink(file).pipe(Effect.map((target) => ({ file, target: path.join(llama, target) }))),
    ),
  );
  const direct = yield* pipe(
    resolved,
    Effect.filter(({ target }) => Effect.map(isLink(target), (link) => !link)),
  );
  yield* Effect.forEach(
    direct,
    ({ file, target }) => fs.remove(file).pipe(Effect.andThen(fs.rename(target, file))),
    { discard: true },
  );
  const left = yield* links(llama);
  yield* Effect.forEach(left, ({ file }) => fs.remove(file), { discard: true });
});

const closure = Effect.fn("closure")(function* closure(
  candidates: readonly Entry[],
  kept: readonly Entry[],
): Effect.fn.Return<readonly Entry[], never, FileSystem.FileSystem> {
  const fs = yield* FileSystem.FileSystem;
  const decoder = new TextDecoder("latin1");
  const texts = yield* pipe(
    kept,
    Effect.forEach(({ file }) => fs.readFile(file).pipe(Effect.orDie)),
  );
  const decoded = pipe(
    texts,
    Arr.map((bytes) => decoder.decode(bytes)),
  );
  const isUsed = ({ name }: Entry): boolean => pipe(decoded, Arr.some(Str.includes(name)));
  const added = pipe(candidates, Arr.filter(isUsed));
  if (!Arr.isReadonlyArrayNonEmpty(added)) {
    return kept;
  }
  return yield* closure(Arr.difference(candidates, added), [...kept, ...added]);
});

const keepServerClosure = Effect.fn("keepServerClosure")(function* keepServerClosure(
  llama: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const all = yield* entries(llama);
  const servers = named(SERVER)(all);
  const libraries = Arr.difference(named(LIBRARY)(all), servers);
  const kept = yield* closure(libraries, servers);
  const dropped = Arr.difference(all, kept);
  yield* Effect.forEach(dropped, ({ file }) => fs.remove(file, { recursive: true }), {
    discard: true,
  });
});

const writeLicenses = Effect.fn("writeLicenses")(function* writeLicenses(licenses: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* Effect.forEach(
    LICENSES,
    ([name, url]) =>
      download(url).pipe(Effect.flatMap((bytes) => fs.writeFile(path.join(licenses, name), bytes))),
    { discard: true },
  );
});

const prepare = Effect.fn("prepare")(function* prepare(resources: string, target: Platform) {
  const path = yield* Path.Path;
  const archive = path.join(resources, "archives", target.asset);
  if (!(yield* isFresh(archive, target))) {
    yield* downloadArchive(archive, target);
  }
  return archive;
});

const unpack = Effect.fn("unpack")(function* unpack(resources: string, target: Platform) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const llama = path.join(resources, "llama");
  const licenses = path.join(resources, "licenses");
  const archive = yield* prepare(resources, target);
  yield* extract(archive, llama, target);
  yield* fs.makeDirectory(licenses, { recursive: true });
  yield* moveLicenses(llama, licenses);
  yield* flattenLinks(llama);
  return { llama, licenses };
});

const fetchRuntime = Effect.fn("fetchRuntime")(function* fetchRuntime(target: Platform) {
  const path = yield* Path.Path;
  const resources = yield* path.fromFileUrl(new URL("src-tauri/resources", import.meta.url));
  const { llama, licenses } = yield* unpack(resources, target);
  yield* keepServerClosure(llama);
  if (target.windows) {
    yield* shipMsvcRuntime(llama);
  }
  yield* writeLicenses(licenses);
  return yield* Console.log(`llama-server ${LLAMA_TAG} is in ${llama}`);
});

const command = Command.make("yakusu-fetch-runtime", { platform }, ({ platform: target }) =>
  fetchRuntime(target),
);

runMain("yakusu-fetch-runtime")(Command.run(command, { version: "0.0.0" }));
