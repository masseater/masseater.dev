import { diagnosticDetail, lint, markdownPathspecs, y8Section } from "@r_masseater/y8";

import { checkSection } from "#/shared/lib/section-check.ts";

export const checkMarkdown = checkSection({
  name: "checkMarkdown",
  rule: "markdown",
  pick: y8Section,
  pathspecs: (config) => markdownPathspecs({ config }),
  lint,
  detail: diagnosticDetail,
});
