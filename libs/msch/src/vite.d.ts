interface MschConfig {
  readonly publish?: boolean;
}

declare module "vite" {
  interface UserConfig {
    readonly msch?: MschConfig;
  }
}

export type { MschConfig };
