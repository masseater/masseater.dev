import type { WismConfig } from "#/shared/config/index.ts";

declare module "vite" {
  interface UserConfig {
    readonly wism?: WismConfig;
  }
}
