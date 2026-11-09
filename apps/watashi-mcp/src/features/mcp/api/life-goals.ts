import { Array as Arr, Option, Predicate, Record as Rec, pipe } from "effect";

import { monthOf, shiftDays, weekStartOf } from "./life-calendar";
import type { Period } from "./life-calendar";
import { NONE, textAt } from "./life-record";
import type { Body } from "./life-record";
import { computeStats } from "./life-stats";
import type { MetricStats, StatsData } from "./life-stats";
import { dayRangeOf } from "./life-time";

type GoalPeriod = Period & Readonly<{ value?: number; achieved?: boolean; inProgress?: boolean }>;

type GoalScope = Readonly<{ today: string; count: number; start: string; end: string }>;

type Goal = Readonly<{ body: Body; dayStart: string; dayEnd: string }>;

type GoalTarget = Readonly<{ target: number; comparison: string; today: string }>;

const ONE = 1;

const NONE_LEFT = 0;

const WEEK_LENGTH = 7;

const LAST_OF_WEEK = 6;

const FIRST_OF_MONTH = "-01";

const dayPeriod = (day: string): Period => ({ from: day, to: day });

const dayPeriods = (today: string, count: number): readonly Period[] =>
  Arr.makeBy(count, (index) => dayPeriod(shiftDays(-index)(today)));

const weekOf = (from: string): Period => ({ from, to: shiftDays(LAST_OF_WEEK)(from) });

const weekPeriods = (today: string, count: number): readonly Period[] => {
  const start = weekStartOf(today);
  return Arr.makeBy(count, (index) => weekOf(shiftDays(-index * WEEK_LENGTH)(start)));
};

const previousMonth = (month: string): string =>
  monthOf(shiftDays(-ONE)(`${month}${FIRST_OF_MONTH}`));

const monthsBack = (month: string, count: number): readonly string[] => {
  if (count <= NONE_LEFT) {
    return [];
  }
  return [month, ...monthsBack(previousMonth(month), count - ONE)];
};

const monthPeriod = (month: string): Period => {
  const range = dayRangeOf(month);
  return { from: range.start, to: range.end };
};

const monthPeriods = (today: string, count: number): readonly Period[] =>
  pipe(monthsBack(monthOf(today), count), Arr.map(monthPeriod));

const periodsOf = (period: string, { today, count }: GoalScope): readonly Period[] => {
  if (period === "day") {
    return dayPeriods(today, count);
  }
  if (period === "week") {
    return weekPeriods(today, count);
  }
  return monthPeriods(today, count);
};

const laterOf = (day: string, bound: string): string => {
  if (bound !== NONE && bound > day) {
    return bound;
  }
  return day;
};

const earlierOf = (day: string, bound: string): string => {
  if (bound !== NONE && bound < day) {
    return bound;
  }
  return day;
};

const clipped =
  ({ start, end }: GoalScope) =>
  (period: Period): Option.Option<Period> =>
    Option.liftPredicate(
      { from: laterOf(period.from, start), to: earlierOf(period.to, end) },
      (clip) => clip.from <= clip.to,
    );

const numberAt =
  (key: string) =>
  (body: Body): Option.Option<number> =>
    pipe(Rec.get(body, key), Option.filter(Predicate.isNumber));

const valueOf = (stats: MetricStats): Option.Option<number> => {
  const value = Option.fromUndefinedOr(stats.value);
  if (stats.aggregate === "sum") {
    return Option.orElseSome(value, () => NONE_LEFT);
  }
  return value;
};

const isAchieved =
  ({ target, comparison }: GoalTarget) =>
  (value: number): boolean => {
    if (comparison === "atMost") {
      return value <= target;
    }
    return value >= target;
  };

const progressOf =
  (data: StatsData, metric: string, goal: GoalTarget) =>
  (period: Period): GoalPeriod => {
    const value = pipe(
      computeStats({
        metrics: [metric],
        period,
        bucket: "none",
        compare: Option.none(),
        where: [],
        groupBy: Option.none(),
      })(data),
      Arr.head,
      Option.flatMap(valueOf),
    );
    return {
      ...period,
      ...Option.match(value, {
        onNone: () => ({}),
        onSome: (present) => ({ value: present, achieved: isAchieved(goal)(present) }),
      }),
      ...Option.match(
        Option.liftPredicate(period, (current) => current.to >= goal.today),
        {
          onNone: () => ({}),
          onSome: () => ({ inProgress: true }),
        },
      ),
    };
  };

type GoalContext = Readonly<{ data: StatsData; today: string; count: number }>;

const goalPeriods =
  ({ data, today, count }: GoalContext) =>
  ({ body, dayStart, dayEnd }: Goal): readonly GoalPeriod[] => {
    const scope: GoalScope = { today, count, start: dayStart, end: dayEnd };
    const target = pipe(
      numberAt("target")(body),
      Option.getOrElse(() => NONE_LEFT),
    );
    const goal = { target, comparison: textAt("comparison")(body), today };
    const progress = progressOf(data, textAt("metric")(body), goal);
    return pipe(
      periodsOf(textAt("period")(body), scope),
      Arr.map(clipped(scope)),
      Arr.getSomes,
      Arr.map(progress),
    );
  };

export { goalPeriods };
export type { Goal, GoalContext, GoalPeriod };
