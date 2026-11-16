import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { Amount, Automation } from "#/entities/song/song.ts";
import {
  barsOf,
  decibelsOf,
  hertzOf,
  millisecondsOf,
  semitonesOf,
  shareOf,
} from "#/shared/lib/units.ts";
import type { Amount as AmountNode, Automation as AutomationNode } from "#generated/langium/ast.ts";

import type { From } from "./problem.ts";

const UNITS = [
  { suffix: "Hz", unit: "hertz", read: hertzOf },
  { suffix: "dB", unit: "decibels", read: decibelsOf },
  { suffix: "%", unit: "share", read: shareOf },
  { suffix: "ms", unit: "milliseconds", read: millisecondsOf },
  { suffix: "st", unit: "semitones", read: semitonesOf },
] as const;

const amountOf: From<AmountNode, Amount> = (node) => {
  const { value } = node;
  if (typeof value === "number") {
    return { unit: "number", value };
  }
  return pipe(
    UNITS,
    Arr.findFirst(({ suffix }) => Str.endsWith(suffix)(value)),
    Option.match({
      onNone: () => ({ unit: "number", value: Number(value) }),
      onSome: ({ unit, read }) => ({ unit, value: read(value) }),
    }),
  );
};

export const automationOf =
  (where: Pick<Automation, "bar" | "start">): From<AutomationNode, Automation> =>
  (node) => ({
    ...where,
    target: node.target.$refText,
    parameter: node.parameter,
    from: amountOf(node.from),
    to: amountOf(node.to),
    bars: barsOf(node.span),
    curve: node.curve ?? "linear",
  });
