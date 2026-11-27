import { defineRule } from "@r_masseater/i68";
import type { Rule } from "@r_masseater/i68";
import { Array as Arr, Option, pipe } from "effect";

import { subjectKeyOf } from "#/shared/lib/style-rules.ts";
import type { HabitKind, HabitRule, StyleRules } from "#/shared/lib/style-rules.ts";
import { reporterOf } from "#/shared/lib/voices.ts";

import { occasionsOf } from "./occasions.ts";

type Wording = Readonly<{
  description: (name: string) => string;
  reportsWhen: boolean;
  message: (name: string, key: string) => string;
}>;

const WORDINGS: Readonly<Record<HabitKind, Wording>> = {
  keep: {
    description: (name) => `Songs keep the habits of ${name}`,
    reportsWhen: false,
    message: (name, key) => `${name} keeps ${key} here`,
  },
  fix: {
    description: (name) => `Songs avoid the habits ${name} is fixing`,
    reportsWhen: true,
    message: (name, key) => `${key} is a habit ${name} is fixing`,
  },
  suggest: {
    description: (name) => `Habits that would fit ${name}`,
    reportsWhen: false,
    message: (name, key) => `${key} would fit ${name} here`,
  },
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
      for (const habit of habits) {
        const key = subjectKeyOf(habit.habit);
        for (const occasion of occasionsOf(context)(habit.habit)) {
          if (occasion.holds === wording.reportsWhen) {
            report(`${key}:${occasion.id}`, {
              line: occasion.line,
              column: occasion.column,
              message: wording.message(rules.name, key),
              detail: detailOf(habit),
            });
          }
        }
      }
    },
  });
};
