import { Array as Arr, Number as Num, Option, Order, String as Str, pipe } from "effect";

import { table } from "#/shared/lib/markdown.ts";
import { shareOf } from "#/shared/lib/stats.ts";

import type { Meter } from "./meters.ts";

export type { Meter } from "./meters.ts";

export type Group = Readonly<{ key: string; value: number }>;

export type Share = Readonly<{ resource: string; amount: number; percent: number }>;

export type MeterUsage = Readonly<{ meter: string; total: number; resources: readonly Share[] }>;

const TOP = 10;
const DIGITS = 1;
const UNNAMED = "(none)";

const byAmount = Order.flip(Order.mapInput(Num.Order, (share: Share) => share.amount));

const shareWith =
  (total: number) =>
  ({ key, amount }: Readonly<{ key: string; amount: number }>): Share => ({
    resource: Option.getOrElse(Option.liftPredicate(key, Str.isNonEmpty), () => UNNAMED),
    amount,
    percent: Number(shareOf(total)(amount).toFixed(DIGITS)),
  });

export const usageOf =
  (meter: Meter) =>
  (groups: readonly Group[]): MeterUsage => {
    const amounts = pipe(
      groups,
      Arr.map((group) => ({ key: group.key, amount: group.value / meter.divisor })),
    );
    const total = pipe(
      amounts,
      Arr.map((entry) => entry.amount),
      Num.sumAll,
    );
    const shares = pipe(amounts, Arr.map(shareWith(total)));
    return { meter: meter.name, total, resources: Arr.sort(shares, byAmount) };
  };

const section = (usage: MeterUsage): string => {
  const rows = pipe(usage.resources, Arr.take(TOP));
  const heading = `### ${usage.meter}: ${usage.total.toFixed(DIGITS)}`;
  return Arr.join([heading, table(["resource", "amount", "percent"])(rows)], "\n\n");
};

export const usageSummary = (usages: readonly MeterUsage[]): string =>
  pipe(usages, Arr.map(section), Arr.join("\n\n"));
