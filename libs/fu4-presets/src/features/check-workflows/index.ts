import { definePlugin } from "@r_masseater/fu4";

import { expression } from "./model/rules/expression.ts";
import { JOB_RULES } from "./model/rules/job-rules.ts";
import { STEP_RULES } from "./model/rules/step-rules.ts";
import { syntaxCheck } from "./model/rules/syntax-check.ts";
import { TRIGGER_RULES } from "./model/rules/trigger-rules.ts";
import { WORKFLOW_RULES } from "./model/rules/workflow-rules.ts";

export const actionlintPlugin = definePlugin({
  rules: {
    "syntax-check": syntaxCheck,
    ...WORKFLOW_RULES,
    ...TRIGGER_RULES,
    ...JOB_RULES,
    ...STEP_RULES,
    expression,
  },
});
