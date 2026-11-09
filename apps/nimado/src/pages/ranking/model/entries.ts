import type { Meta, PlatformName } from "@masseater.dev/nimado";
import { useQueries, useQuery } from "@tanstack/react-query";
import type { QueryStatus } from "@tanstack/react-query";
import { Array as Arr, Option, Record, pipe } from "effect";

import { dayQuery, tableQuery } from "#/shared/api/data";
import type { DayValue, TableValue } from "#/shared/api/data";

import { covers, windowOf } from "./period";
import type { Window } from "./period";
import { gains, growth, rank, totals } from "./ranking";
import type { Ranked } from "./ranking";
import type { RankingSearch } from "./search";

type Entries =
  | Readonly<{ status: "pending" }>
  | Readonly<{ status: "error" }>
  | Readonly<{ status: "short" }>
  | Readonly<{ status: "success"; entries: readonly Ranked[] }>;

type Loaded<Value> =
  | Readonly<{ status: "pending" }>
  | Readonly<{ status: "error" }>
  | Readonly<{ status: "success"; data: Value }>;

type MetaValue = typeof Meta.Type;

interface Period {
  readonly window: Option.Option<Window>;
  readonly platforms: readonly PlatformName[];
}

const PLATFORMS: readonly PlatformName[] = ["nico", "youtube"];
const PAIR = 2;

const periodOf = ({
  meta,
  search,
}: Readonly<{ meta: MetaValue; search: RankingSearch }>): Period => {
  const window = windowOf({
    search,
    dates: pipe([...meta.days.nico, ...meta.days.youtube], Arr.dedupe),
  });
  const platforms = Option.match(window, {
    onNone: (): readonly PlatformName[] => [],
    onSome: (range) =>
      pipe(
        PLATFORMS,
        Arr.filter((platform) => covers({ window: range, dates: meta.days[platform] })),
      ),
  });
  return { window, platforms };
};

const dayQueries = ({ window, platforms }: Period): readonly ReturnType<typeof dayQuery>[] =>
  pipe(
    Option.toArray(window),
    Arr.flatMap(({ start, end }) =>
      pipe(
        platforms,
        Arr.flatMap((platform) => [
          dayQuery({ platform, date: start }),
          dayQuery({ platform, date: end }),
        ]),
      ),
    ),
  );

const combine = <Value>(
  results: readonly Readonly<{ status: Loaded<Value>["status"]; data: Value | undefined }>[],
): Loaded<readonly Value[]> => {
  if (
    pipe(
      results,
      Arr.some(({ status }) => status === "error"),
    )
  ) {
    return { status: "error" };
  }
  if (
    pipe(
      results,
      Arr.some(({ status }) => status === "pending"),
    )
  ) {
    return { status: "pending" };
  }
  return {
    status: "success",
    data: pipe(
      results,
      Arr.flatMap(({ data }) => Option.toArray(Option.fromNullishOr(data))),
    ),
  };
};

const periodEntries = ({
  table,
  platforms,
  days,
}: Readonly<{
  table: TableValue;
  platforms: readonly PlatformName[];
  days: readonly DayValue[];
}>): readonly Ranked[] => {
  const pairs = Arr.zip(platforms, Arr.chunksOf(days, PAIR));
  const counts = Record.fromEntries(
    pipe(
      pairs,
      Arr.map(([platform, [start, end = start]]) => [platform, gains({ start, end })] as const),
    ),
  );
  return growth({
    rows: table,
    nico: Option.getOrElse(Record.get(counts, "nico"), () => ({})),
    youtube: Option.getOrElse(Record.get(counts, "youtube"), () => ({})),
  });
};

const entriesOf = ({
  search,
  period,
  table,
  days,
}: Readonly<{
  search: RankingSearch;
  period: Period;
  table: TableValue;
  days: readonly DayValue[];
}>): Entries => {
  if (search.period !== "all" && Arr.isReadonlyArrayEmpty(period.platforms)) {
    return { status: "short" };
  }
  const entries = Option.match(period.window, {
    onNone: () => totals(table),
    onSome: () => periodEntries({ table, platforms: period.platforms, days }),
  });
  return {
    status: "success",
    entries: rank({ entries, sort: search.sort, kind: search.kind, query: search.query }),
  };
};

const unsettled = (statuses: readonly QueryStatus[]): Exclude<QueryStatus, "success"> => {
  if (Arr.contains(statuses, "error")) {
    return "error";
  }
  return "pending";
};

const useEntries = ({
  meta,
  search,
}: Readonly<{ meta: MetaValue; search: RankingSearch }>): Entries => {
  const period = periodOf({ meta, search });
  const table = useQuery(tableQuery);
  const days = combine<DayValue>(useQueries({ queries: dayQueries(period) }));
  if (table.status === "success" && days.status === "success") {
    return entriesOf({ search, period, table: table.data, days: days.data });
  }
  return { status: unsettled([table.status, days.status]) };
};

export type { Entries };
export { useEntries };
