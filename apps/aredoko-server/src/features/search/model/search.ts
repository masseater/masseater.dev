import { Array, Effect, HashMap, Option, Schema, String, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { vectorBytes } from "#shared/database";
import { Embedder } from "#shared/embedding";
import { decodeRows, ids } from "#shared/sql";

import { combine } from "./combine.ts";
import type { Hit } from "./combine.ts";
import { resultOf, rowsInOrder, scopeOf } from "./result-row.ts";
import type { Scope } from "./result-row.ts";

const CANDIDATES = 200;

const HitRow = Schema.Struct({ id: Schema.Int, distance: Schema.Finite });

const FULL_SIMILARITY = 1;

const termsOf = (query: string): readonly string[] =>
  pipe(query, String.toLowerCase, String.split(/[\s　]+/u), Array.filter(String.isNonEmpty));

const hitsOf = (rows: readonly (typeof HitRow.Type)[]): readonly Hit[] =>
  pipe(
    rows,
    Array.map(({ id, distance }) => ({ id, similarity: FULL_SIMILARITY - distance })),
  );

const restrictionOf = Effect.fn("restrictionOf")(function* scopeRestriction({
  packageId,
  kinds,
}: Scope) {
  const inScope = yield* scopeOf({ packageId, kinds });
  const scoped =
    Option.isSome(Option.fromNullOr(packageId)) || Array.isReadonlyArrayNonEmpty(kinds);
  return Option.liftPredicate(inScope, () => scoped);
});

type Restriction = Effect.Success<ReturnType<typeof restrictionOf>>;

const vectorRankings = Effect.fn("vectorRankings")(function* rankByVector(
  query: string,
  restriction: Restriction,
) {
  const sql = yield* SqlClient.SqlClient;
  const embedder = yield* Embedder;
  const embedded = yield* embedder.embedQuery(query);
  const vector = vectorBytes(embedded);
  const candidates = sql.literal(CANDIDATES.toString());
  const nearestImages = sql`select i.asset_id as id, v.distance from image_vectors v join images i on i.id = v.rowid
      where v.embedding match ${vector} and k = ${candidates}`;
  const nearestTexts = sql`select rowid as id, distance from text_vectors
      where embedding match ${vector} and k = ${candidates}`;
  const images = yield* decodeRows(HitRow)(
    Option.match(restriction, {
      onNone: () => nearestImages,
      onSome: (inScope) =>
        sql`${nearestImages} and v.rowid in (
          select scoped.id from images scoped join assets a on a.id = scoped.asset_id
          where ${inScope})`,
    }),
  );
  const texts = yield* decodeRows(HitRow)(
    Option.match(restriction, {
      onNone: () => nearestTexts,
      onSome: (inScope) =>
        sql`${nearestTexts} and rowid in (select a.id from assets a where ${inScope})`,
    }),
  );
  return [hitsOf(images), hitsOf(texts)] as const;
});

const nameRanking = Effect.fn("nameRanking")(function* rankByName(
  query: string,
  restriction: Restriction,
) {
  const sql = yield* SqlClient.SqlClient;
  const ranked = yield* Array.match(termsOf(query), {
    onEmpty: () => Effect.succeed<readonly number[]>([]),
    onNonEmpty: (terms) => {
      const hits = pipe(
        terms,
        Array.map((term) => sql`(instr(lower(text), ${term}) > 0)`),
        sql.join(" + ", false),
      );
      return ids(
        Option.match(restriction, {
          onNone: () =>
            sql`select id from assets where (${hits}) > 0
          order by (${hits}) desc, length(pathname) limit ${CANDIDATES}`,
          onSome: (inScope) =>
            sql`select a.id from assets a where (${hits}) > 0 and ${inScope}
          order by (${hits}) desc, length(a.pathname) limit ${CANDIDATES}`,
        }),
      );
    },
  });
  return Array.dedupe(ranked);
});

/** @internal */
const search = Effect.fn("search")(function* searchAssets({
  query,
  limit,
  kinds,
  packageId,
}: {
  readonly query: string;
  readonly limit: number;
  readonly kinds: readonly string[];
  readonly packageId: number | null;
}) {
  const restriction = yield* restrictionOf({ packageId, kinds });
  const [images, texts] = yield* vectorRankings(query, restriction);
  const names = yield* nameRanking(query, restriction);
  const ranked = combine({ images, texts, names });
  const candidates = pipe(
    ranked,
    Array.map(([id]) => id),
  );
  const rows = yield* rowsInOrder(candidates, { packageId, kinds });
  const scores = HashMap.fromIterable(ranked);
  return pipe(rows, Array.take(limit), Array.map(resultOf(scores)));
});

export { search };
