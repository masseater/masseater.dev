import type { DayViews, TableRow } from "@masseater.dev/nimado";
import { Array as Arr, Option, Order, Record, String as Str, pipe } from "effect";

import type { KindValue, SortValue } from "./search";

type Row = typeof TableRow.Type;
type Day = typeof DayViews.Type;
type Counts = Readonly<Record<string, number>>;

type Ranked = Readonly<{
  id: number;
  name: string;
  artist: string;
  type: string;
  published: string;
  nico: Option.Option<number>;
  youtube: Option.Option<number>;
  gap: Option.Option<number>;
}>;

const ORIGINAL = "Original";

const songOf = ([id, name, artist, type, published, nico, youtube]: Row): Ranked => ({
  id,
  name,
  artist,
  type,
  published,
  nico,
  youtube,
  gap: Option.zipWith(youtube, nico, (left, right) => left - right),
});

const totals = (rows: readonly Row[]): readonly Ranked[] => pipe(rows, Arr.map(songOf));

const countsOf = (day: Day): Counts =>
  Record.fromEntries(
    pipe(
      day,
      Arr.map(([id, views]) => [id.toString(), views] as const),
    ),
  );

const gains = ({ start, end }: Readonly<{ start: Day; end: Day }>): Counts => {
  const before = countsOf(start);
  const gained = ([id, views]: readonly [number, number]): readonly (readonly [string, number])[] =>
    pipe(
      Record.get(before, id.toString()),
      Option.map((earlier) => [id.toString(), views - earlier] as const),
      Option.toArray,
    );
  return Record.fromEntries(pipe(end, Arr.flatMap(gained)));
};

const growth = ({
  rows,
  nico,
  youtube,
}: Readonly<{ rows: readonly Row[]; nico: Counts; youtube: Counts }>): readonly Ranked[] =>
  pipe(
    rows,
    Arr.map(([id, name, artist, type, published]) => {
      const key = id.toString();
      return songOf([
        id,
        name,
        artist,
        type,
        published,
        Record.get(nico, key),
        Record.get(youtube, key),
      ]);
    }),
  );

const SORT_KEYS: Readonly<Record<SortValue, (entry: Ranked) => Option.Option<number>>> = {
  nico: ({ nico }) => nico,
  youtube: ({ youtube }) => youtube,
  "youtube-lead": ({ gap }) => gap,
  "nico-lead": ({ gap }) =>
    pipe(
      gap,
      Option.map((lead) => -lead),
    ),
};

const matches = (query: string): ((entry: Ranked) => boolean) => {
  const needle = Str.toLowerCase(Str.trim(query));
  return (entry) =>
    Str.isEmpty(needle) ||
    pipe(Str.toLowerCase(`${entry.name} ${entry.artist}`), Str.includes(needle));
};

const ofKind =
  (kind: KindValue) =>
  (entry: Ranked): boolean =>
    kind === "all" || entry.type === ORIGINAL;

const keyed =
  (sort: SortValue) =>
  (entry: Ranked): readonly (readonly [number, Ranked])[] =>
    pipe(
      SORT_KEYS[sort](entry),
      Option.map((value) => [value, entry] as const),
      Option.toArray,
    );

const rank = ({
  entries,
  sort,
  kind,
  query,
}: Readonly<{
  entries: readonly Ranked[];
  sort: SortValue;
  kind: KindValue;
  query: string;
}>): readonly Ranked[] =>
  pipe(
    entries,
    Arr.filter(ofKind(kind)),
    Arr.filter(matches(query)),
    Arr.flatMap(keyed(sort)),
    Arr.sortWith(([value]) => value, Order.flip(Order.Number)),
    Arr.map(([, entry]) => entry),
  );

export type { Ranked };
export { gains, growth, rank, totals };
