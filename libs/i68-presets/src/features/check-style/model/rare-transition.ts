import { defineRule } from "@r_masseater/i68";
import type { Rule } from "@r_masseater/i68";
import { Array as Arr, Number as Num, Option, Record as Rec, pipe } from "effect";

import { progressionOf } from "#/shared/lib/degrees.ts";
import type { Step } from "#/shared/lib/degrees.ts";
import { numberOption } from "#/shared/lib/options.ts";
import { reporterOf } from "#/shared/lib/voices.ts";
import type { Reporter } from "#/shared/lib/voices.ts";

import type { StyleTable } from "./table.ts";

const DEFAULT_SHARE = 0.03;
const DEFAULT_SEEN = 8;
const PERCENT = 100;
const SUGGESTIONS = 3;
const FIRST = 1;
const NEVER = 0;
const minShare = numberOption({ key: "share", fallback: DEFAULT_SHARE });
const minSeen = numberOption({ key: "seen", fallback: DEFAULT_SEEN });

interface Context {
  readonly words: string;
  readonly next: Readonly<Record<string, number>>;
  readonly total: number;
}

const percentOf = (count: number, total: number): string =>
  `${String(Math.round((count / total) * PERCENT))}%`;

const contextOf =
  (table: StyleTable, seen: number, before: readonly Step[]) =>
  (length: number): Option.Option<Context> => {
    const words = pipe(
      Arr.takeRight(before, length),
      Arr.map((step) => step.token),
      Arr.join(" "),
    );
    return pipe(
      Rec.get(table.transitions, words),
      Option.map((next) => ({ words, next, total: Num.sumAll(Rec.values(next)) })),
      Option.filter((context) => context.total >= seen),
    );
  };

const longestContext = (
  table: StyleTable,
  seen: number,
  before: readonly Step[],
): Option.Option<Context> =>
  pipe(
    Arr.range(FIRST, Math.min(table.order, before.length)),
    Arr.reverse,
    Arr.findFirst(contextOf(table, seen, before)),
  );

const suggestionsOf = (context: Context): string =>
  pipe(
    Rec.toEntries(context.next),
    Arr.sortWith(([, count]) => -count, Num.Order),
    Arr.take(SUGGESTIONS),
    Arr.map(([token, count]) => `${token} (${percentOf(count, context.total)})`),
    Arr.join(", "),
  );

interface Limits {
  readonly share: number;
  readonly seen: number;
}

const checkStep =
  (report: Reporter, table: StyleTable, { share, seen }: Limits) =>
  (steps: readonly Step[], index: number): void => {
    const before = Arr.take(steps, index);
    for (const step of Option.toArray(Arr.get(steps, index))) {
      for (const context of Option.toArray(longestContext(table, seen, before))) {
        const count = Option.getOrElse(Rec.get(context.next, step.token), () => NEVER);
        if (count / context.total < share) {
          report(`${String(step.line)}:${step.token}:${String(index)}`, {
            line: step.line,
            column: step.column,
            message: `${context.words} → ${step.token} is rare in ${table.name} (${percentOf(count, context.total)})`,
            detail: `${table.name} usually goes to ${suggestionsOf(context)}`,
          });
        }
      }
    }
  };

export const rareTransitionOf = (table: StyleTable): Rule =>
  defineRule({
    meta: { description: `Chord changes follow what ${table.name} usually does next` },
    check: (context) => {
      const steps = progressionOf(context.soundings)(context.song);
      const check = checkStep(reporterOf(context), table, {
        share: minShare(context.options),
        seen: minSeen(context.options),
      });
      const indices = Arr.makeBy(steps.length, (at) => at);
      for (const index of Arr.drop(indices, FIRST)) {
        check(steps, index);
      }
    },
  });
