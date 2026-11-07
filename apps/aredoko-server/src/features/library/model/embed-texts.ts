import { Array, Effect, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { vectorBytes } from "#shared/database";
import type { Vector } from "#shared/embedding";
import { Embedder } from "#shared/embedding";
import { decodeRows } from "#shared/sql";

import { AssetTextRow } from "./rows.ts";

const TEXT_BATCH = 16;

type AssetText = typeof AssetTextRow.Type;

const insertVector = Effect.fn("insertTextVector")(function* insertTextVector([
  { id },
  vector,
]: readonly [AssetText, Vector]) {
  const sql = yield* SqlClient.SqlClient;
  const embedding = vectorBytes(vector);
  yield* sql`insert into text_vectors(rowid, embedding) values (cast(${id} as integer), ${embedding})`;
});

const embedBatch = Effect.fn("embedTextBatch")(function* embedTextBatch(
  batch: readonly AssetText[],
) {
  const embedder = yield* Embedder;
  const texts = pipe(
    batch,
    Array.map(({ text }) => text),
  );
  const vectors = yield* embedder.embedDocuments(texts);
  yield* pipe(Array.zip(batch, vectors), Effect.forEach(insertVector));
});

/** @internal */
const embedTexts = Effect.fn("embedTexts")(function* embedPackageTexts(packageId: number) {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* decodeRows(AssetTextRow)(
    sql`select a.id, a.text from assets a
      where a.package_id = ${packageId}
      and not exists (select 1 from text_vectors v where v.rowid = a.id)`,
  );
  yield* pipe(rows, Array.chunksOf(TEXT_BATCH), Effect.forEach(embedBatch));
});

export { embedTexts };
