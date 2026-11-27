import { Match, Schema } from "effect";

import { MixHabitSchema, mixKeyOf } from "./mix-habit.ts";

export const HABIT_KINDS = ["keep", "fix", "suggest"] as const;

export type HabitKind = (typeof HABIT_KINDS)[number];

export const ChordHabitSchema = Schema.Struct({
  type: Schema.Literal("chord"),
  context: Schema.String,
  next: Schema.String,
});

export const SubjectSchema = Schema.Union([ChordHabitSchema, MixHabitSchema]);

export type Subject = typeof SubjectSchema.Type;

export const HabitRuleSchema = Schema.Struct({
  habit: SubjectSchema,
  kind: Schema.Literals(HABIT_KINDS),
  aim: Schema.String,
  reason: Schema.optionalKey(Schema.String),
});

export type HabitRule = typeof HabitRuleSchema.Type;

export const StyleRulesSchema = Schema.Struct({
  name: Schema.String,
  habits: Schema.Array(HabitRuleSchema),
});

export type StyleRules = typeof StyleRulesSchema.Type;

export const subjectKeyOf = (subject: Subject): string =>
  Match.value(subject).pipe(
    Match.when({ type: "chord" }, (chord) => `${chord.context} → ${chord.next}`),
    Match.orElse(mixKeyOf),
  );
