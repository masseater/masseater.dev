import type { UserConfig } from "vite-plus";

type LintRules = NonNullable<NonNullable<UserConfig["lint"]>["rules"]>;

export const webGuidanceRules = {
  "jsx-a11y/no-redundant-roles": ["error", { ul: ["list"], ol: ["list"] }],
  "jsx-a11y/no-noninteractive-tabindex": ["error", { tags: ["section"], roles: ["tabpanel"] }],
} satisfies LintRules;
