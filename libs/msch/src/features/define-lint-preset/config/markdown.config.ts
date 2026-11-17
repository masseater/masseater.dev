import { docsPreset } from "@r_masseater/y8";
import type { DocsPresetOptions, RuleEntry, Y8Config } from "@r_masseater/y8";

const INDEX_SKILL = "masseater-ecosystem";

const MASSEATER_DOCS: DocsPresetOptions = {
  agents: {
    sections: [
      ["Tech stack", "テックスタック"],
      ["Commands", "コマンド"],
      ["Rules", "ルール"],
    ],
    commands: ["Commands", "コマンド"],
    stack: ["Tech stack", "テックスタック"],
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
    rules: { ...preset.rules, ...rules },
    ignores: [...MARKDOWN_IGNORES, ...ignores],
  };
};
