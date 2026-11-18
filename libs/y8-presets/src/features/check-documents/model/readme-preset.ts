import { definePlugin } from "@r_masseater/y8";
import type { Plugin, Y8Config } from "@r_masseater/y8";

import { turned } from "#/features/check-documents/lib/preset.ts";
import type { RuleSet } from "#/features/check-documents/lib/preset.ts";

import {
  readmeAgentSkills,
  readmeApiSection,
  readmeLength,
  readmeNoFeatureList,
  readmeNoInlineProjectDocs,
  readmeNoMigration,
  readmeNoRequirements,
  readmeNoToc,
  readmeNoUnshippedLinks,
  readmeSummary,
  readmeTitle,
  readmeUsage,
} from "./readme-rules.ts";

const README: RuleSet = {
  plugin: "readme",
  rules: {
    title: readmeTitle,
    summary: readmeSummary,
    usage: readmeUsage,
    "agent-skills": readmeAgentSkills,
    "api-section": readmeApiSection,
    length: readmeLength,
    "no-toc": readmeNoToc,
    "no-feature-list": readmeNoFeatureList,
    "no-requirements": readmeNoRequirements,
    "no-migration": readmeNoMigration,
    "no-inline-project-docs": readmeNoInlineProjectDocs,
    "no-unshipped-links": readmeNoUnshippedLinks,
  },
};

export const readmePlugin: Plugin = definePlugin({ rules: README.rules });

export const readme = (): Y8Config => ({
  plugins: { [README.plugin]: readmePlugin },
  rules: turned("off")(README),
  overrides: [{ files: ["**/README.md"], rules: turned("error")(README) }],
});
