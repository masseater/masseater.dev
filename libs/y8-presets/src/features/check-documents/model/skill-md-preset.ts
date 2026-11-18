import { definePlugin } from "@r_masseater/y8";
import type { Plugin, Y8Config } from "@r_masseater/y8";

import {
  skillNameOptions,
  turned,
  whenGiven,
  withOptions,
} from "#/features/check-documents/lib/preset.ts";
import type { RuleSet, SkillNameOptions } from "#/features/check-documents/lib/preset.ts";
import { noShouting } from "#/features/check-documents/lib/shapes.ts";
import { noSkillNames } from "#/features/check-documents/lib/skill-names.ts";

import {
  skillDescriptionPerson,
  skillNoSteps,
  skillNoTimeSensitive,
  skillNoWhenSection,
  skillPurposeFirst,
  skillTitle,
  skillUsecases,
} from "./skill-rules.ts";

const SKILL: RuleSet = {
  plugin: "skill-md",
  rules: {
    title: skillTitle,
    "purpose-first": skillPurposeFirst,
    usecases: skillUsecases,
    "description-person": skillDescriptionPerson,
    "no-when-section": skillNoWhenSection,
    "no-steps": skillNoSteps,
    "no-time-sensitive": skillNoTimeSensitive,
    "no-skill-names": noSkillNames,
    "no-shouting": noShouting,
  },
};

export const skillMdPlugin: Plugin = definePlugin({ rules: SKILL.rules });

export interface SkillMdOptions {
  readonly purpose?: readonly string[];
  readonly usecases?: readonly string[];
  readonly skillNames?: SkillNameOptions;
}

const option = withOptions(SKILL.plugin);

export const skillMd = (options: SkillMdOptions = {}): Y8Config => ({
  plugins: { [SKILL.plugin]: skillMdPlugin },
  rules: turned("off")(SKILL),
  overrides: [
    {
      files: ["**/skills/*/SKILL.md"],
      rules: {
        ...turned("error")(SKILL),
        ...option("no-skill-names", skillNameOptions(options.skillNames ?? {})),
        ...whenGiven((headings) => option("purpose-first", { headings }))(options.purpose),
        ...whenGiven((headings) => option("usecases", { headings }))(options.usecases),
      },
    },
  ],
});
