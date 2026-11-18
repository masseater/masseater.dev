import type { RuleEntry, Y8Config } from "@r_masseater/y8";
import { recommended } from "@r_masseater/y8-presets";
import type { RecommendedOptions } from "@r_masseater/y8-presets";

const INDEX_SKILL = "masseater-ecosystem";

const MASSEATER_DOCS: RecommendedOptions = {
  agents: {
    sections: [["Tech stack"], ["Commands"], ["Rules"]],
    commands: ["Commands"],
    stack: ["Tech stack"],
    skillNames: { index: INDEX_SKILL },
  },
  skills: { skillNames: { index: INDEX_SKILL } },
};

const MARKDOWN_IGNORES = [
  ".agents/skills/**",
  "**/fixtures/**",
  "**/upstream/**",
  "CHANGELOG.md",
  "**/CLAUDE.md",
];

export interface MarkdownOptions {
  readonly ignores?: readonly string[];
  readonly rules?: Readonly<Record<string, RuleEntry>>;
  readonly docs?: RecommendedOptions;
}

export const markdownOf = ({ ignores = [], rules = {}, docs = {} }: MarkdownOptions): Y8Config => ({
  extends: [
    recommended({
      ...MASSEATER_DOCS,
      ...docs,
      agents: { ...MASSEATER_DOCS.agents, ...docs.agents },
      skills: { ...MASSEATER_DOCS.skills, ...docs.skills },
    }),
  ],
  rules: { "agnix/XP-001": "off", ...rules },
  ignores: [...MARKDOWN_IGNORES, ...ignores],
});
