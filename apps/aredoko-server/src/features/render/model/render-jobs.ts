import { Clock, Effect, Schema, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { RENDER, RETRY } from "#shared/database";
import { normalizePng } from "#shared/preview";
import { decodeRows } from "#shared/sql";

const JOBS_PER_REQUEST = 8;

const JobRow = Schema.Struct({ assetId: Schema.Int, pathname: Schema.String });

/** @internal */
const renderJobs = Effect.fn("renderJobs")(function* listRenderJobs() {
  const sql = yield* SqlClient.SqlClient;
  const now = yield* Clock.currentTimeMillis;
  return yield* decodeRows(JobRow)(
    sql`select id as assetId, pathname from assets
      where render = ${RENDER.pending} and render_retry_at <= ${now}
      order by render_retry_at, id limit ${JOBS_PER_REQUEST}`,
  );
});

/** @internal */
const putRender = Effect.fn("putRender")(function* storeRender({
  assetId,
  pngs,
}: {
  readonly assetId: number;
  readonly pngs: readonly Uint8Array[];
}) {
  const sql = yield* SqlClient.SqlClient;
  const normalized = yield* pipe(
    pngs,
    Effect.forEach((png) => normalizePng(`render of asset ${String(assetId)}`, png)),
  );
  yield* sql.withTransaction(
    Effect.gen(function* write() {
      yield* sql`delete from images where asset_id = ${assetId}`;
      yield* pipe(
        normalized,
        Effect.forEach((png) => sql`insert into images(asset_id, png) values (${assetId}, ${png})`),
      );
      yield* sql`update assets set render = ${RENDER.done} where id = ${assetId}`;
    }),
  );
});

/** @internal */
const failRender = Effect.fn("failRender")(function* postponeRender({
  assetId,
  reason,
}: {
  readonly assetId: number;
  readonly reason: string;
}) {
  const sql = yield* SqlClient.SqlClient;
  const now = yield* Clock.currentTimeMillis;
  yield* Effect.logWarning("render failed, retrying later", assetId, reason);
  yield* sql`update assets set render_attempts = render_attempts + 1,
    render_retry_at = ${now} + min(${RETRY.firstMillis} << min(render_attempts, ${RETRY.doublings}), ${RETRY.longestMillis})
    where id = ${assetId} and render = ${RENDER.pending}`;
});

export { failRender, putRender, renderJobs };
