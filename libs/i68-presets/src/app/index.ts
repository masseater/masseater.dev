import type { I68Config } from "@r_masseater/i68";

import { harmony } from "#/features/check-harmony/index.ts";
import { pop } from "#/features/check-pop/index.ts";
import type { PopOptions } from "#/features/check-pop/index.ts";

export { classical, classicalPlugin } from "#/features/check-classical/index.ts";
export { DEFAULT_RANGES, pop, popPlugin } from "#/features/check-pop/index.ts";
export type { PopOptions, Range, Ranges } from "#/features/check-pop/index.ts";
export {
  PROGRESSIONS,
  progressions,
  progressionsPlugin,
} from "#/features/check-progressions/index.ts";
export type { Progression } from "#/features/check-progressions/index.ts";
export { bach, bachPlugin, stylePluginOf } from "#/features/check-style/index.ts";
export { styleRules, styleRulesPluginOf } from "#/features/check-habits/index.ts";
export type { StyleRulesPreset } from "#/features/check-habits/index.ts";
export { HABIT_KINDS, StyleRulesSchema } from "#/shared/lib/style-rules.ts";
export type { HabitKind, HabitRule, StyleRules } from "#/shared/lib/style-rules.ts";
export type { StyleTable, Transitions } from "#/shared/lib/style-table.ts";
export { harmony, harmonyPlugin } from "#/features/check-harmony/index.ts";

export const recommended = (options: PopOptions = {}): I68Config => ({
  extends: [pop(options), harmony()],
});
