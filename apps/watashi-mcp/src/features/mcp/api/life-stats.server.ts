import { Effect, Option, Predicate, Result, pipe } from "effect";

import type { StoreFailure } from "#/features/mcp/model/tool-failure";

import { previousPeriod, previousYear } from "./life-calendar";
import type { Period } from "./life-calendar";
import { invalid } from "./life-checks";
import type { LifeStatsValue } from "./life-input";
import { computeStats } from "./life-stats";
import type { MetricStats, StatsRequest } from "./life-stats";
import { loadStatsData } from "./life-stats-data.server";
import { dayRangeOf, parseTime, storedOf } from "./life-time";

const dayRange = (input: string): Effect.Effect<Period, StoreFailure> =>
  pipe(
    parseTime(input),
    Result.map((time) => dayRangeOf(storedOf(time))),
    Result.map((range) => ({ from: range.start, to: range.end })),
    Result.mapError(invalid),
    Effect.fromResult,
  );

const periodOf = ({ from, to }: Period): Effect.Effect<Period, StoreFailure> =>
  Effect.all({ start: dayRange(from), end: dayRange(to) }).pipe(
    Effect.map(({ start, end }) => ({ from: start.from, to: end.to })),
  );

const compareOf = (
  compareTo: LifeStatsValue["compareTo"],
  period: Period,
): Effect.Effect<Option.Option<Period>, StoreFailure> => {
  if (Predicate.isUndefined(compareTo)) {
    return Effect.succeedSome(previousPeriod(period));
  }
  if (Predicate.isNull(compareTo)) {
    return Effect.succeedNone;
  }
  if (compareTo === "previousYear") {
    return Effect.succeedSome(previousYear(period));
  }
  return periodOf(compareTo).pipe(Effect.asSome);
};

const requestOf = (input: LifeStatsValue): Effect.Effect<StatsRequest, StoreFailure> =>
  Effect.gen(function* statsRequest() {
    const period = yield* periodOf(input);
    const compare = yield* compareOf(input.compareTo, period);
    return {
      metrics: input.metrics,
      period,
      bucket: input.bucket ?? "none",
      compare,
      where: input.where ?? [],
      groupBy: Option.fromUndefinedOr(input.groupBy),
    };
  });

const lifeStats = (input: LifeStatsValue): Effect.Effect<readonly MetricStats[], StoreFailure> =>
  Effect.all({ request: requestOf(input), data: loadStatsData }).pipe(
    Effect.map(({ request, data }) => computeStats(request)(data)),
  );

export { lifeStats };
