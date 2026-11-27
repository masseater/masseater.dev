import BACH_CHORALES from "#/features/check-style/data/bach-chorales.json" with { type: "json" };
import type { StyleTable } from "#/shared/lib/style-table.ts";

export {
  DEFAULT_LIMITS,
  UnreadableSong,
  habitsOf,
  styleSongFromText,
} from "#/features/find-habits/index.ts";
export type {
  Habit,
  HabitInput,
  HabitLimits,
  Place,
  SongText,
  StyleSong,
} from "#/features/find-habits/index.ts";
export { StyleTableSchema } from "#/shared/lib/style-table.ts";
export type { StyleTable } from "#/shared/lib/style-table.ts";

export const BACH_TABLE: StyleTable = BACH_CHORALES;
