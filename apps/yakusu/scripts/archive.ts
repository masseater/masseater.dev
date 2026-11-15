import { Effect, FileSystem, Path } from "effect";

import { fetchBytes, sha256 } from "./download.ts";

const LLAMA_TAG = "b12228";

type Asset = Readonly<{ name: string; sha256: string }>;

type Archive = Readonly<{ asset: Asset; archives: string }>;

const matches = Effect.fn("archive.matches")(function* matches(file: string, expected: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  if (!(yield* fileSystem.exists(file))) {
    return false;
  }
  const bytes = yield* fileSystem.readFile(file);
  const actual = yield* sha256(bytes);
  return actual === expected;
});

const downloaded = Effect.fn("archive.downloaded")(function* downloaded(asset: Asset) {
  const url = `https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_TAG}/${asset.name}`;
  const bytes = yield* fetchBytes(url);
  const actual = yield* sha256(bytes);
  if (actual !== asset.sha256) {
    return yield* Effect.die(`${asset.name} has sha256 ${actual}, expected ${asset.sha256}`);
  }
  return bytes;
});

const verifiedArchive = Effect.fn("archive.verifiedArchive")(function* verifiedArchive({
  asset,
  archives,
}: Archive) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const archive = path.join(archives, asset.name);
  if (yield* matches(archive, asset.sha256)) {
    return archive;
  }
  yield* fileSystem.remove(archives, { recursive: true, force: true });
  yield* fileSystem.makeDirectory(archives, { recursive: true });
  const bytes = yield* downloaded(asset);
  yield* fileSystem.writeFile(archive, bytes);
  return archive;
});

/** @internal */
export { LLAMA_TAG, verifiedArchive };
/** @internal */
export type { Archive, Asset };
