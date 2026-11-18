import { definePlugin } from "@r_masseater/y8";
import type { Plugin, Y8Config } from "@r_masseater/y8";

import {
  skillNameOptions,
  turned,
  whenGiven,
  withOptions,
} from "#/features/check-documents/lib/preset.ts";
import type { RuleSet, Rules, SkillNameOptions } from "#/features/check-documents/lib/preset.ts";
import { noShouting } from "#/features/check-documents/lib/shapes.ts";
import { noSkillNames } from "#/features/check-documents/lib/skill-names.ts";

import {
  agentsCommands,
  agentsEnglish,
  agentsNoStructure,
  agentsOpening,
  agentsSections,
  agentsSkillOwned,
  agentsStackSentence,
  agentsTitle,
  agentsWorkspaceShape,
} from "./agents-rules.ts";
import { codePathExists } from "./code-path-rules.ts";
import { readmeLength } from "./readme-rules.ts";

const PLUGIN = "agents-md";
const ROOT_LINES = 100;
const WORKSPACE_LINES = 20;

const EVERY: RuleSet = {
  plugin: PLUGIN,
  rules: {
    title: agentsTitle,
    english: agentsEnglish,
    opening: agentsOpening,
    "skill-owned": agentsSkillOwned,
    "no-structure": agentsNoStructure,
    "no-skill-names": noSkillNames,
    "no-shouting": noShouting,
    length: readmeLength,
    "code-paths-exist": codePathExists,
  },
};

const ROOT: RuleSet = {
  plugin: PLUGIN,
  rules: {
    sections: agentsSections,
    commands: agentsCommands,
    "stack-sentence": agentsStackSentence,
  },
};

const WORKSPACE: RuleSet = { plugin: PLUGIN, rules: { "workspace-shape": agentsWorkspaceShape } };

export const agentsMdPlugin: Plugin = definePlugin({
  rules: { ...EVERY.rules, ...ROOT.rules, ...WORKSPACE.rules },
});

export interface AgentsMdOptions {
  readonly rootTitle?: string;
  readonly sections?: readonly (readonly string[])[];
  readonly commands?: readonly string[];
  readonly stack?: readonly string[];
  readonly skillNames?: SkillNameOptions;
}

const option = withOptions(PLUGIN);

const rootRules = ({ sections, commands, stack, rootTitle }: AgentsMdOptions): Rules => ({
  ...option("length", { max: ROOT_LINES }),
  ...whenGiven((value) => option("sections", { sections: value }))(sections),
  ...whenGiven((headings) => option("commands", { headings }))(commands),
  ...whenGiven((headings) => option("stack-sentence", { headings }))(stack),
  ...whenGiven((value) => option("title", { rootTitle: value }))(rootTitle),
});

export const agentsMd = (options: AgentsMdOptions = {}): Y8Config => ({
  plugins: { [PLUGIN]: agentsMdPlugin },
  rules: { ...turned("off")(EVERY), ...turned("off")(ROOT), ...turned("off")(WORKSPACE) },
  overrides: [
    {
      files: ["**/AGENTS.md", "**/CLAUDE.md"],
      rules: {
        ...turned("error")(EVERY),
        ...option("length", { max: WORKSPACE_LINES }),
        ...option("no-skill-names", skillNameOptions(options.skillNames ?? {})),
        ...turned("error")(WORKSPACE),
      },
    },
    {
      files: ["AGENTS.md", "CLAUDE.md"],
      rules: { ...turned("off")(WORKSPACE), ...turned("error")(ROOT), ...rootRules(options) },
    },
  ],
});
