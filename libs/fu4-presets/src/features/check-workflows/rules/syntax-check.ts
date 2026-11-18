import { defineRule } from "@r_masseater/fu4";

import { workflowOf } from "#/entities/workflow/index.ts";

export const syntaxCheck = defineRule({
  meta: {
    description: "Reports workflow files that GitHub Actions cannot load",
    docs: "https://github.com/rhysd/actionlint/blob/main/docs/checks.md#check-syntax",
  },
  check: (context) => {
    for (const problem of workflowOf(context.source).errors) {
      context.report(problem);
    }
  },
});
