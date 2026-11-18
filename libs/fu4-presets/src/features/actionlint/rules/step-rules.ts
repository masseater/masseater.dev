import type { Rule } from "@r_masseater/fu4";

import { action } from "./action.ts";
import { shellcheck } from "./shellcheck.ts";

export const STEP_RULES: Readonly<Record<string, Rule>> = {
  action,
  shellcheck,
};
