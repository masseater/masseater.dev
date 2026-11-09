import { Array as Arr, Duration, Effect, Option, Order, Schema, String as Str, pipe } from "effect";

import type { CatalogSongValue } from "./catalog.ts";
import { getJson } from "./client.ts";

const API = "https://vocadb.net/api";
const PAGE_SIZE = 100;
const PAUSE_SECONDS = 1;
const BACKOFF_SECONDS = 5;
const PAUSE = Duration.seconds(PAUSE_SECONDS);
const BACKOFF = Duration.seconds(BACKOFF_SECONDS);
const NICO = "NicoNicoDouga";
const YOUTUBE = "Youtube";
const ORIGINAL = "Original";
const DATE_START = 0;
const DATE_LENGTH = 10;

const Pv = Schema.Struct({
  pvId: Schema.String,
  service: Schema.String,
  pvType: Schema.String,
  disabled: Schema.optionalKey(Schema.Boolean),
  publishDate: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

const Song = Schema.Struct({
  id: Schema.Int,
  defaultName: Schema.String,
  artistString: Schema.String,
  songType: Schema.String,
  pvs: Schema.optionalKey(Schema.Array(Pv)),
});

const SongPage = Schema.Struct({ items: Schema.Array(Song) });

const Activity = Schema.Struct({
  createDate: Schema.String,
  editEvent: Schema.String,
  entry: Song,
});

const ActivityPage = Schema.Struct({ items: Schema.Array(Activity) });

type PvValue = typeof Pv.Type;
type ActivityValue = typeof Activity.Type;

const isLiveOn =
  (service: string) =>
  (pv: PvValue): boolean =>
    pv.service === service && pv.pvType === ORIGINAL && pv.disabled !== true;

const isLive = (pv: PvValue): boolean => isLiveOn(NICO)(pv) || isLiveOn(YOUTUBE)(pv);

const videosOn =
  (service: string) =>
  (pvs: readonly PvValue[]): readonly string[] =>
    pipe(
      pvs,
      Arr.filter(isLiveOn(service)),
      Arr.map(({ pvId }) => pvId),
      Arr.dedupe,
    );

const dateOf = (pv: PvValue): readonly string[] =>
  pipe(
    Option.fromNullishOr(pv.publishDate),
    Option.map(Str.slice(DATE_START, DATE_LENGTH)),
    Option.toArray,
  );

const publishedOf = (pvs: readonly PvValue[]): string =>
  pipe(
    pvs,
    Arr.filter(isLive),
    Arr.flatMap(dateOf),
    Arr.sortWith((date) => date, Order.String),
    Arr.head,
    Option.getOrElse(() => ""),
  );

const toCatalogSong = (song: typeof Song.Type): CatalogSongValue => {
  const pvs = song.pvs ?? [];
  return {
    id: song.id,
    name: song.defaultName,
    artist: song.artistString,
    type: song.songType,
    published: publishedOf(pvs),
    nico: videosOn(NICO)(pvs),
    youtube: videosOn(YOUTUBE)(pvs),
  };
};

/** @internal */
const songPage = Effect.fn("vocadb.songs")(function* songsFrom(start: number) {
  const { items } = yield* getJson({
    codec: SongPage,
    url: `${API}/songs`,
    backoff: BACKOFF,
    params: {
      start: start.toString(),
      maxResults: PAGE_SIZE.toString(),
      sort: "AdditionDate",
      fields: "PVs",
      pvServices: `${NICO},${YOUTUBE}`,
      getTotalCount: "false",
    },
  });
  yield* Effect.sleep(PAUSE);
  return pipe(items, Arr.map(toCatalogSong));
});

const beforeParam = (before: Option.Option<string>): Readonly<Record<string, string>> =>
  Option.match(before, { onNone: () => ({}), onSome: (value) => ({ before: value }) });

/** @internal */
const activityPage = Effect.fn("vocadb.activity")(function* activityBefore({
  since,
  before,
}: Readonly<{ since: string; before: Option.Option<string> }>) {
  const { items } = yield* getJson({
    codec: ActivityPage,
    url: `${API}/activityEntries`,
    backoff: BACKOFF,
    params: {
      since,
      entryType: "Song",
      maxResults: PAGE_SIZE.toString(),
      fields: "Entry",
      entryFields: "PVs",
      ...beforeParam(before),
    },
  });
  yield* Effect.sleep(PAUSE);
  return items;
});

export type { ActivityValue };
export { PAGE_SIZE, activityPage, songPage, toCatalogSong };
