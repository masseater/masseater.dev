import type { MdlintConfig } from "#/shared/config/index.ts";

declare module "vite" {
  interface UserConfig {
    readonly mdlint?: MdlintConfig;
  }
}
