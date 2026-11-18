import { definePlugin } from "@r_masseater/fu4";

import { expression } from "./rules/expression.ts";
import { JOB_RULES } from "./rules/job-rules.ts";
import { STEP_RULES } from "./rules/step-rules.ts";
import { syntaxCheck } from "./rules/syntax-check.ts";
import { TRIGGER_RULES } from "./rules/trigger-rules.ts";
import { WORKFLOW_RULES } from "./rules/workflow-rules.ts";

export const actionlint = definePlugin({
  rules: {
    "syntax-check": syntaxCheck,
    ...WORKFLOW_RULES,
    ...TRIGGER_RULES,
    ...JOB_RULES,
    ...STEP_RULES,
    expression,
  },
});
