interface MschConfig {
  readonly readme?: boolean;
}

declare module "vite" {
  interface UserConfig {
    readonly msch?: MschConfig;
  }
}

export type { MschConfig };
