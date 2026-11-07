import { countDistinct } from "drizzle-orm";
import { Array, Effect, Option, Order, pipe } from "effect";

import { partStaff } from "#/entities/catalog/model/part.table";

import { NO_ROWS, catalogDb, containing } from "./db.server";

const byCreditsDescending = Order.flip(
  Order.mapInput(Order.Number, ({ creditCount }: Readonly<{ creditCount: number }>) => creditCount),
);

const listPeople = Effect.fn("catalog.people")(function* listPeople(
  keyword: Option.Option<string>,
) {
  const where = keyword.pipe(
    Option.match({
      onNone: () => ({}),
      onSome: (value) => ({
        OR: [
          { name: { like: containing(value) } },
          { aliases: { alias: { like: containing(value) } } },
        ],
      }),
    }),
  );
  const [people, counts] = yield* Effect.all(
    [
      Effect.promise(() =>
        catalogDb.query.person.findMany({
          columns: { id: true, name: true },
          where,
          orderBy: { name: "asc" },
        }),
      ),
      Effect.promise(() =>
        catalogDb
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

export { listPeople };
