import { agnix } from "@r_masseater/y8";
import type { Y8Config } from "@r_masseater/y8";

import { agentsMd } from "./agents-md-preset.ts";
import type { AgentsMdOptions } from "./agents-md-preset.ts";
import { documents } from "./documents-preset.ts";
import type { DocumentsOptions } from "./documents-preset.ts";
import { readme } from "./readme-preset.ts";
import { skillMd } from "./skill-md-preset.ts";
import type { SkillMdOptions } from "./skill-md-preset.ts";

export const markdownStyle = (): Y8Config => ({
  rules: {
    "markdownlint/MD013": "off",
    "markdownlint/MD034": "off",
    "markdownlint/MD060": "off",
    "markdownlint/MD024": ["error", { siblings_only: true }],
    "markdownlint/MD026": ["error", { punctuation: ".,;:。，；：" }],
  },
});

export const agentConfig = (): Y8Config => ({ plugins: { agnix } });

export interface RecommendedOptions extends DocumentsOptions {
  readonly agents?: AgentsMdOptions;
  readonly skills?: SkillMdOptions;
}

export const recommended = (options: RecommendedOptions = {}): Y8Config => ({
  extends: [
    markdownStyle(),
    documents(options),
    readme(),
    agentsMd(options.agents),
    skillMd(options.skills),
    agentConfig(),
  ],
});
