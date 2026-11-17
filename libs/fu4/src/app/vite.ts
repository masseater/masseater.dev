import type { Fu4Config } from "#/shared/config/index.ts";

declare module "vite" {
  interface UserConfig {
    readonly fu4?: Fu4Config;
  }
}
