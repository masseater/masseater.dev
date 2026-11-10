import { Array as Arr, Effect, Exit, Option, Record, Ref, Schema, pipe } from "effect";
import { expect, it } from "vite-plus/test";

import { updateCatalog } from "./catalog-run.ts";
import type { CatalogSongValue, CatalogValue } from "./catalog.ts";
import { PAGE_SIZE } from "./vocadb.ts";
import type { ActivityValue } from "./vocadb.ts";

const taggedError = Schema.TaggedError;

class Unreachable extends taggedError<Unreachable, { readonly brand: unique symbol }>()(
  "Unreachable",
  { page: Schema.String },
) {}

const START = 0;
const SECOND_PAGE = PAGE_SIZE;
const THIRD_PAGE = PAGE_SIZE + PAGE_SIZE;
const SHORT = 30;
const EVERYTHING = 10;
const NEVER = 10;
const ONE = 1;
const PAIR = 2;
const FIRST_ID = 1;
const SINCE = "2026-01-01T00:00:00Z";
const NEWEST = "2026-01-03T00:00:00Z";
const OLDER = "2026-01-02T00:00:00Z";
const LATEST_PAGE = "latest";
const UPDATED = "Updated";
const DELETED = "Deleted";
const KEPT_ID = 7;
const DELETED_ID = 8;
const ADDED_ID = 9;

type Pages<Item> = Readonly<Record<string, readonly Item[]>>;

type Saved = Readonly<{ songs: number; next: Option.Option<number>; since: string }>;

const songOf = (id: number): CatalogSongValue => ({
  id,
  name: `曲 ${id.toString()}`,
  artist: "作者",
  type: "Original",
  published: "2026-01-01",
  nico: [`sm${id.toString()}`],
  youtube: [],
});

const songsFrom = (start: number, count: number): readonly CatalogSongValue[] =>
  pipe(Arr.range(start + FIRST_ID, start + count), Arr.map(songOf));

const activityOf = ({
  id,
  createDate,
  editEvent,
}: Readonly<{ id: number; createDate: string; editEvent: string }>): ActivityValue => ({
  createDate,
  editEvent,
  entry: {
    id,
    defaultName: `曲 ${id.toString()}`,
    artistString: "作者",
    songType: "Original",
    pvs: [{ pvId: `sm${id.toString()}`, service: "NicoNicoDouga", pvType: "Original" }],
  },
});

const pageOf =
  <Item>(pages: Pages<Item>) =>
  (page: string): Effect.Effect<readonly Item[], Unreachable> =>
    pipe(
      Record.get(pages, page),
      Effect.fromOption,
      Effect.mapError(() => Unreachable.make({ page })),
    );

const sourceOf = ({
  songs,
  activity,
}: Readonly<{ songs: Pages<CatalogSongValue>; activity: Pages<ActivityValue> }>): Readonly<{
  songs: (start: number) => Effect.Effect<readonly CatalogSongValue[], Unreachable>;
  activity: (
    query: Readonly<{ since: string; before: Option.Option<string> }>,
  ) => Effect.Effect<readonly ActivityValue[], Unreachable>;
}> => ({
  songs: (start) => pageOf(songs)(start.toString()),
  activity: ({ before }) =>
    pageOf(activity)(
      pipe(
        before,
        Option.getOrElse(() => LATEST_PAGE),
      ),
    ),
});

const crawling: CatalogValue = { crawl: { next: Option.some(START), since: SINCE }, songs: [] };

const following: CatalogValue = {
  crawl: { next: Option.none(), since: SINCE },
  songs: [songOf(KEPT_ID), songOf(DELETED_ID)],
};

const update = ({
  catalog,
  budget,
  checkpoint,
  songs,
  activity,
}: Readonly<{
  catalog: CatalogValue;
  budget: number;
  checkpoint: number;
  songs: Pages<CatalogSongValue>;
  activity: Pages<ActivityValue>;
}>): Promise<Readonly<{ failed: boolean; saves: readonly Saved[] }>> =>
  Effect.runPromise(
    Effect.gen(function* updates() {
      const saves = yield* Ref.make<readonly Saved[]>([]);
      const exit = yield* updateCatalog({
        catalog,
        budget,
        checkpoint,
        source: sourceOf({ songs, activity }),
        save: (saved) =>
          Ref.update(
            saves,
            Arr.append({
              songs: saved.songs.length,
              next: saved.crawl.next,
              since: saved.crawl.since,
            }),
          ),
      }).pipe(Effect.exit);
      const saved = yield* Ref.get(saves);
      return { failed: Exit.isFailure(exit), saves: saved };
    }),
  );

const fullActivity = pipe(
  Arr.range(FIRST_ID, PAGE_SIZE),
  Arr.map((id) => activityOf({ id, createDate: OLDER, editEvent: UPDATED })),
);

it("曲の一覧の 2 ページ目で失敗しても、1 ページ目までを保存し、続きの位置を残す", () =>
  expect(
    update({
      catalog: crawling,
      budget: EVERYTHING,
      checkpoint: NEVER,
      songs: { [START.toString()]: songsFrom(START, PAGE_SIZE) },
      activity: {},
    }),
  ).resolves.toStrictEqual({
    failed: true,
    saves: [{ songs: PAGE_SIZE, next: Option.some(SECOND_PAGE), since: SINCE }],
  }));

it("曲の一覧を最後まで読んだら、1 回だけ保存して巡回を終える", () =>
  expect(
    update({
      catalog: crawling,
      budget: EVERYTHING,
      checkpoint: NEVER,
      songs: {
        [START.toString()]: songsFrom(START, PAGE_SIZE),
        [SECOND_PAGE.toString()]: songsFrom(SECOND_PAGE, SHORT),
      },
      activity: {},
    }),
  ).resolves.toStrictEqual({
    failed: false,
    saves: [{ songs: PAGE_SIZE + SHORT, next: Option.none(), since: SINCE }],
  }));

it("予算のページ数で止め、続きの位置を残す", () =>
  expect(
    update({
      catalog: crawling,
      budget: PAIR,
      checkpoint: NEVER,
      songs: {
        [START.toString()]: songsFrom(START, PAGE_SIZE),
        [SECOND_PAGE.toString()]: songsFrom(SECOND_PAGE, PAGE_SIZE),
        [THIRD_PAGE.toString()]: songsFrom(THIRD_PAGE, PAGE_SIZE),
      },
      activity: {},
    }),
  ).resolves.toStrictEqual({
    failed: false,
    saves: [{ songs: THIRD_PAGE, next: Option.some(THIRD_PAGE), since: SINCE }],
  }));

it("決めた数のページを読むたびに保存し、保存した後に失敗しても重ねて保存しない", () =>
  expect(
    update({
      catalog: crawling,
      budget: EVERYTHING,
      checkpoint: ONE,
      songs: {
        [START.toString()]: songsFrom(START, PAGE_SIZE),
        [SECOND_PAGE.toString()]: songsFrom(SECOND_PAGE, PAGE_SIZE),
      },
      activity: {},
    }),
  ).resolves.toStrictEqual({
    failed: true,
    saves: [
      { songs: PAGE_SIZE, next: Option.some(SECOND_PAGE), since: SINCE },
      { songs: THIRD_PAGE, next: Option.some(THIRD_PAGE), since: SINCE },
    ],
  }));

it("更新の履歴の 2 ページ目で失敗しても、1 ページ目の更新を保存し、起点の日時を進めない", () =>
  expect(
    update({
      catalog: following,
      budget: EVERYTHING,
      checkpoint: NEVER,
      songs: {},
      activity: { [LATEST_PAGE]: fullActivity },
    }),
  ).resolves.toStrictEqual({
    failed: true,
    saves: [{ songs: PAGE_SIZE, next: Option.none(), since: SINCE }],
  }));

it("更新の履歴を最後まで読んだら、追加と削除を反映し、起点をいちばん新しい日時へ進める", () =>
  expect(
    update({
      catalog: following,
      budget: EVERYTHING,
      checkpoint: NEVER,
      songs: {},
      activity: {
        [LATEST_PAGE]: [
          activityOf({ id: ADDED_ID, createDate: NEWEST, editEvent: UPDATED }),
          activityOf({ id: DELETED_ID, createDate: OLDER, editEvent: DELETED }),
        ],
      },
    }),
  ).resolves.toStrictEqual({
    failed: false,
    saves: [{ songs: PAIR, next: Option.none(), since: NEWEST }],
  }));
