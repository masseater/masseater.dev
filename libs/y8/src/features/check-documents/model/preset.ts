import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import { agnix, definePlugin } from "#/entities/rule/index.ts";
import { noShouting } from "#/features/check-documents/lib/shapes.ts";
import { noSkillNames } from "#/features/check-documents/lib/skill-names.ts";
import type { Override, Plugin, Rule, RuleEntry, Y8Config } from "#/shared/config/index.ts";

import {
  agentsCommands,
  agentsNoStructure,
  agentsOpening,
  agentsSections,
  agentsEnglish,
  agentsSkillOwned,
  agentsStackSentence,
  agentsTitle,
  agentsWorkspaceShape,
} from "./agents-rules.ts";
import {
  linkForwardSlash,
  linkTargetExists,
  noEmail,
  noLocalPath,
  noPlaceholder,
} from "./general-rules.ts";
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
import {
  skillDescriptionPerson,
  skillNoSteps,
  skillNoTimeSensitive,
  skillNoWhenSection,
  skillPurposeFirst,
  skillTitle,
  skillUsecases,
} from "./skill-rules.ts";

const PLUGIN = "docs";
const AGNIX = "agnix";
const SEPARATOR = "/";
const ROOT_AGENTS_LINES = 100;
const WORKSPACE_AGENTS_LINES = 20;

const GENERAL: Readonly<Record<string, Rule>> = {
  "link-target-exists": linkTargetExists,
  "link-forward-slash": linkForwardSlash,
  "no-local-path": noLocalPath,
  "no-email": noEmail,
  "no-placeholder": noPlaceholder,
};

const README: Readonly<Record<string, Rule>> = {
  "readme-title": readmeTitle,
  "readme-summary": readmeSummary,
  "readme-usage": readmeUsage,
  "readme-agent-skills": readmeAgentSkills,
  "readme-api-section": readmeApiSection,
  "readme-length": readmeLength,
  "readme-no-toc": readmeNoToc,
  "readme-no-feature-list": readmeNoFeatureList,
  "readme-no-requirements": readmeNoRequirements,
  "readme-no-migration": readmeNoMigration,
  "readme-no-inline-project-docs": readmeNoInlineProjectDocs,
  "readme-no-unshipped-links": readmeNoUnshippedLinks,
};

const AGENTS: Readonly<Record<string, Rule>> = {
  "agents-title": agentsTitle,
  "agents-english": agentsEnglish,
  "agents-opening": agentsOpening,
  "agents-skill-owned": agentsSkillOwned,
  "agents-no-structure": agentsNoStructure,
  "agents-no-skill-names": noSkillNames,
  "agents-no-shouting": noShouting,
  "agents-length": readmeLength,
};

const ROOT_AGENTS: Readonly<Record<string, Rule>> = {
  "agents-sections": agentsSections,
  "agents-commands": agentsCommands,
  "agents-stack-sentence": agentsStackSentence,
};

const WORKSPACE_AGENTS: Readonly<Record<string, Rule>> = {
  "agents-workspace-shape": agentsWorkspaceShape,
};

const SKILL: Readonly<Record<string, Rule>> = {
  "skill-title": skillTitle,
  "skill-purpose-first": skillPurposeFirst,
  "skill-usecases": skillUsecases,
  "skill-description-person": skillDescriptionPerson,
  "skill-no-when-section": skillNoWhenSection,
  "skill-no-steps": skillNoSteps,
  "skill-no-time-sensitive": skillNoTimeSensitive,
  "skill-no-skill-names": noSkillNames,
  "skill-no-shouting": noShouting,
};

export const docsPlugin: Plugin = definePlugin({
  rules: { ...GENERAL, ...README, ...AGENTS, ...ROOT_AGENTS, ...WORKSPACE_AGENTS, ...SKILL },
});

export const recommendedMarkdownRules: Readonly<Record<string, RuleEntry>> = {
  "markdownlint/MD013": "off",
  "markdownlint/MD034": "off",
  "markdownlint/MD060": "off",
  "markdownlint/MD024": ["error", { siblings_only: true }],
  "markdownlint/MD026": ["error", { punctuation: ".,;:。，；：" }],
};

export interface SkillNameOptions {
  readonly index?: string;
  readonly names?: readonly string[];
}

export interface DocsPresetOptions {
  readonly agents?: {
    readonly rootTitle?: string;
    readonly sections?: readonly (readonly string[])[];
    readonly commands?: readonly string[];
    readonly stack?: readonly string[];
    readonly skillNames?: SkillNameOptions;
  };
  readonly skills?: {
    readonly purpose?: readonly string[];
    readonly usecases?: readonly string[];
    readonly skillNames?: SkillNameOptions;
  };
  readonly emails?: readonly string[];
  readonly agnix?: Readonly<Record<string, RuleEntry>>;
}

type Rules = Readonly<Record<string, RuleEntry>>;

const idOf = (name: string): string => `${PLUGIN}${SEPARATOR}${name}`;

const turned = (rules: Readonly<Record<string, Rule>>, entry: RuleEntry): Rules =>
  pipe(
    Rec.keys(rules),
    Arr.map((name): readonly [string, RuleEntry] => [idOf(name), entry]),
    Rec.fromEntries,
  );

const withOptions = (name: string, options: Readonly<Record<string, unknown>>): Rules => ({
  [idOf(name)]: ["error", options],
});

const whenGiven = <Value>(value: Value | undefined, build: (value: Value) => Rules): Rules =>
  pipe(Option.fromNullishOr(value), Option.match({ onNone: (): Rules => ({}), onSome: build }));

const skillNameRule = (name: string, { index, names = [] }: SkillNameOptions): Rules =>
  withOptions(name, {
    names,
    allow: Option.toArray(Option.fromNullishOr(index)),
    ...pipe(
      Option.fromNullishOr(index),
      Option.match({
        onNone: (): Readonly<Record<string, unknown>> => ({}),
        onSome: (value): Readonly<Record<string, unknown>> => ({ index: value }),
      }),
    ),
  });

type AgentsOptions = NonNullable<DocsPresetOptions["agents"]>;

const rootAgents = ({ sections, commands, stack, rootTitle }: AgentsOptions): Rules => ({
  ...withOptions("agents-length", { max: ROOT_AGENTS_LINES }),
  ...whenGiven(sections, (value) => withOptions("agents-sections", { sections: value })),
  ...whenGiven(commands, (headings) => withOptions("agents-commands", { headings })),
  ...whenGiven(stack, (headings) => withOptions("agents-stack-sentence", { headings })),
  ...whenGiven(rootTitle, (value) => withOptions("agents-title", { rootTitle: value })),
});

export const docsPreset = (options: DocsPresetOptions = {}): Y8Config => {
  const { agents = {}, skills = {} } = options;
  const overrides: readonly Override[] = [
    { files: ["**/README.md"], rules: turned(README, "error") },
    {
      files: ["**/AGENTS.md", "**/CLAUDE.md"],
      rules: {
        ...turned(AGENTS, "error"),
        ...withOptions("agents-length", { max: WORKSPACE_AGENTS_LINES }),
        ...skillNameRule("agents-no-skill-names", agents.skillNames ?? {}),
        ...turned(WORKSPACE_AGENTS, "error"),
      },
    },
    {
      files: ["AGENTS.md", "CLAUDE.md"],
      rules: { ...turned(WORKSPACE_AGENTS, "off"), ...rootAgents(agents) },
    },
    {
      files: ["**/skills/*/SKILL.md"],
      rules: {
        ...turned(SKILL, "error"),
        ...skillNameRule("skill-no-skill-names", skills.skillNames ?? {}),
        ...whenGiven(skills.purpose, (headings) =>
          withOptions("skill-purpose-first", { headings }),
        ),
        ...whenGiven(skills.usecases, (headings) => withOptions("skill-usecases", { headings })),
      },
    },
  ];
  return {
    plugins: { [PLUGIN]: docsPlugin, [AGNIX]: agnix },
    rules: {
      ...recommendedMarkdownRules,
      ...turned({ ...README, ...AGENTS, ...ROOT_AGENTS, ...WORKSPACE_AGENTS, ...SKILL }, "off"),
      ...turned(GENERAL, "error"),
      ...whenGiven(options.emails, (allow) => withOptions("no-email", { allow })),
      [`${AGNIX}${SEPARATOR}XP-001`]: "off",
      ...options.agnix,
    },
    overrides,
  };
};
