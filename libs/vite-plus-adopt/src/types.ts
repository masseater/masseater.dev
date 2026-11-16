import type { UserConfig as CommitlintUserConfig } from "@commitlint/types";
import type { TextlintRcConfig } from "@textlint/config-loader";
import type { TextlintKernelRule } from "@textlint/kernel";
import type {
  Configuration as MarkdownlintConfiguration,
  Rule as MarkdownlintRule,
} from "markdownlint";
import type { defineConfig as defineSteigerConfig } from "steiger";

import type { DependencyField } from "./workspace.ts";

export interface CommitlintConfig extends Readonly<CommitlintUserConfig> {}

export type SteigerConfig = readonly ReturnType<typeof defineSteigerConfig>[number][];

export interface BetterleaksRule {
  readonly id: string;
  readonly description?: string;
  readonly keywords?: readonly string[];
  readonly regex?: string;
  readonly path?: string;
  readonly valueGroup?: number;
  readonly specificity?: number;
  readonly tags?: readonly string[];
  readonly skipReport?: boolean;
  readonly filter?: string;
  readonly confidence?: "low" | "medium" | "high";
  readonly validate?: string;
  readonly analyze?: string;
  readonly revoke?: string;
}

export interface BetterleaksConfig {
  readonly title?: string;
  readonly description?: string;
  readonly minVersion?: string;
  readonly prefilter?: string;
  readonly filter?: string;
  readonly extend?: Readonly<{
    useDefault?: boolean;
    path?: string;
    disabledRules?: readonly string[];
  }>;
  readonly rules?: readonly BetterleaksRule[];
  readonly ignoredSecrets?: readonly string[];
}

export type TextlintRuleOptions = NonNullable<TextlintKernelRule["options"]>;

export interface TextlintPreset {
  readonly rules: Readonly<Record<string, TextlintKernelRule["rule"]>>;
  readonly rulesConfig: Readonly<Record<string, TextlintRuleOptions>>;
}

export interface TextlintConfig extends TextlintRcConfig {
  readonly ignores?: readonly string[];
  readonly presets?: Readonly<Record<string, TextlintPreset>>;
}

export interface MarkdownlintConfig {
  readonly config?: MarkdownlintConfiguration;
  readonly customRules?: readonly MarkdownlintRule[];
  readonly ignores?: readonly string[];
}

export interface SteigerSection {
  readonly paths: readonly string[];
  readonly rules: SteigerConfig;
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
  readonly betterleaks?: BetterleaksConfig;
  readonly commitlint?: CommitlintConfig;
  readonly dependencyRules?: DependencyRules;
  readonly fallow?: FallowConfig;
  readonly markdownlint?: MarkdownlintConfig;
  readonly steiger?: SteigerSection;
  readonly textlint?: TextlintConfig;
}

declare module "vite" {
  interface UserConfig extends ToolSections {}
}

export type ToolSection = keyof ToolSections;
