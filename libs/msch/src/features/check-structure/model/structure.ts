import { lint, wismPathspecs, wismSection } from "@r_masseater/wism";

import { checkSection } from "#/shared/lib/section-check.ts";

export const checkStructure = checkSection({
  name: "checkStructure",
  rule: "structure",
  pick: wismSection,
  pathspecs: (config) => wismPathspecs({ config }),
  lint,
  detail: () => "",
});
