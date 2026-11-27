import { defineRule } from "@r_masseater/i68";
import type { Rule } from "@r_masseater/i68";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { progressionOf } from "#/shared/lib/degrees.ts";
import type { Step } from "#/shared/lib/degrees.ts";
import type { HabitKind, HabitRule, StyleRules } from "#/shared/lib/style-rules.ts";
import { reporterOf } from "#/shared/lib/voices.ts";

const FIRST = 1;

type Wording = Readonly<{
  description: (name: string) => string;
  breaks: (habit: HabitRule, next: string) => boolean;
  message: (name: string, habit: HabitRule) => string;
}>;

const WORDINGS: Readonly<Record<HabitKind, Wording>> = {
  keep: {
    description: (name) => `Chord changes keep the habits of ${name}`,
    breaks: (habit, next) => habit.next !== next,
    message: (name, habit) => `${name} goes ${habit.context} → ${habit.next} here`,
  },
  fix: {
    description: (name) => `Chord changes avoid the habits ${name} is fixing`,
    breaks: (habit, next) => habit.next === next,
    message: (name, habit) => `${habit.context} → ${habit.next} is a habit ${name} is fixing`,
  },
  suggest: {
    description: (name) => `Chord changes that would fit ${name}`,
    breaks: (habit, next) => habit.next !== next,
    message: (name, habit) => `${habit.context} → ${habit.next} would fit ${name} here`,
  },
};

const follows = (before: readonly Step[], context: string): boolean => {
  const words = Str.split(" ")(context);
  return (
    before.length >= words.length &&
    pipe(
      Arr.takeRight(before, words.length),
      Arr.map((step) => step.token),
      Arr.join(" "),
    ) === context
  );
};

const detailOf = (habit: HabitRule): string =>
  pipe(
    Option.fromNullishOr(habit.reason),
    Option.match({
      onNone: () => habit.aim,
      onSome: (reason) => `${habit.aim}: ${reason}`,
    }),
  );

export type HabitRuleInput = Readonly<{ rules: StyleRules; kind: HabitKind }>;

export const habitRuleOf = ({ rules, kind }: HabitRuleInput): Rule => {
  const wording = WORDINGS[kind];
  const habits = pipe(
    rules.habits,
    Arr.filter((habit) => habit.kind === kind),
  );
  return defineRule({
    meta: { description: wording.description(rules.name) },
    check: (context) => {
      const report = reporterOf(context);
      const steps = progressionOf(context.soundings)(context.song);
      for (const index of Arr.drop(
        Arr.makeBy(steps.length, (at) => at),
        FIRST,
      )) {
        const step = Arr.getUnsafe(steps, index);
        const before = Arr.take(steps, index);
        for (const habit of habits) {
          if (follows(before, habit.context) && wording.breaks(habit, step.token)) {
            report(`${String(index)}:${habit.context}:${habit.next}`, {
              line: step.line,
              column: step.column,
              message: wording.message(rules.name, habit),
              detail: detailOf(habit),
            });
          }
        }
      }
    },
  });
};
