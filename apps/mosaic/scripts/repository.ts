import { Effect, Path } from "effect";

const CACHE = "tools/mosaic/.cache";
const POOL = `${CACHE}/pool.tar`;
const MOSAIC = "target/release/mosaic";
const PUBLISHED = "apps/mosaic/public";

const repositoryPath = Effect.fn("repositoryPath")(function* repositoryPath(file: string) {
  const path = yield* Path.Path;
  return path.resolve(import.meta.dirname, "..", "..", "..", file);
});

/** @internal */
const inRepository = repositoryPath;

export { CACHE, MOSAIC, POOL, PUBLISHED, inRepository };
