type InstallSize = `${number} ${"B" | "kB" | "MB"}`;

interface PublishSettings {
  readonly installSize: InstallSize;
}

interface MschConfig {
  readonly publish?: PublishSettings;
  readonly workspaceAgentsMd?: true;
}

declare module "vite" {
  interface UserConfig {
    readonly msch?: MschConfig;
  }
}

export type { InstallSize, MschConfig, PublishSettings };
