import { agnix } from "@r_masseater/y8";
import type { RuleEntry, Y8Config } from "@r_masseater/y8";
import { docsPreset } from "@r_masseater/y8-docs";
import type { DocsPresetOptions } from "@r_masseater/y8-docs";

const INDEX_SKILL = "masseater-ecosystem";

const MASSEATER_DOCS: DocsPresetOptions = {
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
  readonly docs?: DocsPresetOptions;
}

export const markdownOf = ({ ignores = [], rules = {}, docs = {} }: MarkdownOptions): Y8Config => {
  const preset = docsPreset({
    ...MASSEATER_DOCS,
    ...docs,
    agents: { ...MASSEATER_DOCS.agents, ...docs.agents },
    skills: { ...MASSEATER_DOCS.skills, ...docs.skills },
  });
  return {
    ...preset,
    plugins: { ...preset.plugins, agnix },
    rules: { ...preset.rules, "agnix/XP-001": "off", ...rules },
    ignores: [...MARKDOWN_IGNORES, ...ignores],
  };
};
