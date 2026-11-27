import { Schema } from "effect";

export const HABIT_KINDS = ["keep", "fix", "suggest"] as const;

export type HabitKind = (typeof HABIT_KINDS)[number];

export const HabitRuleSchema = Schema.Struct({
  context: Schema.String,
  next: Schema.String,
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
