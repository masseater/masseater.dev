import { VIEW_THRESHOLD, shardOf } from "@masseater.dev/nimado";
import type { DayViews, PlatformName, SongDetail, TableRow } from "@masseater.dev/nimado";
import { Array as Arr, Option, Order, Record, pipe } from "effect";

import type { CatalogSongValue } from "./catalog.ts";
import type { ViewStateValue } from "./view-state.ts";

type States = Readonly<Record<PlatformName, ViewStateValue>>;

interface Measured {
  readonly song: CatalogSongValue;
  readonly nico: Option.Option<number>;
  readonly youtube: Option.Option<number>;
}

const viewsOf =
  (state: ViewStateValue) =>
  (id: string): Option.Option<number> =>
    pipe(
      Record.get(state, id),
      Option.flatMap(([views]) => views),
    );

const highest = (state: ViewStateValue, ids: readonly string[]): Option.Option<number> =>
  pipe(
    ids,
    Arr.flatMap((id) => Option.toArray(viewsOf(state)(id))),
    Arr.match({
      onEmpty: () => Option.none(),
      onNonEmpty: (all) => Option.some(Arr.max(all, Order.Number)),
    }),
  );

const reaches = (views: Option.Option<number>): boolean =>
  Option.exists(views, (count) => count >= VIEW_THRESHOLD);

const measureSongs = ({
  songs,
  states,
}: Readonly<{ songs: readonly CatalogSongValue[]; states: States }>): readonly Measured[] =>
  pipe(
    songs,
    Arr.map((song) => ({
      song,
      nico: highest(states.nico, song.nico),
      youtube: highest(states.youtube, song.youtube),
    })),
    Arr.filter(({ nico, youtube }) => reaches(nico) || reaches(youtube)),
  );

const tableOf = (songs: readonly Measured[]): readonly (typeof TableRow.Type)[] =>
  pipe(
    songs,
    Arr.map(
      ({ song, nico, youtube }) =>
        [song.id, song.name, song.artist, song.type, song.published, nico, youtube] as const,
    ),
  );

const detailOf =
  (states: States) =>
  ({ song }: Measured): typeof SongDetail.Type => ({
    id: song.id,
    name: song.name,
    artist: song.artist,
    type: song.type,
    published: song.published,
    nico: pipe(
      song.nico,
      Arr.map((id) => ({ id, views: viewsOf(states.nico)(id) })),
    ),
    youtube: pipe(
      song.youtube,
      Arr.map((id) => ({ id, views: viewsOf(states.youtube)(id) })),
    ),
  });

const shardsOf = ({
  songs,
  states,
}: Readonly<{ songs: readonly Measured[]; states: States }>): readonly (readonly [
  number,
  readonly (typeof SongDetail.Type)[],
])[] =>
  pipe(
    Arr.groupBy(songs, ({ song }) => shardOf(song.id).toString()),
    Record.toEntries,
    Arr.map(
      ([shard, members]) => [Number(shard), pipe(members, Arr.map(detailOf(states)))] as const,
    ),
  );

const dayOf =
  (platform: PlatformName) =>
  (songs: readonly Measured[]): typeof DayViews.Type =>
    pipe(
      songs,
      Arr.flatMap((measured) =>
        pipe(
          measured[platform],
          Option.map((views) => [measured.song.id, views] as const),
          Option.toArray,
        ),
      ),
    );

export type { Measured, States };
export { dayOf, measureSongs, shardsOf, tableOf };
