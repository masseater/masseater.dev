import { fu4Section, lint, workflowPathspecs } from "@r_masseater/fu4";

import { checkSection } from "#/shared/lib/section-check.ts";

export const checkWorkflowLint = checkSection({
  name: "checkWorkflowLint",
  rule: "workflow-lint",
  pick: fu4Section,
  pathspecs: (config) => workflowPathspecs({ config }),
  lint,
  detail: () => "",
});
