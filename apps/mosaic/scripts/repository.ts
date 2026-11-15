import { Effect, Path } from "effect";

export const CACHE = "tools/mosaic/.cache";
export const POOL = `${CACHE}/pool.tar`;
export const MOSAIC = "target/release/mosaic";
export const PUBLISHED = "apps/mosaic/public";

const repositoryPath = Effect.fn("repositoryPath")(function* repositoryPath(file: string) {
  const path = yield* Path.Path;
  return path.resolve(import.meta.dirname, "..", "..", "..", file);
});

/** @internal */
export const inRepository = repositoryPath;
