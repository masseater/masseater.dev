import { containingPattern } from "@masseater.dev/like-pattern";
import { countDistinct } from "drizzle-orm";
import { Array, Effect, Option, Order, pipe } from "effect";

import { NO_ROWS, fromCatalog } from "#/shared/db/index.server.ts";
import { partStaff } from "#/shared/db/index.ts";

const byCreditsDescending = Order.flip(
  Order.mapInput(Order.Number, ({ creditCount }: Readonly<{ creditCount: number }>) => creditCount),
);

export const listPeople = Effect.fn("catalog.people")(function* listPeople(
  keyword: Option.Option<string>,
) {
  const where = keyword.pipe(
    Option.match({
      onNone: () => ({}),
      onSome: (value) => ({
        OR: [
          { name: { like: containingPattern(value) } },
          { aliases: { alias: { like: containingPattern(value) } } },
        ],
      }),
    }),
  );
  const [people, counts] = yield* Effect.all(
    [
      fromCatalog((db) =>
        db.query.person.findMany({
          columns: { id: true, name: true },
          where,
          orderBy: { name: "asc" },
        }),
      ),
      fromCatalog((db) =>
        db
          .select({ personId: partStaff.personId, credits: countDistinct(partStaff.id) })
          .from(partStaff)
          .groupBy(partStaff.personId),
      ),
    ],
    { concurrency: "unbounded" },
  );
  const credits = new Map(
    pipe(
      counts,
      Array.map((row) => [row.personId, row.credits]),
    ),
  );
  return pipe(
    people,
    Array.map((person) =>
      Object.assign(person, { creditCount: credits.get(person.id) ?? NO_ROWS }),
    ),
    (rows) => Array.sort(rows, byCreditsDescending),
  );
});
