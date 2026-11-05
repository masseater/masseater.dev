import { env } from "cloudflare:workers";
import { and, count, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Array as Arr, Effect, Record, pipe } from "effect";

import type { Entry } from "#/entities/entry";
import { star } from "#/features/star/model/star.table";

type Target = Readonly<Pick<Entry, "category" | "slug">>;

type Stars =
  | Readonly<{ status: "found"; count: number; starred: boolean }>
  | Readonly<{ status: "missing" }>;

type Counts =
  | Readonly<{ status: "found"; counts: Record.ReadonlyRecord<string, number> }>
  | Readonly<{ status: "missing" }>;

type Change = (target: Target, visitor: string) => Effect.Effect<void>;

const db = drizzle(env.STARS);

const ofTarget = (target: Target): SQL | undefined =>
  and(eq(star.category, target.category), eq(star.slug, target.slug));

const read = Effect.fn("stars.read")(function* read(target: Target, visitor: string) {
  const rows = yield* Effect.promise(() =>
    db.select({ visitor: star.visitor }).from(star).where(ofTarget(target)),
  );
  return {
    status: "found",
    count: rows.length,
    starred: pipe(
      rows,
      Arr.some((row) => row.visitor === visitor),
    ),
  } satisfies Stars;
});

const readCounts = Effect.fn("stars.counts")(function* readCounts(category: Target["category"]) {
  const rows = yield* Effect.promise(() =>
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

const addStar = Effect.fn("stars.add")(function* addStar(target: Target, visitor: string) {
  yield* Effect.promise(() =>
    db
      .insert(star)
      .values({ ...target, visitor })
      .onConflictDoNothing(),
  );
});

const removeStar = Effect.fn("stars.remove")(function* removeStar(target: Target, visitor: string) {
  yield* Effect.promise(() =>
    db.delete(star).where(and(ofTarget(target), eq(star.visitor, visitor))),
  );
});

export { addStar, read, readCounts, removeStar };
export type { Change, Counts, Stars, Target };
