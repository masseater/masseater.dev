import BACH_CHORALES from "#/features/check-style/data/bach-chorales.json" with { type: "json" };
import type { StyleTable } from "#/shared/lib/style-table.ts";

export {
  DEFAULT_LIMITS,
  UnreadableSong,
  habitsOf,
  mixHabitsOf,
  styleSongFromText,
} from "#/features/find-habits/index.ts";
export type {
  Habit,
  HabitInput,
  HabitLimits,
  MixHabitFound,
  Place,
  SongText,
  StyleSong,
} from "#/features/find-habits/index.ts";
export {
  HABIT_KINDS,
  StyleRulesSchema,
  SubjectSchema,
  subjectKeyOf,
} from "#/shared/lib/style-rules.ts";
export type { HabitKind, HabitRule, StyleRules, Subject } from "#/shared/lib/style-rules.ts";
export { mixKeyOf } from "#/shared/lib/mix-habit.ts";
export type { MixHabit } from "#/shared/lib/mix-habit.ts";
export { StyleTableSchema } from "#/shared/lib/style-table.ts";
export type { StyleTable } from "#/shared/lib/style-table.ts";

export const BACH_TABLE: StyleTable = BACH_CHORALES;
