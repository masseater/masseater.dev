import type { Y8Config } from "#/shared/config/index.ts";

declare module "vite" {
  interface UserConfig {
    readonly y8?: Y8Config;
  }
}
