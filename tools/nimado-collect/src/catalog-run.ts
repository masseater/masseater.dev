import { Array as Arr, Effect, Option, Order, Stream, pipe } from "effect";

import { mergeSongs } from "./catalog.ts";
import type { CatalogSongValue, CatalogValue } from "./catalog.ts";
import { collect } from "./progress.ts";
import { PAGE_SIZE, toCatalogSong } from "./vocadb.ts";
import type { ActivityValue } from "./vocadb.ts";

const DELETED = "Deleted";

interface Page {
  readonly cursor: number;
  readonly items: readonly CatalogSongValue[];
}

type ActivityQuery = Readonly<{ since: string; before: Option.Option<string> }>;

const isFull = (items: readonly unknown[]): boolean => items.length >= PAGE_SIZE;

const songPages = <Failure, Services>({
  start,
  budget,
  songs,
}: Readonly<{
  start: number;
  budget: number;
  songs: (start: number) => Effect.Effect<readonly CatalogSongValue[], Failure, Services>;
}>): Stream.Stream<Page, Failure, Services> =>
  Stream.paginate(start, (cursor: number) =>
    songs(cursor).pipe(
      Effect.map((items) => {
        const next = Option.liftPredicate(cursor + PAGE_SIZE, () => isFull(items));
        return [[{ cursor, items }], next] as const;
      }),
    ),
  ).pipe(Stream.take(budget));

const activityPages = <Failure, Services>({
  since,
  budget,
  activity,
}: Readonly<{
  since: string;
  budget: number;
  activity: (query: ActivityQuery) => Effect.Effect<readonly ActivityValue[], Failure, Services>;
}>): Stream.Stream<readonly ActivityValue[], Failure, Services> =>
  Stream.paginate(Option.none<string>(), (before: Option.Option<string>) =>
    activity({ since, before }).pipe(
      Effect.map((items) => {
        const oldest = pipe(
          Arr.last(items),
          Option.map(({ createDate }) => createDate),
        );
        const next = Option.liftPredicate(oldest, () => isFull(items));
        return [[items], next] as const;
      }),
    ),
  ).pipe(Stream.take(budget));

const nextCursor = (pages: readonly Page[], start: number): Option.Option<number> =>
  pipe(
    Arr.last(pages),
    Option.match({
      onNone: () => Option.some(start),
      onSome: ({ cursor, items }) => Option.liftPredicate(cursor + PAGE_SIZE, () => isFull(items)),
    }),
  );

const applyPages = ({
  catalog,
  pages,
  start,
}: Readonly<{ catalog: CatalogValue; pages: readonly Page[]; start: number }>): CatalogValue => ({
  crawl: { ...catalog.crawl, next: nextCursor(pages, start) },
  songs: mergeSongs({
    songs: catalog.songs,
    updates: pipe(
      pages,
      Arr.flatMap(({ items }) => items),
    ),
    removed: [],
  }),
});

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

/** @internal */
const updateCatalog = Effect.fn("catalog.update")(function* updateFrom<
  Failure,
  Services,
  SaveFailure,
  SaveServices,
>({
  catalog,
  budget,
  checkpoint,
  source,
  save,
}: Readonly<{
  catalog: CatalogValue;
  budget: number;
  checkpoint: number;
  source: Readonly<{
    songs: (start: number) => Effect.Effect<readonly CatalogSongValue[], Failure, Services>;
    activity: (
      query: Readonly<{ since: string; before: Option.Option<string> }>,
    ) => Effect.Effect<readonly ActivityValue[], Failure, Services>;
  }>;
  save: (catalog: CatalogValue) => Effect.Effect<void, SaveFailure, SaveServices>;
}>) {
  const { since } = catalog.crawl;
  yield* Option.match(catalog.crawl.next, {
    onNone: () =>
      collect({
        items: activityPages({ since, budget, activity: source.activity }),
        checkpoint,
        save: (pages) => save(applyActivity(catalog, pages)),
      }).pipe(Effect.withSpan("catalog.activity", { attributes: { since, budget } })),
    onSome: (start) =>
      collect({
        items: songPages({ start, budget, songs: source.songs }),
        checkpoint,
        save: (pages) => save(applyPages({ catalog, pages, start })),
      }).pipe(Effect.withSpan("catalog.crawl", { attributes: { start, budget } })),
  });
});

export { updateCatalog };
