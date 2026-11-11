import { Array, Clock, Duration, Effect, Option, Schema, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { ASSET_ORDER, EMBEDDING, RETRY, vectorBytes } from "#shared/database";
import { Embedder } from "#shared/embedding";
import { decodeRows } from "#shared/sql";

import { ImageRow, PendingImageRow } from "./rows.ts";

const IMAGE_BATCH = 8;
const NO_IMAGES = 0;

const NextRetryRow = Schema.Struct({ retry_at: Schema.NullOr(Schema.Int) });

type Image = typeof ImageRow.Type;

type PendingImage = typeof PendingImageRow.Type;

interface AnalyzedBatch {
  readonly assetIds: readonly number[];
  readonly pathname: string;
}

const save = Effect.fn("saveImageVector")(function* saveImageVector([{ id }, vector]: readonly [
  Image,
  readonly number[],
]) {
  const sql = yield* SqlClient.SqlClient;
  const embedding = vectorBytes(vector);
  yield* sql`insert into image_vectors(rowid, embedding) values (cast(${id} as integer), ${embedding})`;
  yield* sql`update images set embedded = ${EMBEDDING.done} where id = ${id}`;
});

const markFailed = Effect.fn("markImageFailed")(function* markImageFailed({ id }: Image) {
  const sql = yield* SqlClient.SqlClient;
  const now = yield* Clock.currentTimeMillis;
  yield* sql`update images set attempts = attempts + 1, retry_at = ${now} + min(${RETRY.firstMillis} << min(attempts, ${RETRY.doublings}), ${RETRY.longestMillis})
    where id = ${id}`;
});

const embedBatch = Effect.fn("embedBatch")(function* embedImageBatch(images: readonly Image[]) {
  const sql = yield* SqlClient.SqlClient;
  const embedder = yield* Embedder;
  const vectors = yield* embedder.embedImages(
    pipe(
      images,
      Array.map(({ png }) => png),
    ),
  );
  const embedded = yield* pipe(
    images,
    Effect.forEach((image, index) =>
      pipe(
        Array.get(vectors, index),
        Effect.fromOption,
        Effect.map((vector) => [image, vector] as const),
      ),
    ),
  );
  yield* sql.withTransaction(pipe(embedded, Effect.forEach(save)));
});

const embedOneByOne = Effect.fn("embedOneByOne")(function* embedOneByOne(images: readonly Image[]) {
  yield* pipe(
    images,
    Effect.forEach((image) =>
      embedBatch([image]).pipe(
        Effect.catchCause((cause) =>
          Effect.logWarning("image embedding failed, retrying later", image.id, cause).pipe(
            Effect.andThen(markFailed(image)),
          ),
        ),
      ),
    ),
  );
});

const loadImages = Effect.fn("loadImages")(function* loadPendingImages(
  batch: Array.NonEmptyReadonlyArray<PendingImage>,
) {
  const sql = yield* SqlClient.SqlClient;
  const ids = pipe(
    batch,
    Array.map(({ id }) => id),
  );
  return yield* decodeRows(ImageRow)(
    sql`select id, png from images
      where ${sql.in("id", ids)} and embedded = ${EMBEDDING.pending} order by id`,
  );
});

const embedLoaded = Effect.fn("embedLoaded")(function* embedLoadedImages(
  images: Array.NonEmptyReadonlyArray<Image>,
) {
  yield* embedBatch(images).pipe(Effect.catchCause(() => embedOneByOne(images)));
});

const analyze = Effect.fn("analyzeBatch")(function* analyzeBatch(
  batch: Array.NonEmptyReadonlyArray<PendingImage>,
  onBatch: (batch: AnalyzedBatch) => Effect.Effect<void>,
) {
  yield* onBatch({
    assetIds: pipe(
      batch,
      Array.map(({ asset_id: assetId }) => assetId),
      Array.dedupe,
    ),
    pathname: Array.headNonEmpty(batch).pathname,
  });
  const images = yield* loadImages(batch);
  yield* Array.match(images, { onEmpty: () => Effect.void, onNonEmpty: embedLoaded });
});

const embedPending = Effect.fn("embedPending")(function* embedPendingImages(
  onBatch: (batch: AnalyzedBatch) => Effect.Effect<void>,
) {
  const sql = yield* SqlClient.SqlClient;
  const now = yield* Clock.currentTimeMillis;
  const pending = yield* decodeRows(PendingImageRow)(
    sql`select i.id, i.asset_id, a.pathname from images i join assets a on a.id = i.asset_id
      where i.embedded = ${EMBEDDING.pending} and i.retry_at <= ${now}
      order by ${sql.literal(ASSET_ORDER)}, i.id`,
  );
  yield* pipe(
    pending,
    Array.chunksOf(IMAGE_BATCH),
    Effect.forEach((batch) => analyze(batch, onBatch)),
  );
  return pending.length;
});

const nextRetry = Effect.gen(function* nextRetry() {
  const sql = yield* SqlClient.SqlClient;
  const now = yield* Clock.currentTimeMillis;
  const rows = yield* decodeRows(NextRetryRow)(
    sql`select min(retry_at) as retry_at from images where embedded = ${EMBEDDING.pending}`,
  );
  return pipe(
    Array.head(rows),
    Option.flatMap(({ retry_at: retryAt }) => Option.fromNullOr(retryAt)),
    Option.map((retryAt) => Duration.millis(Math.max(retryAt - now, NO_IMAGES))),
  );
}).pipe(Effect.withSpan("nextImageRetry"));

/** @internal */
const embedImages = Effect.fn("embedImages")(function* embedAllImages(
  onBatch: (batch: AnalyzedBatch) => Effect.Effect<void>,
) {
  yield* embedPending(onBatch).pipe(Effect.repeat({ while: (count) => count > NO_IMAGES }));
  return yield* nextRetry;
});

export { embedImages };
export type { AnalyzedBatch };
