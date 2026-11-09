import { Array as Arr, Effect, Option, Order, Stream, pipe } from "effect";
import type { Schema } from "effect";
import type { HttpClient, HttpClientError } from "effect/http";

import { mergeSongs } from "./catalog.ts";
import type { CatalogSongValue, CatalogValue } from "./catalog.ts";
import { PAGE_SIZE, activityPage, songPage, toCatalogSong } from "./vocadb.ts";
import type { ActivityValue } from "./vocadb.ts";

type Failure = HttpClientError.HttpClientError | Schema.SchemaError;

const DELETED = "Deleted";

interface Page {
  readonly cursor: number;
  readonly items: readonly CatalogSongValue[];
}

type Update = Readonly<{ catalog: CatalogValue; budget: number }>;

const isFull = (items: readonly unknown[]): boolean => items.length >= PAGE_SIZE;

const crawlPages = ({
  start,
  budget,
}: Readonly<{ start: number; budget: number }>): Effect.Effect<
  readonly Page[],
  Failure,
  HttpClient.HttpClient
> =>
  Stream.paginate(start, (cursor: number) =>
    songPage(cursor).pipe(
      Effect.map((items) => {
        const next = Option.liftPredicate(cursor + PAGE_SIZE, () => isFull(items));
        return [[{ cursor, items }], next] as const;
      }),
    ),
  ).pipe(Stream.take(budget), Stream.runCollect);

const activityPages = ({
  since,
  budget,
}: Readonly<{ since: string; budget: number }>): Effect.Effect<
  readonly (readonly ActivityValue[])[],
  Failure,
  HttpClient.HttpClient
> =>
  Stream.paginate(Option.none<string>(), (before: Option.Option<string>) =>
    activityPage({ since, before }).pipe(
      Effect.map((items) => {
        const oldest = pipe(
          Arr.last(items),
          Option.map(({ createDate }) => createDate),
        );
        const next = Option.liftPredicate(oldest, () => isFull(items));
        return [[items], next] as const;
      }),
    ),
  ).pipe(Stream.take(budget), Stream.runCollect);

const nextCursor = (pages: readonly Page[], start: number): Option.Option<number> =>
  pipe(
    Arr.last(pages),
    Option.match({
      onNone: () => Option.some(start),
      onSome: ({ cursor, items }) => Option.liftPredicate(cursor + PAGE_SIZE, () => isFull(items)),
    }),
  );

const crawlFrom =
  (start: number) =>
  ({ catalog, budget }: Update): Effect.Effect<CatalogValue, Failure, HttpClient.HttpClient> =>
    crawlPages({ start, budget }).pipe(
      Effect.map((pages) => ({
        crawl: { ...catalog.crawl, next: nextCursor(pages, start) },
        songs: mergeSongs({
          songs: catalog.songs,
          updates: pipe(
            pages,
            Arr.flatMap(({ items }) => items),
          ),
          removed: [],
        }),
      })),
      Effect.withSpan("catalog.crawl", { attributes: { start, budget } }),
    );

const isDeleted = ({ editEvent }: ActivityValue): boolean => editEvent === DELETED;

const newestDate = (entries: readonly ActivityValue[], fallback: string): string =>
  pipe(
    entries,
    Arr.map(({ createDate }) => createDate),
    Arr.sortWith((date) => date, Order.flip(Order.String)),
    Arr.head,
    Option.getOrElse(() => fallback),
  );

const applyActivity = (
  catalog: CatalogValue,
  pages: readonly (readonly ActivityValue[])[],
): CatalogValue => {
  const entries = pipe(pages, Arr.flatten, Arr.reverse);
  const finished = pipe(
    Arr.last(pages),
    Option.match({ onNone: () => true, onSome: (items) => !isFull(items) }),
  );
  const since = Option.match(
    Option.liftPredicate(entries, () => finished),
    {
      onNone: () => catalog.crawl.since,
      onSome: (all) => newestDate(all, catalog.crawl.since),
    },
  );
  const kept = pipe(
    entries,
    Arr.filter((entry) => !isDeleted(entry)),
  );
  const deleted = pipe(entries, Arr.filter(isDeleted));
  return {
    crawl: { ...catalog.crawl, since },
    songs: mergeSongs({
      songs: catalog.songs,
      updates: pipe(
        kept,
        Arr.map(({ entry }) => toCatalogSong(entry)),
      ),
      removed: pipe(
        deleted,
        Arr.map(({ entry }) => entry.id),
      ),
    }),
  };
};

const followActivity = ({
  catalog,
  budget,
}: Update): Effect.Effect<CatalogValue, Failure, HttpClient.HttpClient> =>
  activityPages({ since: catalog.crawl.since, budget }).pipe(
    Effect.map((pages) => applyActivity(catalog, pages)),
    Effect.withSpan("catalog.activity", { attributes: { since: catalog.crawl.since, budget } }),
  );

/** @internal */
const updateCatalog = Effect.fn("catalog.update")(function* updateFrom(
  update: Readonly<{ catalog: CatalogValue; budget: number }>,
) {
  return yield* Option.match(update.catalog.crawl.next, {
    onNone: () => followActivity(update),
    onSome: (start) => crawlFrom(start)(update),
  });
});

export { updateCatalog };
