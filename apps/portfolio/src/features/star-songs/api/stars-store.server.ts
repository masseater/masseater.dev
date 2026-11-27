import { and, count, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Array as Arr, Context, Effect, Number as Num, Record, pipe } from "effect";

import type { Entry } from "#/entities/entry/index.ts";
import { star } from "#/features/star-songs/model/star.table.ts";

export type Target = Readonly<Pick<Entry, "category" | "slug">>;

export type Stars =
  | Readonly<{ status: "found"; count: number; starred: boolean }>
  | Readonly<{ status: "missing" }>;

export type Counts =
  | Readonly<{ status: "found"; counts: Record.ReadonlyRecord<string, number> }>
  | Readonly<{ status: "missing" }>;

export class StarsDb extends Context.Service<StarsDb, DrizzleD1Database>()(
  "portfolio/features/star-songs/api/stars-store.server/StarsDb",
) {}

const NONE = 0;

export const starsDbOf = (binding: D1Database): DrizzleD1Database => drizzle(binding);

export type Change = (target: Target, visitor: string) => Effect.Effect<void, never, StarsDb>;

const queried = Effect.fn("stars.query")(function* queried<Found>(
  query: (db: DrizzleD1Database) => Promise<Found>,
) {
  const db = yield* StarsDb;
  return yield* Effect.promise(() => query(db));
});

const ofTarget = (target: Target): SQL | undefined =>
  and(eq(star.category, target.category), eq(star.slug, target.slug));

const ofVisitor = (target: Target, visitor: string): SQL | undefined =>
  and(ofTarget(target), eq(star.visitor, visitor));

export const read = Effect.fn("stars.read")(function* read(target: Target, visitor: string) {
  const rows = yield* queried((db) =>
    db
      .select({
        count: count(),
        own: db.$count(star, ofVisitor(target, visitor)),
      })
      .from(star)
      .where(ofTarget(target)),
  );
  return {
    status: "found",
    count: pipe(
      rows,
      Arr.map((row) => row.count),
      Num.sumAll,
    ),
    starred: pipe(
      rows,
      Arr.some((row) => row.own > NONE),
    ),
  } satisfies Stars;
});

export const readCounts = Effect.fn("stars.counts")(function* readCounts(
  category: Target["category"],
) {
  const rows = yield* queried((db) =>
    db
      .select({ slug: star.slug, count: count() })
      .from(star)
      .where(eq(star.category, category))
      .groupBy(star.slug),
  );
  return {
    status: "found",
    counts: Record.fromEntries(
      pipe(
        rows,
        Arr.map((row) => [row.slug, row.count] as const),
      ),
    ),
  } satisfies Counts;
});

export const addStar = Effect.fn("stars.add")(function* addStar(target: Target, visitor: string) {
  yield* queried((db) =>
    db
      .insert(star)
      .values({ ...target, visitor })
      .onConflictDoNothing(),
  );
});

export const removeStar = Effect.fn("stars.remove")(function* removeStar(
  target: Target,
  visitor: string,
) {
  yield* queried((db) => db.delete(star).where(ofVisitor(target, visitor)));
});
