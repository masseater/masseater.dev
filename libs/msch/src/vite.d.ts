import type { OxlintOverride } from "vite-plus/lint";

type InstallSize = `${number} ${"B" | "kB" | "MB"}`;

interface PublishSettings {
  readonly installSize: InstallSize;
}

interface WorkspaceLintOverride {
  readonly files: readonly string[];
  readonly excludeFiles?: readonly string[];
  readonly rules?: OxlintOverride["rules"];
  readonly use?: readonly string[];
}

interface WorkspaceLintSettings {
  readonly ignorePatterns?: readonly string[];
  readonly overrides?: readonly WorkspaceLintOverride[];
}

interface MschConfig {
  readonly publish?: PublishSettings;
  readonly lint?: WorkspaceLintSettings;
}

declare module "vite" {
  interface UserConfig {
    readonly msch?: MschConfig;
  }
}

export type {
  InstallSize,
  MschConfig,
  PublishSettings,
  WorkspaceLintOverride,
  WorkspaceLintSettings,
};
