import { Array as Arr, Effect, pipe } from "effect";
import { Miniflare } from "miniflare";

export type Bucket = Awaited<ReturnType<Miniflare["getR2Bucket"]>>;

export type R2 = Readonly<{
  bucket: Effect.Effect<Bucket>;
  objectCount: Effect.Effect<number>;
  resetBucket: Effect.Effect<void>;
  closeBucket: Effect.Effect<void>;
}>;

const BINDING = "BUCKET";
const EMPTY_WORKER = "export default { fetch: () => new Response(null) };";

const keysIn = (bucket: Bucket): Effect.Effect<readonly string[]> =>
  Effect.promise(() => bucket.list()).pipe(
    Effect.map(({ objects }) =>
      pipe(
        objects,
        Arr.map((object) => object.key),
      ),
    ),
  );

const emptied = (bucket: Bucket): Effect.Effect<void> =>
  keysIn(bucket).pipe(
    Effect.flatMap((keys) =>
      Effect.when(
        Effect.promise(() => bucket.delete([...keys])),
        Effect.succeed(Arr.isReadonlyArrayNonEmpty(keys)),
      ),
    ),
    Effect.asVoid,
  );

export const makeR2 = (): R2 => {
  const miniflare = new Miniflare({ modules: true, script: EMPTY_WORKER, r2Buckets: [BINDING] });
  const ready = miniflare.getR2Bucket(BINDING);
  const bucket = Effect.promise(() => ready);
  return {
    bucket,
    objectCount: bucket.pipe(
      Effect.flatMap(keysIn),
      Effect.map((keys) => keys.length),
    ),
    resetBucket: bucket.pipe(Effect.flatMap(emptied)),
    closeBucket: Effect.promise(() => miniflare.dispose()),
  };
};
