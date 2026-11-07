import { Array, Effect, Number, Option, Order, pipe, String as Str } from "effect";

import { catalogDb } from "./db.server";

const byLocale = Order.make<string>((self, that) =>
  Number.sign(pipe(self, Str.localeCompare(that))),
);

type Credit = Readonly<{
  part: Readonly<{ position: number; video: Readonly<{ title: string }> }>;
}>;

const byVideoThenPosition = Order.combine(
  Order.mapInput(byLocale, ({ part }: Credit) => part.video.title),
  Order.mapInput(Order.Number, ({ part }: Credit) => part.position),
);

const getPerson = Effect.fn("catalog.person")(function* getPerson(id: number) {
  const promiseResult = yield* Effect.promise(() =>
    catalogDb.query.person.findFirst({
      columns: { id: true, name: true },
      with: {
        aliases: { columns: { alias: true } },
        credits: {
          columns: { role: true },
          with: {
            part: {
              columns: { id: true, position: true, label: true },
              with: {
                song: { columns: { id: true, title: true } },
                video: { columns: { id: true, title: true, kind: true, thumbnailUrl: true } },
              },
            },
          },
        },
      },
      where: { id },
    }),
  );
  const found = Option.fromUndefinedOr(promiseResult);
  return found.pipe(
    Option.map((person) => ({
      id: person.id,
      name: person.name,
      aliases: pipe(
        person.aliases,
        Array.map(({ alias }) => alias),
      ),
      credits: Array.sort(person.credits, byVideoThenPosition),
    })),
  );
});

export { getPerson };
