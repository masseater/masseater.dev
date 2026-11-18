import type { I68Config } from "#/shared/config/index.ts";

declare module "vite" {
  interface UserConfig {
    readonly i68?: I68Config;
  }
}
