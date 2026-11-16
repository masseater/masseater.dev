import remotion from "@r_masseater/oxlint-typed-rules/remotion";

import { allRulesOf } from "./lint.config.ts";

export const remotionRules = allRulesOf({ prefix: "@remotion", rules: remotion.rules });
