import type { UserConfig as CommitlintUserConfig } from "@commitlint/types";
import type { H56mConfig } from "@r_masseater/h56m";
import type { TextlintRcConfig } from "@textlint/config-loader";
import type { TextlintKernelRule } from "@textlint/kernel";

import type { DependencyField } from "#/shared/lib/workspace.ts";

import type { SkillsSection } from "./skills.ts";

export interface CommitlintConfig extends Readonly<CommitlintUserConfig> {}

export type TextlintRuleOptions = NonNullable<TextlintKernelRule["options"]>;

export interface TextlintPreset {
  readonly rules: Readonly<Record<string, TextlintKernelRule["rule"]>>;
  readonly rulesConfig: Readonly<Record<string, TextlintRuleOptions>>;
}

export interface TextlintSource extends TextlintRcConfig {
  readonly files: readonly string[];
}

export interface TextlintConfig extends TextlintRcConfig {
  readonly ignores?: readonly string[];
  readonly presets?: Readonly<Record<string, TextlintPreset>>;
  readonly sources?: readonly TextlintSource[];
}

export type FallowConfig = Readonly<Record<string, unknown>>;

export type ManifestField = DependencyField;

export interface AllowedDependencies {
  readonly workspaces: readonly string[];
  readonly dependencies: readonly string[];
  readonly fields?: readonly ManifestField[];
}

export interface DependencyRules {
  readonly allowed?: Readonly<Record<string, AllowedDependencies>>;
  readonly banned?: Readonly<Record<string, readonly string[]>>;
  readonly exactDependencies?: Readonly<Record<string, readonly string[]>>;
  readonly peerRanges?: "identical" | "intersect";
}

export interface ToolSections {
  readonly commitlint?: CommitlintConfig;
  readonly dependencyRules?: DependencyRules;
  readonly fallow?: FallowConfig;
  readonly h56m?: H56mConfig;
  readonly skills?: SkillsSection;
  readonly textlint?: TextlintConfig;
}

declare module "vite" {
  interface UserConfig extends ToolSections {}
}

export type ToolSection = keyof ToolSections;
