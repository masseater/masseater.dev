import type { Rule } from "@r_masseater/fu4";

import { action } from "./action.ts";

export const STEP_RULES: Readonly<Record<string, Rule>> = {
  action,
};
