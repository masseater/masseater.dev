import { definePlugin } from "@r_masseater/i68";
import type { I68Config, Plugin } from "@r_masseater/i68";

import type { StyleRules } from "#/shared/lib/style-rules.ts";

import { habitRuleOf } from "./habit-rule.ts";

export const styleRulesPluginOf = (rules: StyleRules): Plugin =>
  definePlugin({
    rules: {
      keep: habitRuleOf({ rules, kind: "keep" }),
      fix: habitRuleOf({ rules, kind: "fix" }),
      suggest: habitRuleOf({ rules, kind: "suggest" }),
    },
  });

export type StyleRulesPreset = Readonly<{ plugin: string; rules: StyleRules }>;

export const styleRules = ({ plugin, rules }: StyleRulesPreset): I68Config => ({
  plugins: { [plugin]: styleRulesPluginOf(rules) },
  rules: {
    [`${plugin}/keep`]: "warn",
    [`${plugin}/fix`]: "error",
    [`${plugin}/suggest`]: "warn",
  },
});
