import type { H56mConfig } from "#/shared/config/index.ts";

declare module "vite" {
  interface UserConfig {
    readonly h56m?: H56mConfig;
  }
}
