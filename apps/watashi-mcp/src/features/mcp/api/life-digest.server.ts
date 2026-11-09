import { Array as Arr, Effect, Option, Record as Rec, pipe } from "effect";

import type { StoreFailure } from "#/features/mcp/model/tool-failure";

import { previousPeriod, shiftDays } from "./life-calendar";
import type { Period } from "./life-calendar";
import type { Entry } from "./life-filter";
import { goalPeriods } from "./life-goals";
import { itemOf } from "./life-item";
import { computeStats } from "./life-stats";
import type { MetricStats, StatsData } from "./life-stats";
import { loadStatsData } from "./life-stats-data.server";
import { scanAll } from "./life-store.server";
import { dayBound, jstDayOf, todayJst } from "./life-time";

type Body = Readonly<Record<string, unknown>>;

type DigestInput = Readonly<{ from?: string; to?: string }>;

type DigestContext = Readonly<{ period: Period; today: string; entries: readonly Entry[] }>;

const DEFAULT_DAYS = 6;

const GOAL_LOOKBACK = 6;

const NO_VALUES = 0;

const ofRecord =
  (record: string) =>
  (entry: Entry): boolean =>
    entry.row.record === record;

const inPeriod =
  ({ from, to }: Period) =>
  (day: string): boolean =>
    day >= from && day <= to;

const periodOf = (input: DigestInput, today: string): Period => {
  const to = pipe(
    dayBound("end")(input.to),
    Option.getOrElse(() => today),
  );
  const from = pipe(
    dayBound("start")(input.from),
    Option.getOrElse(() => shiftDays(-DEFAULT_DAYS)(to)),
  );
  return { from, to };
};

const eventsIn = ({ period, entries }: DigestContext): readonly Entry[] =>
  pipe(
    entries,
    Arr.filter(ofRecord("life_event")),
    Arr.filter((entry) => inPeriod(period)(entry.row.dayEnd)),
  );

const hasRecords = (stats: MetricStats): boolean =>
  stats.daysLogged > NO_VALUES ||
  pipe(
    Option.fromUndefinedOr(stats.compare),
    Option.exists((compare) => compare.daysLogged > NO_VALUES),
  );

const metricsOf =
  ({ period, entries }: DigestContext) =>
  (data: StatsData): readonly MetricStats[] => {
    const metrics = pipe(
      entries,
      Arr.filter(ofRecord("metric_definition")),
      Arr.map((entry) => entry.row.label),
    );
    const request = {
      metrics,
      period,
      bucket: "none" as const,
      compare: Option.some(previousPeriod(period)),
      where: [],
      groupBy: Option.none(),
    };
    return pipe(computeStats(request)(data), Arr.filter(hasRecords));
  };

const overlaps =
  ({ from, to }: Period) =>
  (other: Period): boolean =>
    other.from <= to && other.to >= from;

const goalsOf =
  (context: DigestContext) =>
  (data: StatsData): readonly Body[] => {
    const periodsOf = goalPeriods({ data, today: context.period.to, count: GOAL_LOOKBACK });
    const overlapping = overlaps(context.period);
    return pipe(
      context.entries,
      Arr.filter(ofRecord("metric_goal")),
      Arr.map((entry) => ({
        ...itemOf(context.today)(entry),
        periods: pipe(
          periodsOf({ body: entry.body, dayStart: entry.row.dayStart, dayEnd: entry.row.dayEnd }),
          Arr.filter(overlapping),
        ),
      })),
    );
  };

const changedIn =
  (period: Period) =>
  (entry: Entry): boolean =>
    inPeriod(period)(jstDayOf(entry.row.updatedAt));

const createdIn =
  (period: Period) =>
  (entry: Entry): boolean =>
    inPeriod(period)(jstDayOf(entry.row.createdAt));

const itemsWhere =
  (context: DigestContext, record: string) =>
  (test: (entry: Entry) => boolean): readonly Body[] =>
    pipe(
      context.entries,
      Arr.filter(ofRecord(record)),
      Arr.filter(test),
      Arr.map(itemOf(context.today)),
    );

const factChanged =
  (period: Period) =>
  (entry: Entry): boolean =>
    inPeriod(period)(entry.row.dayStart) || inPeriod(period)(entry.row.dayEnd);

const isDone = (entry: Entry): boolean => entry.row.label === "done";

const withoutValues = (entry: Entry): boolean => pipe(Rec.get(entry.body, "values"), Option.isNone);

const lastReflection = ({ period, entries, today }: DigestContext): Option.Option<Body> =>
  pipe(
    entries,
    Arr.filter(ofRecord("owner_reflection")),
    Arr.filter((entry) => entry.row.dayEnd < period.from),
    Arr.head,
    Option.map(itemOf(today)),
  );

const digestOf = (context: DigestContext, data: StatsData): Body => {
  const { period } = context;
  const events = eventsIn(context);
  return {
    period,
    kindCounts: pipe(
      events,
      Arr.groupBy((entry: Entry) => entry.row.label),
      Rec.map(Arr.length),
    ),
    metrics: metricsOf(context)(data),
    goals: goalsOf(context)(data),
    todosDone: itemsWhere(context, "todo")((entry) => isDone(entry) && changedIn(period)(entry)),
    todosAdded: itemsWhere(context, "todo")(createdIn(period)),
    factChanges: itemsWhere(context, "profile_fact")(factChanged(period)),
    media: itemsWhere(context, "media_item")(changedIn(period)),
    eventsWithoutValues: pipe(events, Arr.filter(withoutValues), Arr.map(itemOf(context.today))),
    lastReflection: Option.getOrNull(lastReflection(context)),
  };
};

const lifeDigest = (input: DigestInput): Effect.Effect<Body, StoreFailure> =>
  Effect.gen(function* readDigest() {
    const today = yield* todayJst;
    const entries = yield* scanAll([
      "life_event",
      "metric_definition",
      "metric_goal",
      "todo",
      "profile_fact",
      "media_item",
      "owner_reflection",
    ]);
    const data = yield* loadStatsData;
    return digestOf({ period: periodOf(input, today), today, entries }, data);
  });

export { lifeDigest };
