import type { Fu4Config } from "@r_masseater/fu4";
import type { H56mConfig } from "@r_masseater/h56m";
import type { WismConfig } from "@r_masseater/wism";
import type { Y8Config } from "@r_masseater/y8";
import type { OxlintOverride } from "vite-plus/lint";

export type { ToolSections } from "@r_masseater/vite-plus-adopt";

export type InstallSize = `${number} ${"B" | "kB" | "MB"}`;

export interface PublishSettings {
  readonly installSize: InstallSize;
}

export interface WorkspaceLintOverride {
  readonly files: readonly string[];
  readonly excludeFiles?: readonly string[];
  readonly rules?: OxlintOverride["rules"];
  readonly use?: readonly string[];
}

export interface WorkspaceLintSettings {
  readonly ignorePatterns?: readonly string[];
  readonly overrides?: readonly WorkspaceLintOverride[];
}

export interface DevDependencyAllowance {
  readonly use?: readonly string[];
  readonly dependencies?: readonly string[];
}

export interface CommentSettings {
  readonly allow: readonly string[];
}

export interface MschConfig {
  readonly comments?: CommentSettings;
  readonly publish?: PublishSettings;
  readonly lint?: WorkspaceLintSettings;
  readonly devDependencies?: Readonly<Record<string, DevDependencyAllowance>>;
  readonly workspaceAgentsMd?: true;
}

declare module "vite" {
  interface UserConfig {
    readonly msch?: MschConfig;
    readonly fu4?: Fu4Config;
    readonly h56m?: H56mConfig;
    readonly wism?: WismConfig;
    readonly y8?: Y8Config;
  }
}
